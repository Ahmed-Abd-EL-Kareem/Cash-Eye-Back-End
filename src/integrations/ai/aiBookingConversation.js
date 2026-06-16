// AI Booking Conversation Agent
import { randomUUID } from "crypto";
import { chatClient } from "./openai.client.js";
import { retrieveContext } from "./pinecone.rag.js";
import { buildBookingConversationPrompt, buildRagQuery } from "./prompt.engine.js";
import * as hotelService from "../../modules/hotels/hotel.service.js";
import BookingModel from "../../modules/bookings/booking.model.js";
import logger from "../../config/logger.js";
import ApiError from "../../utils/apiError.js";

const sessions = new Map();
const MAX_HISTORY = 10;

const BOOKING_STEPS = [
  "destination", "dates", "budget", "preferences",
  "hotel_selection", "guest_info", "payment", "complete",
];

const parseJsonResponse = (raw) => {
  if (!raw) throw new Error("Empty response");
  try { return JSON.parse(raw); } catch { }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { } }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { }
  }
  logger.warn(`[Booking] Wrapping non-JSON AI response`);
  return {
    aiResponse: raw.replace(/[*_`#]/g, "").trim(),
    step: "destination",
    options: [],
    contextUpdates: {},
    isComplete: false,
    bookingPreview: null,
  };
};

export const getBookingSession = (sessionId) => {
  if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId);
  const session = {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    step: "destination",
    context: {},
    history: [],
  };
  sessions.set(session.id, session);
  return session;
};

const toHotelCandidate = (hotel) => ({
  id: hotel._id?.toString(),
  name: hotel.name?.en || hotel.name,
  city: hotel.city,
  stars: hotel.stars,
  pricePerNight: hotel.averagePricePerNight,
  currency: hotel.currency || "EGP",
  amenities: hotel.amenities || [],
});

const fetchHotelCandidates = async (context) => {
  const query = { limit: 10, sort: "-stars" };
  if (context.destination) query.city = context.destination;
  if (context.maxPrice) query.maxPrice = context.maxPrice;
  const { hotels } = await hotelService.getAllHotels(query);
  return hotels.map(toHotelCandidate);
};

// ─── Save completed booking to MongoDB ───────────────────────────────────────
const saveBookingToDB = async (session, preview, userId) => {
  try {
    if (!userId) {
      logger.warn("[Booking] Cannot save to DB — no userId in context");
      return null;
    }

    // Resolve hotel ObjectId — try selectedHotelId from context first
    const hotelId = session.context.selectedHotelId;
    if (!hotelId) {
      logger.warn("[Booking] Cannot save to DB — no selectedHotelId in session context");
      return null;
    }

    // Validate hotel exists
    const hotel = await hotelService.getHotelById(hotelId);
    if (!hotel) {
      logger.warn(`[Booking] Hotel ${hotelId} not found — skipping DB save`);
      return null;
    }

    const checkIn = new Date(preview.checkIn || preview.hotel?.checkIn);
    const checkOut = new Date(preview.checkOut || preview.hotel?.checkOut);

    if (isNaN(checkIn) || isNaN(checkOut)) {
      logger.warn("[Booking] Invalid checkIn/checkOut dates — skipping DB save");
      return null;
    }

    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const rooms = preview.rooms || session.context.rooms || 1;
    const guests = preview.guests || session.context.guests || 1;
    const totalPrice = preview.totalCost || (hotel.averagePricePerNight * nights * rooms);

    const booking = await BookingModel.create({
      user: userId,
      hotel: hotel._id,
      checkIn,
      checkOut,
      guests,
      rooms,
      totalPrice,
      currency: hotel.currency || "EGP",
      status: "confirmed",
      paymentStatus: "pending",
      paymentMethod: session.context.paymentMethod || "credit_card",
      amountPaid: totalPrice,
      paidAt: new Date(),
      specialRequests: session.context.specialRequests || null,
    });

    logger.info(`[Booking] ✅ Saved to DB — bookingId: ${booking._id}`);
    return booking;

  } catch (err) {
    // Never crash the response if DB save fails
    logger.error(`[Booking] Failed to save to DB: ${err.message}`);
    return null;
  }
};

export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
  const session = getBookingSession(sessionId);
  const activeSessionId = session.id;

  session.history.push({ role: "user", content: message, timestamp: new Date() });
  session.context = { ...session.context, ...extraContext };

  // Step 1: RAG
  const ragQuery = buildRagQuery("booking", {
    message,
    destination: session.context.destination || "",
    step: session.step,
  });
  const ragContext = await retrieveContext(ragQuery, 4);
  if (ragContext) logger.info(`[Booking] RAG context retrieved (${ragContext.length} chars)`);

  // Step 2: Fetch hotels
  const needsHotels = ["preferences", "hotel_selection", "guest_info"].includes(session.step);
  const hotelCandidates = needsHotels ? await fetchHotelCandidates(session.context) : [];
  if (needsHotels) logger.info(`[Booking] ${hotelCandidates.length} hotel candidates fetched for step="${session.step}"`);

  // Step 3: Build prompt
  const systemPrompt = buildBookingConversationPrompt({
    step: session.step,
    context: session.context,
    ragContext,
    hotelCandidates,
  });

  // Step 4: Build messages
  const trimmedHistory = session.history.slice(-MAX_HISTORY);
  const llmMessages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory.map(({ role, content }) => ({ role, content })),
    { role: "assistant", content: '{"aiResponse":"' },
  ];

  // Step 5: Call model with retry
  let raw = null;
  let response = null;
  let attempts = 0;

  while (!raw && attempts < 2) {
    attempts++;
    response = await chatClient.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: llmMessages,
      temperature: attempts === 1 ? 0.3 : 0.1,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });
    raw = response.choices[0]?.message?.content?.trim() || null;
    if (!raw) logger.warn(`[Booking] Empty response on attempt ${attempts}, retrying...`);
  }

  if (!raw) throw new ApiError("AI failed to respond in booking conversation", 500);

  // Step 6: Parse JSON
  let parsed;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    logger.error(`[Booking] JSON parse failed: ${raw.slice(0, 300)}`);
    throw new ApiError("AI returned malformed booking response", 500);
  }

  // Step 7: Apply context updates
  if (parsed.contextUpdates) {
    session.context = { ...session.context, ...parsed.contextUpdates };
  }

  // Step 8: Advance step
  const nextStep = BOOKING_STEPS.includes(parsed.step) ? parsed.step : session.step;
  session.step = nextStep;
  session.updatedAt = new Date();

  // Step 9: Save to DB when booking is complete
  let savedBookingId = null;
  if (parsed.isComplete && parsed.bookingPreview) {
    const userId = session.context.userId;
    const savedBooking = await saveBookingToDB(session, parsed.bookingPreview, userId);
    if (savedBooking) {
      savedBookingId = savedBooking._id.toString();
      session.context.savedBookingId = savedBookingId;
    }
  }

  const aiResponse = parsed.aiResponse || "How can I help you with your hotel booking?";
  session.history.push({ role: "assistant", content: aiResponse, timestamp: new Date() });
  session.history = session.history.slice(-MAX_HISTORY);

  const tokensUsed = response?.usage?.total_tokens || 0;
  logger.info(`[Booking] Step "${nextStep}" — ${tokensUsed} tokens`);

  return {
    sessionId: activeSessionId,
    step: nextStep,
    aiResponse,
    options: parsed.options || [],
    isComplete: Boolean(parsed.isComplete),
    bookingPreview: parsed.bookingPreview || null,
    bookingId: savedBookingId, // ✅ returned to client when saved
    tokensUsed,
  };
};
// // AI Booking Conversation Agent
// // Uses NVIDIA model + Pinecone RAG for multi-turn hotel booking.
// // Delegates prompt building to prompt.engine.js — same pattern as chat.ai.js
// // This is the stable version based on the working production code.

// import { randomUUID } from "crypto";
// import { chatClient } from "./openai.client.js";
// import { retrieveContext } from "./pinecone.rag.js";
// import { buildBookingConversationPrompt, buildRagQuery } from "./prompt.engine.js";
// import * as hotelService from "../../modules/hotels/hotel.service.js";
// import logger from "../../config/logger.js";
// import ApiError from "../../utils/apiError.js";

// // ─── Session store (use Redis in production) ──────────────────────────────────
// const sessions = new Map();
// const MAX_HISTORY = 10;

// const BOOKING_STEPS = [
//   "destination",
//   "dates",
//   "budget",
//   "preferences",
//   "hotel_selection",
//   "guest_info",
//   "payment",
//   "complete",
// ];

// // ─── Safe JSON parser — handles model returning text inside backticks ─────────
// const parseJsonResponse = (raw) => {
//   if (!raw) throw new Error("Empty response");

//   // 1. Try direct parse
//   try { return JSON.parse(raw); } catch { }

//   // 2. Strip markdown fences
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) {
//     try { return JSON.parse(fenced[1]); } catch { }
//   }

//   // 3. Extract first complete {...} block
//   const start = raw.indexOf("{");
//   const end = raw.lastIndexOf("}");
//   if (start !== -1 && end !== -1 && end > start) {
//     try { return JSON.parse(raw.slice(start, end + 1)); } catch { }
//   }

//   // 4. Model returned plain text — wrap it gracefully so the app doesn't crash
//   logger.warn(`[Booking] Wrapping non-JSON AI response`);
//   return {
//     aiResponse: raw.replace(/[*_`#]/g, "").trim(),
//     step: "destination",
//     options: [],
//     contextUpdates: {},
//     isComplete: false,
//     bookingPreview: null,
//   };
// };

// // ─── Get or create session ────────────────────────────────────────────────────
// export const getBookingSession = (sessionId) => {
//   if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId);

//   const session = {
//     id: randomUUID(),
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     step: "destination",
//     context: {},
//     history: [],
//   };

//   sessions.set(session.id, session);
//   return session;
// };

// // ─── Convert hotel doc to candidate shape for the prompt ─────────────────────
// const toHotelCandidate = (hotel) => ({
//   id: hotel._id?.toString(),
//   name: hotel.name?.en || hotel.name,
//   city: hotel.city,
//   stars: hotel.stars,
//   pricePerNight: hotel.averagePricePerNight,
//   currency: hotel.currency || "EGP",
//   amenities: hotel.amenities || [],
// });

// // ─── Fetch hotel candidates from MongoDB ──────────────────────────────────────
// const fetchHotelCandidates = async (context) => {
//   const query = { limit: 10, sort: "-stars" };
//   if (context.destination) query.city = context.destination;
//   if (context.maxPrice) query.maxPrice = context.maxPrice;

//   const { hotels } = await hotelService.getAllHotels(query);
//   return hotels.map(toHotelCandidate);
// };

// // ─── Main exported function ───────────────────────────────────────────────────
// export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
//   const session = getBookingSession(sessionId);
//   const activeSessionId = session.id;

//   // Add user message to history
//   session.history.push({ role: "user", content: message, timestamp: new Date() });
//   session.context = { ...session.context, ...extraContext };

//   // Step 1: RAG — use prompt.engine buildRagQuery
//   const ragQuery = buildRagQuery("booking", {
//     message,
//     destination: session.context.destination || "",
//     step: session.step,
//   });
//   const ragContext = await retrieveContext(ragQuery, 4);

//   if (ragContext) {
//     logger.info(`[Booking] RAG context retrieved (${ragContext.length} chars)`);
//   }

//   // Step 2: Fetch real hotels for steps that need them
//   const needsHotels = ["preferences", "hotel_selection", "guest_info"].includes(session.step);
//   const hotelCandidates = needsHotels ? await fetchHotelCandidates(session.context) : [];

//   if (needsHotels) {
//     logger.info(`[Booking] ${hotelCandidates.length} hotel candidates fetched for step="${session.step}"`);
//   }

//   // Step 3: Build prompt via prompt.engine
//   const systemPrompt = buildBookingConversationPrompt({
//     step: session.step,
//     context: session.context,
//     ragContext,
//     hotelCandidates,
//   });

//   // Step 4: Build messages — system + trimmed history
//   // Step 4: Build messages
//   const trimmedHistory = session.history.slice(-MAX_HISTORY);
//   const llmMessages = [
//     { role: "system", content: systemPrompt },
//     ...trimmedHistory.map(({ role, content }) => ({ role, content })),
//     // ✅ Add this — forces the model to start its response as JSON
//     {
//       role: "assistant",
//       content: '{"aiResponse":"'
//     },
//   ];
//   // Step 5: Call NVIDIA model
//   // Step 5: Call NVIDIA model with retry
//   let raw = null;
//   let response = null; // ✅ hoisted outside the loop
//   let attempts = 0;

//   while (!raw && attempts < 2) {
//     attempts++;
//     response = await chatClient.chat.completions.create({
//       model: "meta/llama-3.3-70b-instruct", // ✅ more reliable than gpt-oss-120b
//       messages: llmMessages,
//       temperature: attempts === 1 ? 0.3 : 0.1, // lower temp = more consistent JSON
//       max_tokens: 1000,
//       response_format: { type: "json_object" },
//     });
//     raw = response.choices[0]?.message?.content?.trim() || null;

//     if (!raw) {
//       logger.warn(`[Booking] Empty response on attempt ${attempts}, retrying...`);
//     }
//   }

//   if (!raw) throw new ApiError("AI failed to respond in booking conversation", 500);
//   // const response = await chatClient.chat.completions.create({
//   //   model: "openai/gpt-oss-120b",
//   //   messages: llmMessages,
//   //   temperature: 0.6,
//   //   max_tokens: 1000,
//   //   response_format: { type: "json_object" },
//   // });

//   // const raw = response.choices[0]?.message?.content;
//   // if (!raw) throw new ApiError("AI failed to respond in booking conversation", 500);
//   // In your booking agent file — replace Step 5 call with this:

//   // Step 6: Parse JSON — with fallback regex for backtick-wrapped responses
//   let parsed;
//   try {
//     parsed = parseJsonResponse(raw);
//   } catch {
//     logger.error(`[Booking] JSON parse failed: ${raw.slice(0, 300)}`);
//     throw new ApiError("AI returned malformed booking response", 500);
//   }

//   // Step 7: Apply context updates
//   if (parsed.contextUpdates) {
//     session.context = { ...session.context, ...parsed.contextUpdates };
//   }

//   // Step 8: Advance step
//   const nextStep = BOOKING_STEPS.includes(parsed.step) ? parsed.step : session.step;
//   session.step = nextStep;
//   session.updatedAt = new Date();

//   // Add assistant reply to history
//   const aiResponse = parsed.aiResponse || "How can I help you with your hotel booking?";
//   session.history.push({ role: "assistant", content: aiResponse, timestamp: new Date() });
//   session.history = session.history.slice(-MAX_HISTORY);

//   const tokensUsed = response.usage?.total_tokens || 0;
//   logger.info(`[Booking] Step "${nextStep}" — ${tokensUsed} tokens`);

//   return {
//     sessionId: activeSessionId,
//     step: nextStep,
//     aiResponse,
//     options: parsed.options || [],
//     isComplete: Boolean(parsed.isComplete),
//     bookingPreview: parsed.bookingPreview || null,
//     tokensUsed,
//   };
// };