// // aiBookingConversation.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Standalone Agent — Multi-turn Hotel Booking Conversation
// //
// // LangGraph flow:
// //
// //   User message + sessionId
// //          │
// //          ▼
// //   [SESSION LOADER]    — loads or creates in-memory booking session
// //          │
// //          ▼
// //   [FIELD EXTRACTOR]   — pulls destination/dates/guests/payment/etc. out of
// //          │              the user's free text on EVERY turn, merges into
// //          │              session.context immediately (independent of tools)
// //          ▼
// //   [BOOKING AGENT]     — tool-calling loop
// //          │              uses: search_hotels, get_hotel_details, save_booking
// //          ▼
// //   [SESSION SAVER]     — persists updated session state + step detection
// //          │
// //          ▼
// //       reply + { sessionId, step, isComplete, bookingId }
// //
// // Why a separate FIELD EXTRACTOR node?
// //   The old design relied on the LLM "remembering" earlier turns and stuffing
// //   data into save_booking's tool-call arguments. In practice the LLM kept
// //   forgetting fields across turns (e.g. user gives dates in turn 3, but turn 7
// //   still reports "missing checkIn"). A dedicated extraction pass guarantees
// //   every fact the user states is captured into session.context immediately,
// //   regardless of what the main agent decides to do that turn.
// //
// // Exported API:
// //   processBookingMessage(sessionId, message, extraContext)
// //   getBookingSession(sessionId)
// // ─────────────────────────────────────────────────────────────────────────────

// import { StateGraph, Annotation, END } from "@langchain/langgraph";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
// import { randomUUID } from "crypto";

// import { bookingLLM, structuredLLM } from "./llm.client.js";
// import { retrieveContext } from "./rag.retriever.js";
// import {
//   ragTool,
//   searchHotelsTool,
//   getHotelDetailsTool,
//   saveBookingTool,
// } from "./agent.tools.js";
// import { BOOKING_SYSTEM, BOOKING_EXTRACTOR_SYSTEM } from "./agent.prompts.js";
// import logger from "../../config/logger.js";

// // ─── Required fields for a valid booking ─────────────────────────────────────
// const REQUIRED_BOOKING_FIELDS = [
//   "destination",
//   "checkIn",
//   "checkOut",
//   "guests",
//   "rooms",
//   "selectedHotelId",
//   "paymentMethod",
// ];

// const getMissingFields = (context) =>
//   REQUIRED_BOOKING_FIELDS.filter(
//     (f) => context[f] === undefined || context[f] === null || context[f] === ""
//   );

// // Reject obviously hallucinated dates (anything before this year)
// const CURRENT_YEAR = new Date().getFullYear();
// const isValidBookingDate = (dateStr) => {
//   if (!dateStr) return false;
//   const d = new Date(dateStr);
//   if (isNaN(d)) return false;
//   return d.getFullYear() >= CURRENT_YEAR;
// };

// const isValidObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

// // ─── In-memory session store (swap for Redis in production) ──────────────────
// const bookingSessions = new Map();

// // Keyword fallback — only used if nothing else can determine the step
// const STEP_KEYWORDS = {
//   dates: ["check-in", "check-out", "date", "arrival"],
//   budget: ["budget", "price", "egp", "afford"],
//   preferences: ["amenities", "pool", "spa", "gym", "preference"],
//   hotel_selection: ["hotel", "recommend", "option", "pick"],
//   guest_info: ["guest", "room", "people", "traveler"],
//   payment: ["payment", "pay", "credit", "card", "method"],
//   complete: ["confirmed", "booked", "booking id", "confirmation"],
// };

// // ─── Safe JSON parse for extractor output ────────────────────────────────────
// const safeJsonParse = (raw, fallback = {}) => {
//   if (!raw) return fallback;
//   try { return JSON.parse(raw); } catch { /* */ }
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
//   const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
//   if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
//   return fallback;
// };

// // ─── State ────────────────────────────────────────────────────────────────────
// const State = Annotation.Root({
//   // Input
//   userMessage: Annotation({ reducer: (_, b) => b, default: () => "" }),
//   userId: Annotation({ reducer: (_, b) => b, default: () => null }),
//   sessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
//   context: Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),

//   // Internal (set by session loader)
//   session: Annotation({ reducer: (_, b) => b, default: () => null }),

//   // Output
//   reply: Annotation({ reducer: (_, b) => b, default: () => null }),
//   tokensUsed: Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   bookingSessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
//   bookingStep: Annotation({ reducer: (_, b) => b, default: () => "destination" }),
//   isComplete: Annotation({ reducer: (_, b) => b, default: () => false }),
//   bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),

//   // Passed between nodes
//   _extractTokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   _rawReply: Annotation({ reducer: (_, b) => b, default: () => null }),
//   _tokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   _bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 1: SESSION LOADER
// // ─────────────────────────────────────────────────────────────────────────────
// async function sessionLoaderNode(state) {
//   let session;

//   if (state.sessionId && bookingSessions.has(state.sessionId)) {
//     session = bookingSessions.get(state.sessionId);
//     logger.info(`[Booking] Resumed session ${session.id} at step "${session.step}"`);
//   } else {
//     session = {
//       id: randomUUID(),
//       step: "destination",
//       context: {},
//       history: [],
//       createdAt: new Date(),
//     };
//     logger.info(`[Booking] New session ${session.id}`);
//   }

//   session.context = { ...session.context, ...state.context };
//   if (state.userId) session.context.userId = state.userId;

//   return { session };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 2: FIELD EXTRACTOR
// // Runs on EVERY turn. Pulls structured booking fields out of the user's
// // message + recent history and merges them straight into session.context.
// // This is what makes the agent "smart" across turns — it no longer relies
// // on the main agent remembering or re-deriving facts already given.
// // ─────────────────────────────────────────────────────────────────────────────
// async function fieldExtractorNode(state) {
//   const session = state.session;

//   const recentHistory = session.history
//     .slice(-6)
//     .map((m) => `${m.role}: ${m.content}`)
//     .join("\n");

//   const extractorPrompt = BOOKING_EXTRACTOR_SYSTEM
//     .replace("{currentContext}", JSON.stringify(session.context, null, 2))
//     .replace("{recentHistory}", recentHistory || "(none yet)")
//     .replace("{currentYear}", String(CURRENT_YEAR));

//   let tokensUsed = 0;
//   try {
//     const response = await structuredLLM.invoke([
//       new SystemMessage(extractorPrompt),
//       new HumanMessage(state.userMessage),
//     ]);

//     tokensUsed = response.usage_metadata?.total_tokens || 0;
//     const extracted = safeJsonParse(response.content, {});

//     // Merge only valid, non-empty fields into session context
//     const merge = {};
//     if (extracted.destination) merge.destination = extracted.destination;
//     if (extracted.guests) merge.guests = Number(extracted.guests);
//     if (extracted.rooms) merge.rooms = Number(extracted.rooms);
//     if (extracted.paymentMethod) merge.paymentMethod = extracted.paymentMethod;
//     if (extracted.specialRequests !== undefined && extracted.specialRequests !== null) {
//       merge.specialRequests = extracted.specialRequests;
//     }
//     if (extracted.maxBudget) merge.maxBudget = Number(extracted.maxBudget);
//     if (extracted.checkIn && isValidBookingDate(extracted.checkIn)) {
//       merge.checkIn = extracted.checkIn;
//     }
//     if (extracted.checkOut && isValidBookingDate(extracted.checkOut)) {
//       merge.checkOut = extracted.checkOut;
//     }
//     if (extracted.confirmedBooking === true) {
//       merge.userConfirmed = true;
//     }

//     if (Object.keys(merge).length > 0) {
//       logger.info(`[Booking Extractor] Captured: ${JSON.stringify(merge)}`);
//       session.context = { ...session.context, ...merge };
//     }
//   } catch (err) {
//     // Extraction is best-effort — never block the conversation if it fails
//     logger.warn(`[Booking Extractor] Failed: ${err.message}`);
//   }

//   return { session, _extractTokens: tokensUsed };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 3: BOOKING AGENT
// // Multi-turn tool-calling loop guided by BOOKING_SYSTEM prompt.
// // By the time we get here, session.context already has every fact the user
// // has stated (thanks to the extractor) — the agent's job is purely to decide
// // what to ask next or which tool to call.
// // ─────────────────────────────────────────────────────────────────────────────
// const bookingTools = [ragTool, searchHotelsTool, getHotelDetailsTool, saveBookingTool];
// const bookingToolNode = new ToolNode(bookingTools);
// const bookingLLMWithTools = bookingLLM.bindTools(bookingTools);

// async function bookingAgentNode(state) {
//   const session = state.session;
//   logger.info(`[Booking Agent] Step: "${session.step}" — "${state.userMessage.slice(0, 60)}"`);

//   // ── Guard: booking already confirmed in this session — never re-save ───────
//   if (session.context.savedBookingId) {
//     logger.info(`[Booking] Already confirmed: ${session.context.savedBookingId} — skipping agent loop`);
//     return {
//       _rawReply: `Your booking is already confirmed! 🎉 Booking ID: ${session.context.savedBookingId}. Is there anything else I can help you with?`,
//       _tokens: 0,
//       _bookingId: session.context.savedBookingId,
//       session,
//     };
//   }

//   const ragQuery = `${session.context.destination || ""} Egypt hotel booking ${session.step}`;
//   const ragContext = await retrieveContext(ragQuery, 4);
//   const ragBlock = ragContext ? `\n## Knowledge Base Context:\n${ragContext}\n` : "";

//   // ── Auto-resolve hotel selection from plain text ──────────────────────────
//   // If the user names a hotel that appeared in the last search_hotels results,
//   // capture its real id immediately — don't wait for the LLM to figure it out.
//   // Uses token-overlap matching so partial names (e.g. "Kempinski") still work,
//   // not just exact full-name substring matches.
//   if (!session.context.selectedHotelId && session.context.lastSearchResults?.length) {
//     const msgLower = state.userMessage.toLowerCase();
//     const msgTokens = new Set(msgLower.split(/\W+/).filter((w) => w.length > 2));

//     let bestMatch = null;
//     let bestScore = 0;

//     for (const h of session.context.lastSearchResults) {
//       const nameLower = (h.name || "").toLowerCase();
//       if (!nameLower) continue;

//       // Exact substring match — strongest signal
//       if (nameLower.length > 3 && msgLower.includes(nameLower)) {
//         bestMatch = h;
//         break;
//       }

//       // Token overlap — e.g. "Kempinski" matches "Kempinski Nile Hotel Cairo"
//       const nameTokens = nameLower.split(/\W+/).filter((w) => w.length > 2);
//       const overlap = nameTokens.filter((t) => msgTokens.has(t)).length;
//       if (overlap > 0 && overlap > bestScore) {
//         bestScore = overlap;
//         bestMatch = h;
//       }
//     }

//     if (bestMatch) {
//       session.context.selectedHotelId = bestMatch.id;
//       logger.info(`[Booking] Auto-matched hotel "${bestMatch.name}" → ${bestMatch.id}`);
//     }
//   }

//   const missingNow = getMissingFields(session.context);
//   const checkInOk = isValidBookingDate(session.context.checkIn);
//   const checkOutOk = isValidBookingDate(session.context.checkOut);
//   const stillMissing = [
//     ...missingNow.filter((f) => f !== "checkIn" && f !== "checkOut"),
//     !checkInOk ? "checkIn" : null,
//     !checkOutOk ? "checkOut" : null,
//   ].filter(Boolean);

//   const sessionContextBlock = JSON.stringify(
//     {
//       step: session.step,
//       context: session.context,
//       missingFields: stillMissing,
//       readyToBook: stillMissing.length === 0,
//     },
//     null,
//     2
//   );

//   const systemContent = BOOKING_SYSTEM
//     .replace("{sessionContext}", sessionContextBlock)
//     .replace("{ragContext}", ragBlock)
//     .replace("{currentYear}", String(CURRENT_YEAR));

//   const history = session.history.slice(-10).map((m) =>
//     m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
//   );

//   // IMPORTANT: every message in this array MUST be a real BaseMessage
//   // instance (HumanMessage/AIMessage/SystemMessage/ToolMessage) — ToolNode
//   // throws "ToolNode only accepts BaseMessage[]" if a plain object slips in.
//   let messages = [
//     new SystemMessage(systemContent),
//     ...history,
//     new HumanMessage(state.userMessage),
//   ];

//   session.history.push({ role: "user", content: state.userMessage, timestamp: new Date() });

//   let finalReply = null;
//   let tokensUsed = 0;
//   let bookingId = null;

//   for (let i = 0; i < 8; i++) {
//     const response = await bookingLLMWithTools.invoke(messages);
//     messages.push(response);
//     tokensUsed += response.usage_metadata?.total_tokens || 0;

//     // No tool calls → this is the final human-readable reply
//     if (!response.tool_calls?.length) {
//       const raw = (response.content || "").trim();
//       if (raw.startsWith("{") || raw.startsWith("[")) {
//         // Force a rephrase — use a real HumanMessage, not a plain object
//         messages.push(
//           new HumanMessage(
//             "Please summarise that in a friendly, human-readable message. Do not output raw JSON."
//           )
//         );
//         continue;
//       }
//       finalReply = raw;
//       break;
//     }

//     const calledTools = response.tool_calls.map((tc) => tc.name);
//     const hasSave = calledTools.includes("save_booking");
//     const hasDetails = calledTools.includes("get_hotel_details");
//     const hasSearch = calledTools.includes("search_hotels");

//     // ── Guard: block save_booking if required fields are still missing ───────
//     if (hasSave && stillMissing.length > 0) {
//       logger.warn(`[Booking] save_booking blocked — missing: ${stillMissing.join(", ")}`);
//       messages.push(
//         new HumanMessage(
//           `SYSTEM: Cannot save booking yet. Still need from the user: ${stillMissing.join(", ")}. ` +
//           `Ask the user for these missing details — do not call save_booking again until you have them.`
//         )
//       );
//       continue;
//     }

//     // ── Sync any args the LLM included on its own (belt-and-suspenders) ──────
//     if (hasSave) {
//       const saveArgs = response.tool_calls.find((tc) => tc.name === "save_booking")?.args || {};
//       if (saveArgs.checkIn && isValidBookingDate(saveArgs.checkIn)) session.context.checkIn = saveArgs.checkIn;
//       if (saveArgs.checkOut && isValidBookingDate(saveArgs.checkOut)) session.context.checkOut = saveArgs.checkOut;
//       if (saveArgs.guests) session.context.guests = saveArgs.guests;
//       if (saveArgs.rooms) session.context.rooms = saveArgs.rooms;
//       if (saveArgs.paymentMethod) session.context.paymentMethod = saveArgs.paymentMethod;
//       if (saveArgs.specialRequests !== undefined) session.context.specialRequests = saveArgs.specialRequests;
//       if (saveArgs.hotelId && isValidObjectId(saveArgs.hotelId)) session.context.selectedHotelId = saveArgs.hotelId;

//       // If the LLM is calling save_booking but omitted a field we already
//       // have in session.context, auto-inject it so the tool call succeeds
//       // without yet another round-trip.
//       const tc = response.tool_calls.find((t) => t.name === "save_booking");
//       if (tc) {
//         tc.args.userId = tc.args.userId || session.context.userId;
//         tc.args.hotelId = tc.args.hotelId || session.context.selectedHotelId;
//         tc.args.checkIn = tc.args.checkIn || session.context.checkIn;
//         tc.args.checkOut = tc.args.checkOut || session.context.checkOut;
//         tc.args.guests = tc.args.guests || session.context.guests;
//         tc.args.rooms = tc.args.rooms || session.context.rooms;
//         tc.args.paymentMethod = tc.args.paymentMethod || session.context.paymentMethod;
//         if (tc.args.specialRequests === undefined) {
//           tc.args.specialRequests = session.context.specialRequests || undefined;
//         }
//       }
//     }

//     const toolResult = await bookingToolNode.invoke({ messages });
//     messages.push(...toolResult.messages);

//     if (hasSearch && !hasSave) session.context._nextStep = "hotel_selection";
//     if (hasDetails) session.context._nextStep = "payment";

//     // ── Cache search results so the LLM (and our own matcher) can map a
//     //    hotel NAME the user types in plain text back to its real id,
//     //    without needing another search_hotels round-trip.
//     if (hasSearch) {
//       for (const tm of toolResult.messages) {
//         try {
//           const parsed = JSON.parse(tm.content || "{}");
//           if (Array.isArray(parsed.hotels) && parsed.hotels.length > 0) {
//             session.context.lastSearchResults = parsed.hotels.map((h) => ({
//               id: h.id,
//               name: h.name,
//             }));
//           }
//         } catch { /* */ }
//       }
//     }

//     if (hasDetails) {
//       for (const tm of toolResult.messages) {
//         try {
//           const parsed = JSON.parse(tm.content || "{}");
//           if (parsed.id) session.context.selectedHotelId = parsed.id;
//         } catch { /* */ }
//       }
//     }

//     if (hasSave) {
//       for (const tm of toolResult.messages) {
//         try {
//           const parsed = JSON.parse(tm.content || "{}");
//           if (parsed.success && parsed.bookingId) {
//             bookingId = parsed.bookingId;
//             session.context.savedBookingId = bookingId;
//           }
//         } catch { /* */ }
//       }
//     }
//   }

//   if (!finalReply) {
//     messages.push(
//       new HumanMessage("Please give a friendly summary of where we are and what the next step is.")
//     );
//     const recovery = await bookingLLMWithTools.invoke(messages);
//     tokensUsed += recovery.usage_metadata?.total_tokens || 0;
//     finalReply = recovery.content || "How can I help with your hotel booking?";
//   }

//   return { _rawReply: finalReply, _tokens: tokensUsed, _bookingId: bookingId, session };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 4: SESSION SAVER
// // ─────────────────────────────────────────────────────────────────────────────
// async function sessionSaverNode(state) {
//   const session = state.session;
//   const finalReply = state._rawReply;
//   const bookingId = state._bookingId;

//   if (bookingId) {
//     session.step = "complete";
//   } else if (session.context._nextStep) {
//     session.step = session.context._nextStep;
//     delete session.context._nextStep;
//   } else {
//     const replyLower = finalReply.toLowerCase();
//     for (const [step, keywords] of Object.entries(STEP_KEYWORDS)) {
//       if (keywords.some((kw) => replyLower.includes(kw))) {
//         session.step = step;
//         break;
//       }
//     }
//   }

//   session.history.push({ role: "assistant", content: finalReply, timestamp: new Date() });
//   session.history = session.history.slice(-20);
//   session.updatedAt = new Date();
//   bookingSessions.set(session.id, session);

//   const totalTokens = (state._extractTokens || 0) + (state._tokens || 0);
//   logger.info(`[Booking] Session ${session.id} saved at step "${session.step}" — ${totalTokens} tokens`);

//   return {
//     reply: finalReply,
//     tokensUsed: totalTokens,
//     bookingSessionId: session.id,
//     bookingStep: session.step,
//     isComplete: session.step === "complete",
//     bookingId: bookingId,
//   };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BUILD GRAPH
// // ─────────────────────────────────────────────────────────────────────────────
// const graph = new StateGraph(State)
//   .addNode("session_loader", sessionLoaderNode)
//   .addNode("field_extractor", fieldExtractorNode)
//   .addNode("booking_agent", bookingAgentNode)
//   .addNode("session_saver", sessionSaverNode)

//   .addEdge("__start__", "session_loader")
//   .addEdge("session_loader", "field_extractor")
//   .addEdge("field_extractor", "booking_agent")
//   .addEdge("booking_agent", "session_saver")
//   .addEdge("session_saver", END);

// const bookingAgent = graph.compile();

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLIC API
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Process one turn of a booking conversation.
//  *
//  * @param {string|null} sessionId    — null for first turn, reuse for follow-ups
//  * @param {string}      message      — the user's message
//  * @param {object}      extraContext — { userId, tripId, … }
//  * @returns {{ sessionId, step, aiResponse, isComplete, bookingId, tokensUsed }}
//  */
// export const processBookingMessage = async (sessionId, message, extraContext = {}) => {
//   const result = await bookingAgent.invoke({
//     userMessage: message,
//     userId: extraContext.userId || null,
//     sessionId: sessionId || null,
//     context: extraContext,
//   });

//   return {
//     sessionId: result.bookingSessionId,
//     step: result.bookingStep,
//     aiResponse: result.reply,
//     isComplete: result.isComplete,
//     bookingId: result.bookingId,
//     tokensUsed: result.tokensUsed,
//   };
// };

// /**
//  * Read a session object (for debug / admin endpoints)
//  * @param {string} sessionId
//  */
// export const getBookingSession = (sessionId) =>
//   bookingSessions.get(sessionId) || null;
// aiBookingConversation.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Agent — Multi-turn Hotel Booking Conversation
//
// LangGraph flow:
//
//   User message + sessionId
//          │
//          ▼
//   [SESSION LOADER]    — loads or creates in-memory booking session
//          │
//          ▼
//   [FIELD EXTRACTOR]   — pulls destination/dates/guests/payment/etc. out of
//          │              the user's free text on EVERY turn, merges into
//          │              session.context immediately (independent of tools)
//          ▼
//   [BOOKING AGENT]     — tool-calling loop
//          │              uses: search_hotels, get_hotel_details, save_booking
//          ▼
//   [SESSION SAVER]     — persists updated session state + step detection
//          │
//          ▼
//       reply + { sessionId, step, isComplete, bookingId }
//
// Why a separate FIELD EXTRACTOR node?
//   The old design relied on the LLM "remembering" earlier turns and stuffing
//   data into save_booking's tool-call arguments. In practice the LLM kept
//   forgetting fields across turns (e.g. user gives dates in turn 3, but turn 7
//   still reports "missing checkIn"). A dedicated extraction pass guarantees
//   every fact the user states is captured into session.context immediately,
//   regardless of what the main agent decides to do that turn.
//
// Exported API:
//   processBookingMessage(sessionId, message, extraContext)
//   getBookingSession(sessionId)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Language instruction (same detection logic as chat.ai.js) ───────────────
// Detected fresh on EVERY turn from state.userMessage — not cached on the
// session — so a user can switch languages mid-conversation and the very
// next reply matches the language of their latest message, not an earlier one.
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

// ─── Required fields for a valid booking ─────────────────────────────────────
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

// Reject obviously hallucinated dates (anything before this year)
const CURRENT_YEAR = new Date().getFullYear();
const isValidBookingDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return d.getFullYear() >= CURRENT_YEAR;
};

const isValidObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

// ─── In-memory session store (swap for Redis in production) ──────────────────
const bookingSessions = new Map();

// Keyword fallback — only used if nothing else can determine the step
const STEP_KEYWORDS = {
  dates: ["check-in", "check-out", "date", "arrival"],
  budget: ["budget", "price", "egp", "afford"],
  preferences: ["amenities", "pool", "spa", "gym", "preference"],
  hotel_selection: ["hotel", "recommend", "option", "pick"],
  guest_info: ["guest", "room", "people", "traveler"],
  payment: ["payment", "pay", "credit", "card", "method"],
  complete: ["confirmed", "booked", "booking id", "confirmation"],
};

// ─── Safe JSON parse for extractor output ────────────────────────────────────
const safeJsonParse = (raw, fallback = {}) => {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { /* */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
  return fallback;
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

  // Passed between nodes
  _extractTokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  _rawReply: Annotation({ reducer: (_, b) => b, default: () => null }),
  _tokens: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  _bookingId: Annotation({ reducer: (_, b) => b, default: () => null }),
});

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: SESSION LOADER
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

  session.context = { ...session.context, ...state.context };
  if (state.userId) session.context.userId = state.userId;

  return { session };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 2: FIELD EXTRACTOR
// Runs on EVERY turn. Pulls structured booking fields out of the user's
// message + recent history and merges them straight into session.context.
// This is what makes the agent "smart" across turns — it no longer relies
// on the main agent remembering or re-deriving facts already given.
// ─────────────────────────────────────────────────────────────────────────────
async function fieldExtractorNode(state) {
  const session = state.session;

  const recentHistory = session.history
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const extractorPrompt = BOOKING_EXTRACTOR_SYSTEM
    .replace("{currentContext}", JSON.stringify(session.context, null, 2))
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

    // Merge only valid, non-empty fields into session context
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
      session.context = { ...session.context, ...merge };
    }
  } catch (err) {
    // Extraction is best-effort — never block the conversation if it fails
    logger.warn(`[Booking Extractor] Failed: ${err.message}`);
  }

  return { session, _extractTokens: tokensUsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: BOOKING AGENT
// Multi-turn tool-calling loop guided by BOOKING_SYSTEM prompt.
// By the time we get here, session.context already has every fact the user
// has stated (thanks to the extractor) — the agent's job is purely to decide
// what to ask next or which tool to call.
// ─────────────────────────────────────────────────────────────────────────────
const bookingTools = [ragTool, searchHotelsTool, getHotelDetailsTool, saveBookingTool];
const bookingToolNode = new ToolNode(bookingTools);
const bookingLLMWithTools = bookingLLM.bindTools(bookingTools);

async function bookingAgentNode(state) {
  const session = state.session;
  logger.info(`[Booking Agent] Step: "${session.step}" — "${state.userMessage.slice(0, 60)}"`);

  // ── Guard: booking already confirmed in this session — never re-save ───────
  if (session.context.savedBookingId) {
    logger.info(`[Booking] Already confirmed: ${session.context.savedBookingId} — skipping agent loop`);
    return {
      _rawReply: `Your booking is already confirmed! 🎉 Booking ID: ${session.context.savedBookingId}. Is there anything else I can help you with?`,
      _tokens: 0,
      _bookingId: session.context.savedBookingId,
      session,
    };
  }

  const ragQuery = `${session.context.destination || ""} Egypt hotel booking ${session.step}`;
  const ragContext = await retrieveContext(ragQuery, 4);
  const ragBlock = ragContext ? `\n## Knowledge Base Context:\n${ragContext}\n` : "";

  // ── Auto-resolve hotel selection from plain text ──────────────────────────
  // If the user names a hotel that appeared in the last search_hotels results,
  // capture its real id immediately — don't wait for the LLM to figure it out.
  // Uses token-overlap matching so partial names (e.g. "Kempinski") still work,
  // not just exact full-name substring matches.
  if (!session.context.selectedHotelId && session.context.lastSearchResults?.length) {
    const msgLower = state.userMessage.toLowerCase();
    const msgTokens = new Set(msgLower.split(/\W+/).filter((w) => w.length > 2));

    let bestMatch = null;
    let bestScore = 0;

    for (const h of session.context.lastSearchResults) {
      const nameLower = (h.name || "").toLowerCase();
      if (!nameLower) continue;

      // Exact substring match — strongest signal
      if (nameLower.length > 3 && msgLower.includes(nameLower)) {
        bestMatch = h;
        break;
      }

      // Token overlap — e.g. "Kempinski" matches "Kempinski Nile Hotel Cairo"
      const nameTokens = nameLower.split(/\W+/).filter((w) => w.length > 2);
      const overlap = nameTokens.filter((t) => msgTokens.has(t)).length;
      if (overlap > 0 && overlap > bestScore) {
        bestScore = overlap;
        bestMatch = h;
      }
    }

    if (bestMatch) {
      session.context.selectedHotelId = bestMatch.id;
      logger.info(`[Booking] Auto-matched hotel "${bestMatch.name}" → ${bestMatch.id}`);
    }
  }

  const missingNow = getMissingFields(session.context);
  const checkInOk = isValidBookingDate(session.context.checkIn);
  const checkOutOk = isValidBookingDate(session.context.checkOut);
  const stillMissing = [
    ...missingNow.filter((f) => f !== "checkIn" && f !== "checkOut"),
    !checkInOk ? "checkIn" : null,
    !checkOutOk ? "checkOut" : null,
  ].filter(Boolean);

  const sessionContextBlock = JSON.stringify(
    {
      step: session.step,
      context: session.context,
      missingFields: stillMissing,
      readyToBook: stillMissing.length === 0,
    },
    null,
    2
  );

  const systemContent = BOOKING_SYSTEM
    .replace("{sessionContext}", sessionContextBlock)
    .replace("{ragContext}", ragBlock)
    .replace("{currentYear}", String(CURRENT_YEAR))
    .replace("{languageInstruction}", buildLanguageInstruction(state.userMessage));

  const history = session.history.slice(-10).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  // IMPORTANT: every message in this array MUST be a real BaseMessage
  // instance (HumanMessage/AIMessage/SystemMessage/ToolMessage) — ToolNode
  // throws "ToolNode only accepts BaseMessage[]" if a plain object slips in.
  let messages = [
    new SystemMessage(systemContent),
    ...history,
    new HumanMessage(state.userMessage),
  ];

  session.history.push({ role: "user", content: state.userMessage, timestamp: new Date() });

  let finalReply = null;
  let tokensUsed = 0;
  let bookingId = null;

  for (let i = 0; i < 8; i++) {
    const response = await bookingLLMWithTools.invoke(messages);
    messages.push(response);
    tokensUsed += response.usage_metadata?.total_tokens || 0;

    // No tool calls → this is the final human-readable reply
    if (!response.tool_calls?.length) {
      const raw = (response.content || "").trim();
      if (raw.startsWith("{") || raw.startsWith("[")) {
        // Force a rephrase — use a real HumanMessage, not a plain object
        messages.push(
          new HumanMessage(
            `${buildLanguageInstruction(state.userMessage)} Please summarise that in a ` +
            "friendly, human-readable message. Do not output raw JSON."
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

    // ── Guard: block save_booking if required fields are still missing ───────
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

    // ── Sync any args the LLM included on its own (belt-and-suspenders) ──────
    if (hasSave) {
      const saveArgs = response.tool_calls.find((tc) => tc.name === "save_booking")?.args || {};
      if (saveArgs.checkIn && isValidBookingDate(saveArgs.checkIn)) session.context.checkIn = saveArgs.checkIn;
      if (saveArgs.checkOut && isValidBookingDate(saveArgs.checkOut)) session.context.checkOut = saveArgs.checkOut;
      if (saveArgs.guests) session.context.guests = saveArgs.guests;
      if (saveArgs.rooms) session.context.rooms = saveArgs.rooms;
      if (saveArgs.paymentMethod) session.context.paymentMethod = saveArgs.paymentMethod;
      if (saveArgs.specialRequests !== undefined) session.context.specialRequests = saveArgs.specialRequests;
      if (saveArgs.hotelId && isValidObjectId(saveArgs.hotelId)) session.context.selectedHotelId = saveArgs.hotelId;

      // If the LLM is calling save_booking but omitted a field we already
      // have in session.context, auto-inject it so the tool call succeeds
      // without yet another round-trip.
      const tc = response.tool_calls.find((t) => t.name === "save_booking");
      if (tc) {
        tc.args.userId = tc.args.userId || session.context.userId;
        tc.args.hotelId = tc.args.hotelId || session.context.selectedHotelId;
        tc.args.checkIn = tc.args.checkIn || session.context.checkIn;
        tc.args.checkOut = tc.args.checkOut || session.context.checkOut;
        tc.args.guests = tc.args.guests || session.context.guests;
        tc.args.rooms = tc.args.rooms || session.context.rooms;
        tc.args.paymentMethod = tc.args.paymentMethod || session.context.paymentMethod;
        if (tc.args.specialRequests === undefined) {
          tc.args.specialRequests = session.context.specialRequests || undefined;
        }
      }
    }

    const toolResult = await bookingToolNode.invoke({ messages });
    messages.push(...toolResult.messages);

    if (hasSearch && !hasSave) session.context._nextStep = "hotel_selection";
    if (hasDetails) session.context._nextStep = "payment";

    // ── Cache search results so the LLM (and our own matcher) can map a
    //    hotel NAME the user types in plain text back to its real id,
    //    without needing another search_hotels round-trip.
    if (hasSearch) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (Array.isArray(parsed.hotels) && parsed.hotels.length > 0) {
            session.context.lastSearchResults = parsed.hotels.map((h) => ({
              id: h.id,
              name: h.name,
            }));
          }
        } catch { /* */ }
      }
    }

    if (hasDetails) {
      for (const tm of toolResult.messages) {
        try {
          const parsed = JSON.parse(tm.content || "{}");
          if (parsed.id) session.context.selectedHotelId = parsed.id;
        } catch { /* */ }
      }
    }

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

  return { _rawReply: finalReply, _tokens: tokensUsed, _bookingId: bookingId, session };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 4: SESSION SAVER
// ─────────────────────────────────────────────────────────────────────────────
async function sessionSaverNode(state) {
  const session = state.session;
  const finalReply = state._rawReply;
  const bookingId = state._bookingId;

  if (bookingId) {
    session.step = "complete";
  } else if (session.context._nextStep) {
    session.step = session.context._nextStep;
    delete session.context._nextStep;
  } else {
    const replyLower = finalReply.toLowerCase();
    for (const [step, keywords] of Object.entries(STEP_KEYWORDS)) {
      if (keywords.some((kw) => replyLower.includes(kw))) {
        session.step = step;
        break;
      }
    }
  }

  session.history.push({ role: "assistant", content: finalReply, timestamp: new Date() });
  session.history = session.history.slice(-20);
  session.updatedAt = new Date();
  bookingSessions.set(session.id, session);

  const totalTokens = (state._extractTokens || 0) + (state._tokens || 0);
  logger.info(`[Booking] Session ${session.id} saved at step "${session.step}" — ${totalTokens} tokens`);

  return {
    reply: finalReply,
    tokensUsed: totalTokens,
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
  .addNode("field_extractor", fieldExtractorNode)
  .addNode("booking_agent", bookingAgentNode)
  .addNode("session_saver", sessionSaverNode)

  .addEdge("__start__", "session_loader")
  .addEdge("session_loader", "field_extractor")
  .addEdge("field_extractor", "booking_agent")
  .addEdge("booking_agent", "session_saver")
  .addEdge("session_saver", END);

const bookingAgent = graph.compile();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process one turn of a booking conversation.
 *
 * @param {string|null} sessionId    — null for first turn, reuse for follow-ups
 * @param {string}      message      — the user's message
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