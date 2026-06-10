// Booking Conversation AI
// Flow: session state → RAG retrieve → fetch hotel candidates → LLM drives multi-step booking

import { randomUUID } from "crypto";
import { chatClient } from "./openai.client.js";
// import openai from "./openai.client.js";
import { retrieveContext } from "./pinecone.rag.js";
import { buildBookingConversationPrompt, buildRagQuery } from "./prompt.engine.js";
import * as hotelService from "../../modules/hotels/hotel.service.js";
import logger from "../../config/logger.js";
import ApiError from "../../utils/apiError.js";

const sessions = new Map();
const MAX_HISTORY = 10;

const BOOKING_STEPS = [
  "destination",
  "dates",
  "budget",
  "preferences",
  "hotel_selection",
  "guest_info",
  "payment",
  "complete",
];

const parseJsonResponse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    const match =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Failed to parse AI response");
  }
};

export const getBookingSession = (sessionId) => {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }

  const newSession = {
    id: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    step: "destination",
    context: {},
    history: [],
  };

  sessions.set(newSession.id, newSession);
  return newSession;
};

const trimHistory = (history) => history.slice(-MAX_HISTORY);

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

export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
  const session = getBookingSession(sessionId);
  const activeSessionId = session.id;

  session.history.push({ role: "user", content: message, timestamp: new Date() });
  session.context = { ...session.context, ...extraContext };

  const ragQuery = buildRagQuery("booking", {
    message,
    destination: session.context.destination || "",
    step: session.step,
  });
  const ragContext = await retrieveContext(ragQuery, 4);

  if (ragContext) {
    logger.info(`[Booking] RAG context retrieved (${ragContext.length} chars)`);
  }

  const needsHotels = ["preferences", "hotel_selection", "guest_info"].includes(session.step);
  const hotelCandidates = needsHotels ? await fetchHotelCandidates(session.context) : [];

  const systemPrompt = buildBookingConversationPrompt({
    step: session.step,
    context: session.context,
    ragContext,
    hotelCandidates,
  });

  const llmMessages = [
    { role: "system", content: systemPrompt },
    ...trimHistory(session.history).map(({ role, content }) => ({ role, content })),
  ];

  const response = await chatClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    // model: "nvidia/nemotron-3-super-120b-a12b",   // fast + cheap for conversational turns

    // model: "gpt-4o-mini",
    messages: llmMessages,
    temperature: 0.6,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new ApiError("AI failed to respond in booking conversation", 500);

  let parsed;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    logger.error(`[Booking] JSON parse failed: ${raw.slice(0, 300)}`);
    throw new ApiError("AI returned malformed booking response", 500);
  }

  if (parsed.contextUpdates) {
    session.context = { ...session.context, ...parsed.contextUpdates };
  }

  const nextStep = BOOKING_STEPS.includes(parsed.step) ? parsed.step : session.step;
  session.step = nextStep;
  session.updatedAt = new Date();

  const aiResponse = parsed.aiResponse || "How can I help you with your hotel booking?";
  session.history.push({ role: "assistant", content: aiResponse, timestamp: new Date() });
  session.history = trimHistory(session.history);

  const tokensUsed = response.usage?.total_tokens || 0;
  logger.info(`[Booking] Step "${nextStep}" — ${tokensUsed} tokens`);

  return {
    sessionId: activeSessionId,
    step: nextStep,
    aiResponse,
    options: parsed.options || [],
    isComplete: Boolean(parsed.isComplete),
    bookingPreview: parsed.bookingPreview || null,
    tokensUsed,
  };
};
