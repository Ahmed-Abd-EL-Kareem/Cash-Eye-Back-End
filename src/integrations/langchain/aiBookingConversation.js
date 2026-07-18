import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import { bookingLLM, structuredLLM } from "./llm.client.js";
import { retrieveContext } from "./rag.retriever.js";
import {
  ragTool,
  searchHotelsTool,
  getHotelDetailsTool,
  saveBookingTool,
} from "./agent.tools.js";
import { BOOKING_SYSTEM, BOOKING_EXTRACTOR_SYSTEM } from "./agent.prompts.js";
import { detectLanguage } from "./chat.ai.js";
import logger from "../../config/logger.js";
import { BookingConversation } from "../../modules/ai/bookingConversation.model.js";

// ─── Language instruction ───────────────────────────────────────────────
const LANGUAGE_INSTRUCTION = {
  ar:
    "The user's LATEST message is in Arabic. You MUST reply ENTIRELY in " +
    "Modern Standard Arabic (العربية) — every sentence, every field prompt, " +
    "every booking summary line. Do not switch to English at any point, " +
    "even if earlier turns in this conversation were in English.",
  en:
    "The user's LATEST message is in English. You MUST reply ENTIRELY in " +
    "English — every sentence, every field prompt, every booking summary " +
    "line. Do not switch to Arabic at any point, even if earlier turns in " +
    "this conversation were in Arabic.",
};

const buildLanguageInstruction = (text) => LANGUAGE_INSTRUCTION[detectLanguage(text)];

// ─── Required fields for a valid booking ────────────────────────────────
const REQUIRED_BOOKING_FIELDS = [
  "destination",
  "checkIn",
  "checkOut",
  "guests",
  "rooms",
  "selectedHotelId",
  "paymentMethod",
];

const getMissingFields = (context) =>
  REQUIRED_BOOKING_FIELDS.filter(
    (f) => context[f] === undefined || context[f] === null || context[f] === ""
  );

const CURRENT_YEAR = new Date().getFullYear();
const isValidBookingDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return d.getFullYear() >= CURRENT_YEAR;
};

const isValidObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

// ─── Keyword fallback ───────────────────────────────────────────────────
const STEP_KEYWORDS = {
  dates: ["check-in", "check-out", "date", "arrival"],
  budget: ["budget", "price", "egp", "afford"],
  preferences: ["amenities", "pool", "spa", "gym", "preference"],
  hotel_selection: ["hotel", "recommend", "option", "pick"],
  guest_info: ["guest", "room", "people", "traveler"],
  payment: ["payment", "pay", "credit", "card", "method"],
  complete: ["confirmed", "booked", "booking id", "confirmation"],
};

// ─── Safe JSON parse ────────────────────────────────────────────────────
const safeJsonParse = (raw, fallback = {}) => {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { /* */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
  return fallback;
};

// ─── State ──────────────────────────────────────────────────────────────
const State = Annotation.Root({
  userMessage: Annotation({ reducer: (_, b) => b, default: () => "" }),
  userId: Annotation({ reducer: (_, b) => b, default: () => null }),
  sessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  context: Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),
  session: Annotation({ reducer: (_, b) => b, default: () => null }),
  reply: Annotation({ reducer: (_, b) => b, default: () => null }),
  tokensUsed: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  bookingSessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  bookingStep: Annotation({ reducer: (_, b) => b, default: () => "destination" }),
  isComplete: Annotation({ reducer: (_, b) => b, default: () => false }),
  bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),
  _extractTokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  _rawReply: Annotation({ reducer: (_, b) => b, default: () => null }),
  _tokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  _bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),
});

// ─── Helper: load or create session from DB ────────────────────────────
async function loadOrCreateSession(sessionId, userId, extraContext = {}) {
  let session;
  if (sessionId) {
    session = await BookingConversation.findOne({ sessionId, user: userId });
    if (session) {
      logger.info(`[Booking] Resumed session ${session.sessionId} at step "${session.step}"`);
      return session;
    }
  }
  const newSessionId = randomUUID();
  session = new BookingConversation({
    sessionId: newSessionId,
    user: userId,
    messages: [],
    slots: {},
    step: "destination",
    isComplete: false,
    bookingId: null,
  });
  if (extraContext.tripId) session.slots.tripId = extraContext.tripId;
  if (extraContext.currentStep) session.step = extraContext.currentStep;
  session.markModified("slots");   // ← add this
  await session.save();
  logger.info(`[Booking] New session ${newSessionId}`);
  return session;
}

// ─── Helper: save session to DB ────────────────────────────────────────
async function saveSessionToDb(session, finalReply, bookingId, step, tokensUsed) {
  if (bookingId) {
    session.step = "complete";
    session.isComplete = true;
    session.bookingId = bookingId;
  } else if (session.slots._nextStep) {
    session.step = session.slots._nextStep;
    delete session.slots._nextStep;
  } else {
    // Only advance the step forward — never jump backward or skip past hotel_selection
    // without a real hotel search having occurred first.
    const STEP_ORDER = ["destination", "dates", "budget", "preferences", "hotel_selection", "guest_info", "payment", "complete"];
    const currentIdx = STEP_ORDER.indexOf(session.step);
    const replyLower = finalReply.toLowerCase();

    for (const [s, keywords] of Object.entries(STEP_KEYWORDS)) {
      if (s === "complete") continue; // never infer completion from prose
      const candidateIdx = STEP_ORDER.indexOf(s);
      // Only advance — never go backward, never jump more than 2 steps at a time
      if (candidateIdx <= currentIdx || candidateIdx > currentIdx + 2) continue;
      // Never jump to hotel_selection just because 'hotel' appears in text,
      // unless a search was actually performed this session
      if (s === "hotel_selection" && !session.slots.lastSearchResults?.length) continue;
      if (keywords.some((kw) => replyLower.includes(kw))) {
        session.step = s;
        break;
      }
    }
  }
  session.messages.push({
    role: "assistant",
    content: finalReply,
    step: session.step,
    tokensUsed: tokensUsed,
  });
  session.messages = session.messages.slice(-20);
  session.updatedAt = new Date();
  session.markModified("slots");   // ← add this
  if (!bookingId && /booking (is )?confirmed|booking reference/i.test(finalReply)) {
    logger.error(`[Booking] CRITICAL: fabricated confirmation reached session save — session ${session.sessionId}`);
    finalReply = "I'm processing your booking now — let me confirm the details are fully submitted before I give you a final confirmation.";
  }
  await session.save();
  logger.info(`[Booking] Session ${session.sessionId} saved at step "${session.step}" — ${tokensUsed} tokens`);
  return session;
}

// ─── NODE 1: SESSION LOADER ────────────────────────────────────────────
async function sessionLoaderNode(state) {
  const userId = state.userId;
  const sessionId = state.sessionId;
  const extraContext = state.context || {};

  const session = await loadOrCreateSession(sessionId, userId, extraContext);

  if (extraContext.tripId) session.slots.tripId = extraContext.tripId;
  if (extraContext.currentStep) session.step = extraContext.currentStep;

  return { session };
}

// ─── NODE 2: FIELD EXTRACTOR ──────────────────────────────────────────
async function fieldExtractorNode(state) {
  const session = state.session;

  const recentHistory = session.messages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const extractorPrompt = BOOKING_EXTRACTOR_SYSTEM
    .replace("{currentContext}", JSON.stringify(session.slots, null, 2))
    .replace("{recentHistory}", recentHistory || "(none yet)")
    .replace("{currentYear}", String(CURRENT_YEAR));

  let tokensUsed = 0;
  try {
    const response = await structuredLLM.invoke([
      new SystemMessage(extractorPrompt),
      new HumanMessage(state.userMessage),
    ]);

    tokensUsed = response.usage_metadata?.total_tokens || 0;
    const extracted = safeJsonParse(response.content, {});

    const merge = {};
    if (extracted.destination) merge.destination = extracted.destination;
    if (extracted.guests) merge.guests = Number(extracted.guests);
    if (extracted.rooms) merge.rooms = Number(extracted.rooms);
    if (extracted.paymentMethod) merge.paymentMethod = extracted.paymentMethod;
    if (extracted.specialRequests !== undefined && extracted.specialRequests !== null) {
      merge.specialRequests = extracted.specialRequests;
    }
    if (extracted.maxBudget) merge.maxBudget = Number(extracted.maxBudget);
    if (extracted.checkIn && isValidBookingDate(extracted.checkIn)) {
      merge.checkIn = extracted.checkIn;
    }
    if (extracted.checkOut && isValidBookingDate(extracted.checkOut)) {
      merge.checkOut = extracted.checkOut;
    }
    if (extracted.confirmedBooking === true) {
      merge.userConfirmed = true;
    }

    if (Object.keys(merge).length > 0) {
      logger.info(`[Booking Extractor] Captured: ${JSON.stringify(merge)}`);
      session.slots = { ...session.slots, ...merge };
    }
  } catch (err) {
    logger.warn(`[Booking Extractor] Failed: ${err.message}`);
  }

  return { session, _extractTokens: tokensUsed };
}

// ─── Helper: match hotel from text ─────────────────────────────────────
const matchHotelFromText = (lastSearchResults, text) => {
  const msgLower = (text || "").toLowerCase();
  const msgTokens = new Set(msgLower.split(/\W+/).filter((w) => w.length > 2));

  for (const h of lastSearchResults || []) {
    const nameLower = (h.name || "").toLowerCase();
    if (!nameLower) continue;
    if (nameLower.length > 3 && msgLower.includes(nameLower)) {
      return h;
    }
    const nameTokens = nameLower.split(/\W+/).filter((w) => w.length > 2);
    const overlap = nameTokens.filter((t) => msgTokens.has(t)).length;
    if (overlap > 0) return h;
  }
  return null;
};
// ─── NEW: affirmative-confirmation regex + hotel-selection resolver ────
const AFFIRMATIVE_RE = /\b(yes|yeah|yep|sure|ok(ay)?|confirm|proceed|book(\s?it|\s?now)?|go\s?ahead|sounds\s?good)\b/i;

function resolveHotelSelection(session, userMessage) {
  if (session.slots.selectedHotelId || !session.slots.lastSearchResults?.length) return;
  let bestMatch = matchHotelFromText(session.slots.lastSearchResults, userMessage);
  if (!bestMatch && session.slots.lastSearchResults.length === 1 && AFFIRMATIVE_RE.test(userMessage)) {
    bestMatch = session.slots.lastSearchResults[0];
  }
  if (bestMatch) {
    session.slots.selectedHotelId = bestMatch.id;
    logger.info(`[Booking] Auto-matched hotel "${bestMatch.name}" → ${bestMatch.id}`);
  }
}

// ─── NODE 3: BOOKING AGENT ────────────────────────────────────────────
const bookingTools = [ragTool, searchHotelsTool, getHotelDetailsTool, saveBookingTool];
const bookingToolNode = new ToolNode(bookingTools);
const bookingLLMWithTools = bookingLLM.bindTools(bookingTools);

async function bookingAgentNode(state) {
  const session = state.session;
  logger.info(`[Booking Agent] Step: "${session.step}" — "${state.userMessage.slice(0, 60)}"`);

  if (session.slots.savedBookingId) {
    logger.info(`[Booking] Already confirmed: ${session.slots.savedBookingId} — skipping agent loop`);
    return {
      _rawReply: `Your booking is already confirmed! 🎉 Booking ID: ${session.slots.savedBookingId}. Is there anything else I can help you with?`,
      _tokens: 0,
      _bookingId: session.slots.savedBookingId,
      session,
    };
  }
  const RAG_STEPS = new Set(["destination", "preferences", "dates"]);
  const ragBlock = RAG_STEPS.has(session.step)
    ? (async () => {
      const ragContext = await retrieveContext(
        `${session.slots.destination || ""} Egypt hotel booking ${session.step}`,
        4
      );
      return ragContext ? `\n## Knowledge Base Context:\n${ragContext}\n` : "";
    })()
    : Promise.resolve("");
  const resolvedRagBlock = await ragBlock;
  const AFFIRMATIVE_RE = /\b(yes|yeah|yep|sure|ok(ay)?|confirm|proceed|book(\s?it|\s?now)?|go\s?ahead|sounds\s?good)\b/i;

  if (!session.slots.selectedHotelId && session.slots.lastSearchResults?.length) {
    let bestMatch = matchHotelFromText(session.slots.lastSearchResults, state.userMessage);

    // Bare confirmation + exactly one hotel already shown = that hotel is selected
    if (!bestMatch && session.slots.lastSearchResults.length === 1 && AFFIRMATIVE_RE.test(state.userMessage)) {
      bestMatch = session.slots.lastSearchResults[0];
    }

    if (bestMatch) {
      session.slots.selectedHotelId = bestMatch.id;
      logger.info(`[Booking] Auto-matched hotel "${bestMatch.name}" → ${bestMatch.id}`);
    }
  }
  // resolveHotelSelection(session, state.userMessage);
  const missingNow = getMissingFields(session.slots);
  const checkInOk = isValidBookingDate(session.slots.checkIn);
  const checkOutOk = isValidBookingDate(session.slots.checkOut);
  let stillMissing = [
    ...missingNow.filter((f) => f !== "checkIn" && f !== "checkOut"),
    !checkInOk ? "checkIn" : null,
    !checkOutOk ? "checkOut" : null,
  ].filter(Boolean);

  const sessionContextBlock = JSON.stringify(
    {
      step: session.step,
      context: session.slots,
      missingFields: stillMissing,
      readyToBook: stillMissing.length === 0,
    },
    null,
    2
  );

  const systemContent = BOOKING_SYSTEM
    .replace("{sessionContext}", sessionContextBlock)
    .replace("{ragContext}", resolvedRagBlock)
    .replace("{currentYear}", String(CURRENT_YEAR))
    .replace("{languageInstruction}", buildLanguageInstruction(state.userMessage));

  const history = session.messages.slice(-6).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  let messages = [
    new SystemMessage(systemContent),
    ...history,
    new HumanMessage(state.userMessage),
  ];

  const CARD_NUMBER_RE = /\b(?:\d[ -]*?){13,19}\b/g;
  const sanitizedUserMessage = state.userMessage.replace(CARD_NUMBER_RE, "[redacted]");
  session.messages.push({ role: "user", content: sanitizedUserMessage, timestamp: new Date() });
  let finalReply = null;
  let tokensUsed = 0;
  let bookingId = null;

  for (let i = 0; i < 4; i++) {
    const response = await bookingLLMWithTools.invoke(messages);
    messages.push(response);
    tokensUsed += response.usage_metadata?.total_tokens || 0;

    if (!response.tool_calls?.length) {
      const raw = (response.content || "").trim();
      const looksLikeReasoning = raw.length > 150 && /\b(I need to|Let me|I should|I'll use|the user (has|wants|provided))\b/i.test(raw);
      const fabricatedConfirmation = !bookingId && /\b(booking (is )?confirmed|booking reference|confirmation email (has been|was) sent)\b/i.test(raw);
      const readyAndConfirmedButStalling =
        !bookingId &&
        stillMissing.length === 0 &&
        session.slots.userConfirmed === true;

      if (raw.startsWith("{") || raw.startsWith("[") || looksLikeReasoning || fabricatedConfirmation || readyAndConfirmedButStalling) {
        if (fabricatedConfirmation) {
          logger.warn(`[Booking] Blocked fabricated confirmation — no real bookingId this turn`);
        }
        if (readyAndConfirmedButStalling) {
          logger.warn(`[Booking] Model stalled instead of calling save_booking — forcing it`);
        }
        // Build a detailed nudge that includes ALL current slot values so the
        // LLM can construct save_booking correctly without guessing
        const slotSummary = JSON.stringify({
          hotelId: session.slots.selectedHotelId,
          checkIn: session.slots.checkIn,
          checkOut: session.slots.checkOut,
          guests: session.slots.guests,
          rooms: session.slots.rooms,
          paymentMethod: session.slots.paymentMethod,
        });
        messages.push(
          new HumanMessage(
            fabricatedConfirmation
              ? "SYSTEM: You have NOT actually saved this booking. Do not output any confirmation text. Call save_booking NOW with the slot values already in session context."
              : readyAndConfirmedButStalling
                ? `SYSTEM: readyToBook is true and the user already confirmed. Call save_booking NOW with these exact values — do NOT ask any questions or re-summarise: ${slotSummary}`
                : `${buildLanguageInstruction(state.userMessage)} Either call the appropriate tool now, or give a short, final, user-facing reply.`
          )
        );
        continue;
      }
      finalReply = raw;
      break;
    }

    const calledTools = response.tool_calls.map((tc) => tc.name);
    const hasSave = calledTools.includes("save_booking");
    const hasDetails = calledTools.includes("get_hotel_details");
    const hasSearch = calledTools.includes("search_hotels");

    if (hasSave && stillMissing.length > 0) {
      logger.warn(`[Booking] save_booking blocked — missing: ${stillMissing.join(", ")}`);
      messages.push(
        new HumanMessage(
          `SYSTEM: Cannot save booking yet. Still need from the user: ${stillMissing.join(", ")}. ` +
          `Ask the user for these missing details — do not call save_booking again until you have them.`
        )
      );
      continue;
    }

    if (hasSave) {
      const saveArgs = response.tool_calls.find((tc) => tc.name === "save_booking")?.args || {};
      if (saveArgs.checkIn && isValidBookingDate(saveArgs.checkIn)) session.slots.checkIn = saveArgs.checkIn;
      if (saveArgs.checkOut && isValidBookingDate(saveArgs.checkOut)) session.slots.checkOut = saveArgs.checkOut;
      if (saveArgs.guests) session.slots.guests = saveArgs.guests;
      if (saveArgs.rooms) session.slots.rooms = saveArgs.rooms;
      if (saveArgs.paymentMethod) session.slots.paymentMethod = saveArgs.paymentMethod;
      if (saveArgs.specialRequests !== undefined) session.slots.specialRequests = saveArgs.specialRequests;
      if (saveArgs.hotelId && isValidObjectId(saveArgs.hotelId)) session.slots.selectedHotelId = saveArgs.hotelId;
    
      // Recompute AFTER merging — this is the actual fix
      const recheckMissing = getMissingFields(session.slots);
      const recheckCheckInOk = isValidBookingDate(session.slots.checkIn);
      const recheckCheckOutOk = isValidBookingDate(session.slots.checkOut);
      stillMissing = [
        ...recheckMissing.filter((f) => f !== "checkIn" && f !== "checkOut"),
        !recheckCheckInOk ? "checkIn" : null,
        !recheckCheckOutOk ? "checkOut" : null,
      ].filter(Boolean);

      if (stillMissing.length > 0) {
        logger.warn(`[Booking] save_booking blocked — missing: ${stillMissing.join(", ")}`);
        messages.push(
          new HumanMessage(
            `SYSTEM: Cannot save booking yet. Still need from the user: ${stillMissing.join(", ")}. ` +
            `Ask the user for these missing details — do not call save_booking again until you have them.`
          )
        );
        continue;
      }

      const tc = response.tool_calls.find((t) => t.name === "save_booking");
      if (tc) {
        tc.args.userId = session.user.toString();   // always the authenticated user, never LLM-supplied
        tc.args.hotelId = tc.args.hotelId || session.slots.selectedHotelId;
        tc.args.checkIn = tc.args.checkIn || session.slots.checkIn;
        tc.args.checkOut = tc.args.checkOut || session.slots.checkOut;
        tc.args.guests = tc.args.guests || session.slots.guests;
        tc.args.rooms = tc.args.rooms || session.slots.rooms;
        tc.args.paymentMethod = tc.args.paymentMethod || session.slots.paymentMethod;
        if (tc.args.specialRequests === undefined) {
          tc.args.specialRequests = session.slots.specialRequests || undefined;
        }
      }
    }

    const toolResult = await bookingToolNode.invoke({ messages });
    messages.push(...toolResult.messages);

    if (hasSearch && !hasSave) session.slots._nextStep = "hotel_selection";
    if (hasDetails) session.slots._nextStep = "payment";

    if (hasSearch) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (Array.isArray(parsed.hotels) && parsed.hotels.length > 0) {
            session.slots.lastSearchResults = parsed.hotels.map((h) => ({
              id: h.id,
              name: h.name,
            }));
          }
        } catch { /* */ }
      }

      if (!session.slots.selectedHotelId && session.slots.lastSearchResults?.length) {
        const postSearchMatch = matchHotelFromText(session.slots.lastSearchResults, state.userMessage);
        if (postSearchMatch) {
          session.slots.selectedHotelId = postSearchMatch.id;
          logger.info(
            `[Booking] Auto-matched hotel (post-search) "${postSearchMatch.name}" → ${postSearchMatch.id}`
          );
        }
      }
    }
    resolveHotelSelection(session, state.userMessage);
    if (hasDetails) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (parsed.id) session.slots.selectedHotelId = parsed.id;
        } catch { /* */ }
      }
    }

    if (hasSave) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (parsed.success && parsed.bookingId) {
            bookingId = parsed.bookingId;
            session.slots.savedBookingId = bookingId;
          }
        } catch { /* */ }
      }
      if (bookingId) {
        // booking succeeded this turn — ask the model for a short confirmation reply and stop
        messages.push(new HumanMessage(`${buildLanguageInstruction(state.userMessage)} The booking was just saved successfully. Give a short, friendly confirmation with the booking ID and total price. Do not call any more tools.`));
        const confirmResp = await bookingLLMWithTools.invoke(messages);
        tokensUsed += confirmResp.usage_metadata?.total_tokens || 0;
        finalReply = confirmResp.content || `Your booking is confirmed! Booking ID: ${bookingId}`;
        break;   // ← stop looping the moment we have a real bookingId
      }
    }
  }

  if (!finalReply) {
    // Last resort: if all fields are present and user confirmed but model never
    // called save_booking through 4 iterations, call the tool programmatically.
    if (stillMissing.length === 0 && session.slots.userConfirmed && session.slots.selectedHotelId) {
      logger.warn(`[Booking] Programmatic save_booking fallback — model exhausted loop without calling tool`);
      try {
        const toolResult = await saveBookingTool.invoke({
          userId: session.user.toString(),
          hotelId: session.slots.selectedHotelId,
          checkIn: session.slots.checkIn,
          checkOut: session.slots.checkOut,
          guests: session.slots.guests || 1,
          rooms: session.slots.rooms || 1,
          paymentMethod: session.slots.paymentMethod || "credit_card",
          specialRequests: session.slots.specialRequests,
        });
        const parsed = JSON.parse(toolResult);
        if (parsed.success && parsed.bookingId) {
          bookingId = parsed.bookingId;
          session.slots.savedBookingId = bookingId;
          finalReply = `Your booking is confirmed! 🎉 Booking ID: **${bookingId}** | Total: ${parsed.currency} ${parsed.totalPrice?.toLocaleString()} for ${parsed.nights} night(s). A confirmation will be sent to your registered email.`;
        } else {
          finalReply = `I'm sorry, I couldn't complete the booking: ${parsed.error || "unknown error"}. Please try again or contact support.`;
        }
      } catch (err) {
        logger.error(`[Booking] Programmatic save fallback failed: ${err.message}`);
        finalReply = "I'm sorry, something went wrong saving your booking. Please try again.";
      }
    } else {
      messages.push(
        new HumanMessage(
          `${buildLanguageInstruction(state.userMessage)} Please give a friendly summary of ` +
          "where we are and what the next step is."
        )
      );
      const recovery = await bookingLLMWithTools.invoke(messages);
      tokensUsed += recovery.usage_metadata?.total_tokens || 0;
      finalReply = recovery.content || "How can I help with your hotel booking?";
    }
  }

  return { _rawReply: finalReply, _tokens: tokensUsed, _bookingId: bookingId, session };
}

// ─── NODE 4: SESSION SAVER ────────────────────────────────────────────
async function sessionSaverNode(state) {
  const session = state.session;
  const finalReply = state._rawReply;
  const bookingId = state._bookingId;

  const totalTokens = (state._extractTokens || 0) + (state._tokens || 0);

  await saveSessionToDb(session, finalReply, bookingId, session.step, totalTokens);

  return {
    reply: finalReply,
    tokensUsed: totalTokens,
    bookingSessionId: session.sessionId,
    bookingStep: session.step,
    isComplete: !!bookingId,   // ← now tied to an actual saved booking, not reply text
    bookingId: bookingId,
  };
}

// ─── BUILD GRAPH ───────────────────────────────────────────────────────
const graph = new StateGraph(State)
  .addNode("session_loader", sessionLoaderNode)
  .addNode("field_extractor", fieldExtractorNode)
  .addNode("booking_agent", bookingAgentNode)
  .addNode("session_saver", sessionSaverNode)

  .addEdge("__start__", "session_loader")
  .addEdge("session_loader", "field_extractor")
  .addEdge("field_extractor", "booking_agent")
  .addEdge("booking_agent", "session_saver")
  .addEdge("session_saver", END);

const bookingAgent = graph.compile();

// ─── PUBLIC API ────────────────────────────────────────────────────────

/**
 * Process one turn of a booking conversation.
 *
 * @param {string|null} sessionId    — null for first turn, reuse for follow-ups
 * @param {string}      message      — the user's message
 * @param {object}      extraContext — { userId, tripId, … }
 * @returns {{ sessionId, step, aiResponse, isComplete, bookingId, tokensUsed, messages }}
 */
export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
  const userId = extraContext.userId;
  if (!userId) {
    throw new Error("userId is required in extraContext");
  }

  const result = await bookingAgent.invoke({
    userMessage: message,
    userId,
    sessionId: sessionId || null,
    context: extraContext,
  });

  // Also return the full message history for the frontend
  const session = await BookingConversation.findOne({ sessionId: result.bookingSessionId, user: userId });
  const messages = session ? session.messages : [];

  return {
    sessionId: result.bookingSessionId,
    step: result.bookingStep,
    aiResponse: result.reply,
    isComplete: result.isComplete,
    bookingId: result.bookingId,
    tokensUsed: result.tokensUsed,
    messages,
  };
};

/**
 * Get full conversation history for a session.
 * @param {string} sessionId
 * @param {string} userId
 */
export const getBookingConversation = async (sessionId, userId) => {
  const session = await BookingConversation.findOne({ sessionId, user: userId });
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    step: session.step,
    isComplete: session.isComplete,
    bookingId: session.bookingId,
    slots: session.slots,
    messages: session.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
};

/**
 * Delete a booking conversation session.
 * @param {string} sessionId
 * @param {string} userId
 */
export const deleteBookingConversation = async (sessionId, userId) => {
  const result = await BookingConversation.deleteOne({ sessionId, user: userId });
  return result.deletedCount > 0;
};

/**
 * List all booking conversations for a user.
 * @param {string} userId
 * @param {number} limit
 */
export const listBookingConversations = async (userId, limit = 20) => {
  const sessions = await BookingConversation.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("sessionId step isComplete bookingId slots destination updatedAt createdAt");

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    step: s.step,
    isComplete: s.isComplete,
    bookingId: s.bookingId,
    destination: s.slots.destination,
    checkIn: s.slots.checkIn,
    checkOut: s.slots.checkOut,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
};