// aiBookingConversation.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Agent — Multi-turn Hotel Booking Conversation
//
// LangGraph flow:
//
//   User message + sessionId
//          │
//          ▼
//   [SESSION LOADER]  — loads or creates in-memory booking session
//          │
//          ▼
//   [BOOKING AGENT]   — tool-calling loop
//          │           uses: search_hotels, get_hotel_details, save_booking
//          ▼
//   [SESSION SAVER]   — persists updated session state + step detection
//          │
//          ▼
//       reply + { sessionId, step, isComplete, bookingId }
//
// Exported API:
//   processBookingMessage(sessionId, message, extraContext)
//   getBookingSession(sessionId)
// ─────────────────────────────────────────────────────────────────────────────

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

import { bookingLLM } from "./llm.client.js";
import { retrieveContext } from "./rag.retriever.js";
import {
  ragTool,
  searchHotelsTool,
  getHotelDetailsTool,
  saveBookingTool,
} from "./agent.tools.js";
import { BOOKING_SYSTEM } from "./agent.prompts.js";
import logger from "../../config/logger.js";

// ─── In-memory session store (swap for Redis in production) ──────────────────
const bookingSessions = new Map();

// Keywords that indicate which booking step we're on
const STEP_KEYWORDS = {
  dates: ["check-in", "check-out", "date", "arrival"],
  budget: ["budget", "price", "egp", "afford"],
  preferences: ["amenities", "pool", "spa", "gym", "preference"],
  hotel_selection: ["hotel", "recommend", "option", "pick"],
  guest_info: ["guest", "room", "people", "traveler"],
  payment: ["payment", "pay", "credit", "card", "method"],
  complete: ["confirmed", "booked", "booking id", "confirmation"],
};

// ─── State ────────────────────────────────────────────────────────────────────
const State = Annotation.Root({
  // Input
  userMessage: Annotation({ reducer: (_, b) => b, default: () => "" }),
  userId: Annotation({ reducer: (_, b) => b, default: () => null }),
  sessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  context: Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),

  // Internal (set by session loader)
  session: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Output
  reply: Annotation({ reducer: (_, b) => b, default: () => null }),
  tokensUsed: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  bookingSessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  bookingStep: Annotation({ reducer: (_, b) => b, default: () => "destination" }),
  isComplete: Annotation({ reducer: (_, b) => b, default: () => false }),
  bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Passed from booking node → saver node
  _rawReply: Annotation({ reducer: (_, b) => b, default: () => null }),
  _tokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  _bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),
});

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: SESSION LOADER
// Loads an existing session or creates a fresh one
// ─────────────────────────────────────────────────────────────────────────────
async function sessionLoaderNode(state) {
  let session;

  if (state.sessionId && bookingSessions.has(state.sessionId)) {
    session = bookingSessions.get(state.sessionId);
    logger.info(`[Booking] Resumed session ${session.id} at step "${session.step}"`);
  } else {
    session = {
      id: randomUUID(),
      step: "destination",
      context: {},
      history: [],
      createdAt: new Date(),
    };
    logger.info(`[Booking] New session ${session.id}`);
  }

  // Merge any extra context passed by the controller
  session.context = { ...session.context, ...state.context };
  if (state.userId) session.context.userId = state.userId;

  return { session };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 2: BOOKING AGENT
// Multi-turn tool-calling loop guided by BOOKING_SYSTEM prompt
// ─────────────────────────────────────────────────────────────────────────────
const bookingTools = [ragTool, searchHotelsTool, getHotelDetailsTool, saveBookingTool];
const bookingToolNode = new ToolNode(bookingTools);
const bookingLLMWithTools = bookingLLM.bindTools(bookingTools);

async function bookingAgentNode(state) {
  logger.info(`[Booking Agent] Step: "${state.session.step}" — "${state.userMessage}"`);

  const session = state.session;

  // RAG for current step context
  const ragQuery = `${session.context.destination || ""} Egypt hotel booking ${session.step}`;
  const ragContext = await retrieveContext(ragQuery, 4);
  const ragBlock = ragContext ? `\n## Knowledge Base Context:\n${ragContext}\n` : "";

  const sessionContextBlock = JSON.stringify(
    { step: session.step, context: session.context },
    null,
    2
  );

  const systemContent = BOOKING_SYSTEM
    .replace("{sessionContext}", sessionContextBlock)
    .replace("{ragContext}", ragBlock);

  // Build conversation history (last 10 turns)
  const history = session.history.slice(-10).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  let messages = [
    new SystemMessage(systemContent),
    ...history,
    new HumanMessage(state.userMessage),
  ];

  // Add user message to session history now
  session.history.push({ role: "user", content: state.userMessage, timestamp: new Date() });

  let finalReply = null;
  let tokensUsed = 0;
  let bookingId = null;

  // Agentic loop — max 8 iterations
  for (let i = 0; i < 8; i++) {
    const response = await bookingLLMWithTools.invoke(messages);
    messages.push(response);
    tokensUsed += response.usage_metadata?.total_tokens || 0;

    // No tool calls → this IS the final human-readable reply
    if (!response.tool_calls?.length) {
      // Guard: if the content looks like raw JSON, force one more iteration
      const raw = (response.content || "").trim();
      const looksLikeJson = raw.startsWith("{") || raw.startsWith("[");
      if (looksLikeJson) {
        // Inject a correction message and loop again
        messages.push({
          role: "user",
          content: "Please summarise those results in a friendly, human-readable message. Do not output raw JSON.",
        });
        continue;
      }
      finalReply = raw;
      break;
    }

    // Execute tools
    const calledTools = response.tool_calls.map((tc) => tc.name);
    const hasSave = calledTools.includes("save_booking");
    const hasDetails = calledTools.includes("get_hotel_details");
    const hasSearch = calledTools.includes("search_hotels");

    const toolResult = await bookingToolNode.invoke({ messages });
    messages.push(...toolResult.messages);

    // Advance step explicitly based on which tools ran
    if (hasSearch && !hasSave) session.context._nextStep = "hotel_selection";
    if (hasDetails) session.context._nextStep = "payment";

    // Extract hotel ID from get_hotel_details result → store in session
    if (hasDetails) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (parsed.id) session.context.selectedHotelId = parsed.id;
        } catch { /* */ }
      }
    }

    // Extract bookingId from save_booking result
    if (hasSave) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (parsed.success && parsed.bookingId) {
            bookingId = parsed.bookingId;
            session.context.savedBookingId = bookingId;
          }
        } catch { /* */ }
      }
    }
  }

  if (!finalReply) {
    // Loop exhausted — ask LLM to summarise in plain language
    messages.push({
      role: "user",
      content: "Please give me a friendly summary of what just happened and what the next step is.",
    });
    const recovery = await bookingLLMWithTools.invoke(messages);
    tokensUsed += recovery.usage_metadata?.total_tokens || 0;
    finalReply = recovery.content || "How can I help with your hotel booking?";
  }

  return { _rawReply: finalReply, _tokens: tokensUsed, _bookingId: bookingId, session };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: SESSION SAVER
// Detects step advancement, persists session, emits final output state
// ─────────────────────────────────────────────────────────────────────────────
async function sessionSaverNode(state) {
  const session = state.session;
  const finalReply = state._rawReply;
  const bookingId = state._bookingId;

  // Step is advanced explicitly by the agent node via session.context._nextStep,
  // or inferred from what tools were called (stored in session.context._lastTool).
  // Keyword scan is a last-resort fallback only.
  if (bookingId) {
    session.step = "complete";
  } else if (session.context._nextStep) {
    session.step = session.context._nextStep;
    delete session.context._nextStep;
  } else {
    // Fallback: keyword scan on the reply
    const replyLower = finalReply.toLowerCase();
    for (const [step, keywords] of Object.entries(STEP_KEYWORDS)) {
      if (keywords.some((kw) => replyLower.includes(kw))) {
        session.step = step;
        break;
      }
    }
  }

  // Save assistant reply to history and trim
  session.history.push({ role: "assistant", content: finalReply, timestamp: new Date() });
  session.history = session.history.slice(-20);
  session.updatedAt = new Date();
  bookingSessions.set(session.id, session);

  logger.info(`[Booking] Session ${session.id} saved at step "${session.step}" — ${state._tokens} tokens`);

  return {
    reply: finalReply,
    tokensUsed: state._tokens,
    bookingSessionId: session.id,
    bookingStep: session.step,
    isComplete: session.step === "complete",
    bookingId: bookingId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD GRAPH
// ─────────────────────────────────────────────────────────────────────────────
const graph = new StateGraph(State)
  .addNode("session_loader", sessionLoaderNode)
  .addNode("booking_agent", bookingAgentNode)
  .addNode("session_saver", sessionSaverNode)

  .addEdge("__start__", "session_loader")
  .addEdge("session_loader", "booking_agent")
  .addEdge("booking_agent", "session_saver")
  .addEdge("session_saver", END);

const bookingAgent = graph.compile();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process one turn of a booking conversation (replaces old processBookingMessage)
 *
 * @param {string|null} sessionId   — null for first turn, reuse for follow-ups
 * @param {string}      message     — the user's message
 * @param {object}      extraContext — { userId, tripId, … }
 * @returns {{ sessionId, step, aiResponse, isComplete, bookingId, tokensUsed }}
 */
export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
  const result = await bookingAgent.invoke({
    userMessage: message,
    userId: extraContext.userId || null,
    sessionId: sessionId || null,
    context: extraContext,
  });

  return {
    sessionId: result.bookingSessionId,
    step: result.bookingStep,
    aiResponse: result.reply,
    isComplete: result.isComplete,
    bookingId: result.bookingId,
    tokensUsed: result.tokensUsed,
  };
};

/**
 * Read a session object (for debug / admin endpoints)
 * @param {string} sessionId
 */
export const getBookingSession = (sessionId) =>
  bookingSessions.get(sessionId) || null;