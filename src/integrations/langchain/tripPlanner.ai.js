// // tripPlanner.ai.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Standalone Agent — AI Trip Planner
// //
// // LangGraph flow:
// //
// //   { destination, duration, budget, travelers, interests, language }
// //               │
// //               ▼
// //         [RAG NODE]       — retrieves destination + hotel knowledge
// //               │
// //               ▼
// //       [PLANNER NODE]     — LLM generates structured JSON itinerary
// //               │
// //               ▼
// //       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
// //               │
// //               ▼
// //           itinerary JSON
// //
// // Exported API:
// //   generateTripPlan(params)
// // ─────────────────────────────────────────────────────────────────────────────

// import { StateGraph, Annotation, END } from "@langchain/langgraph";
// import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// import { tripLLM } from "./llm.client.js";
// import { retrieveContext } from "./rag.retriever.js";
// import { TRIP_PLANNER_SYSTEM } from "./agent.prompts.js";
// import logger from "../../config/logger.js";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const safeJsonParse = (raw) => {
//   if (!raw) return null;
//   try { return JSON.parse(raw); } catch { /* */ }
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
//   const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
//   if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
//   return null;
// };

// const isValidPlan = (plan) =>
//   plan &&
//   typeof plan.title === "string" &&
//   typeof plan.summary === "string" &&
//   Array.isArray(plan.days) &&
//   plan.days.length > 0 &&
//   plan.days.every(
//     (d) =>
//       typeof d.day === "number" &&
//       Array.isArray(d.activities) &&
//       d.activities.length > 0
//   );

// const budgetLabel = (budget) => ({
//   budget:  "budget traveler (EGP 500–900/day)",
//   luxury:  "luxury traveler (EGP 3000+/day)",
// }[budget] || "mid-range traveler (EGP 900–2500/day)");

// // ─── State ────────────────────────────────────────────────────────────────────
// const State = Annotation.Root({
//   // Input
//   destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
//   duration:    Annotation({ reducer: (_, b) => b, default: () => 3 }),
//   budget:      Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
//   travelers:   Annotation({ reducer: (_, b) => b, default: () => 1 }),
//   interests:   Annotation({ reducer: (_, b) => b, default: () => [] }),
//   language:    Annotation({ reducer: (_, b) => b, default: () => "en" }),

//   // Internal pipeline
//   ragContext:  Annotation({ reducer: (_, b) => b, default: () => null }),
//   rawOutput:   Annotation({ reducer: (_, b) => b, default: () => null }),
//   retryCount:  Annotation({ reducer: (_, b) => b, default: () => 0 }),

//   // Output
//   plan:        Annotation({ reducer: (_, b) => b, default: () => null }),
//   tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   error:       Annotation({ reducer: (_, b) => b, default: () => null }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 1: RAG RETRIEVAL
// // Fetches destination + hotel knowledge from Pinecone
// // ─────────────────────────────────────────────────────────────────────────────
// async function ragNode(state) {
//   logger.info(`[TripPlanner] RAG retrieval for "${state.destination}"`);

//   const query = [
//     state.destination,
//     "Egypt travel attractions hotels",
//     ...state.interests,
//   ].join(" ");

//   const ragContext = await retrieveContext(query, 5);
//   logger.info(`[TripPlanner] RAG: ${ragContext ? `${ragContext.length} chars` : "no results"}`);

//   return { ragContext };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 2: PLANNER
// // Calls the LLM to produce a structured JSON itinerary
// // ─────────────────────────────────────────────────────────────────────────────
// async function plannerNode(state) {
//   logger.info(
//     `[TripPlanner] Generating ${state.duration}-day plan for ${state.destination} ` +
//     `(attempt ${state.retryCount + 1})`
//   );

//   const ragBlock = state.ragContext
//     ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
//     : "";

//   const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

//   const langInstruction =
//     state.language === "ar"
//       ? "Respond entirely in Arabic (العربية)."
//       : "Respond in English.";

//   const interestsList =
//     state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

//   // On retry, add explicit correction instruction
//   const retryHint =
//     state.retryCount > 0
//       ? "\n\nIMPORTANT: Your previous response had invalid JSON. " +
//         "Return ONLY a raw JSON object — no markdown, no backticks, no preamble."
//       : "";

//   const userPrompt =
//     `${langInstruction}${retryHint}\n\n` +
//     `Generate a ${state.duration}-day trip plan for:\n` +
//     `- Destination: ${state.destination}, Egypt\n` +
//     `- Budget: ${budgetLabel(state.budget)}\n` +
//     `- Travelers: ${state.travelers}\n` +
//     `- Interests: ${interestsList}`;

//   const response = await tripLLM.invoke([
//     new SystemMessage(systemContent),
//     new HumanMessage(userPrompt),
//   ]);

//   const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
//   logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

//   return { rawOutput: response.content, tokensUsed, rawResponse: response  };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 3: VALIDATOR
// // Parses the JSON and validates its shape; sets plan or error
// // ─────────────────────────────────────────────────────────────────────────────
// async function validatorNode(state) {
//   const parsed = safeJsonParse(state.rawOutput);

//   if (isValidPlan(parsed)) {
//     logger.info(`[TripPlanner] Plan validated: "${parsed.title}" (${parsed.days.length} days)`);
//     return { plan: parsed, error: null };
//   }

//   logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

//   if (state.retryCount < 1) {
//     // Signal retry — retryCount increment handled by the edge
//     return { plan: null, retryCount: state.retryCount + 1 };
//   }

//   return {
//     plan:  null,
//     error: "Failed to generate a valid trip plan after retrying. Please try again.",
//   };
// }

// // ─── Routing after validation ─────────────────────────────────────────────────
// function afterValidation(state) {
//   if (state.plan)  return "done";
//   if (state.error) return "done";
//   return "retry"; // go back to planner
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BUILD GRAPH
// // ─────────────────────────────────────────────────────────────────────────────
// const graph = new StateGraph(State)
//   .addNode("rag",       ragNode)
//   .addNode("planner",   plannerNode)
//   .addNode("validator", validatorNode)

//   .addEdge("__start__", "rag")
//   .addEdge("rag",       "planner")
//   .addEdge("planner",   "validator")

//   .addConditionalEdges("validator", afterValidation, {
//     retry: "planner",  // retry once with a corrective prompt
//     done:  END,
//   });

// const tripPlannerAgent = graph.compile();

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLIC API
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Generate a structured AI trip plan (replaces old generateTripPlan)
//  *
//  * @param {{ destination, duration, budget, travelers, interests, language }} params
//  * @returns {Promise<{ title, summary, estimatedTotalCost, currency, days, tokensUsed }>}
//  */
// export const generateTripPlan = async (params) => {
//   const {
//     destination,
//     duration,
//     budget     = "mid-range",
//     travelers  = 1,
//     interests  = [],
//     language   = "en",
//   } = params;

//   if (!destination) throw new Error("destination is required");
//   if (!duration || duration < 1) throw new Error("duration must be a positive number");

//   const result = await tripPlannerAgent.invoke({
//     destination,
//     duration:   Number(duration),
//     budget,
//     travelers:  Number(travelers),
//     interests:  Array.isArray(interests) ? interests : [],
//     language,
//   });

//   if (result.error) throw new Error(result.error);
//   if (!result.plan) throw new Error("Trip generation failed — no plan returned");

//   return {
//     ...result.plan,
//     tokensUsed: result.tokensUsed,
//   };
// };
// ?
// // tripPlanner.ai.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Standalone Agent — AI Trip Planner
// //
// // LangGraph flow:
// //
// //   { destination, duration, budget, travelers, interests, language }
// //               │
// //               ▼
// //         [RAG NODE]       — retrieves destination + hotel knowledge
// //               │
// //               ▼
// //       [PLANNER NODE]     — LLM generates structured JSON itinerary
// //               │
// //               ▼
// //       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
// //               │
// //               ▼
// //           itinerary JSON
// //
// // Exported API:
// //   generateTripPlan(params)
// // ─────────────────────────────────────────────────────────────────────────────

// import { StateGraph, Annotation, END } from "@langchain/langgraph";
// import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// import { tripLLM } from "./llm.client.js";
// import { retrieveContext } from "./rag.retriever.js";
// import { TRIP_PLANNER_SYSTEM } from "./agent.prompts.js";
// import logger from "../../config/logger.js";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const safeJsonParse = (raw) => {
//   if (!raw) return null;
//   try { return JSON.parse(raw); } catch { /* */ }
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
//   const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
//   if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
//   return null;
// };

// const isValidPlan = (plan) =>
//   plan &&
//   typeof plan.title === "string" &&
//   typeof plan.summary === "string" &&
//   Array.isArray(plan.days) &&
//   plan.days.length > 0 &&
//   plan.days.every(
//     (d) =>
//       typeof d.day === "number" &&
//       Array.isArray(d.activities) &&
//       d.activities.length > 0
//   );

// const budgetLabel = (budget) => ({
//   budget:  "budget traveler (EGP 500–900/day)",
//   luxury:  "luxury traveler (EGP 3000+/day)",
// }[budget] || "mid-range traveler (EGP 900–2500/day)");

// // ─── State ────────────────────────────────────────────────────────────────────
// const State = Annotation.Root({
//   // Input
//   destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
//   duration:    Annotation({ reducer: (_, b) => b, default: () => 3 }),
//   budget:      Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
//   travelers:   Annotation({ reducer: (_, b) => b, default: () => 1 }),
//   interests:   Annotation({ reducer: (_, b) => b, default: () => [] }),
//   language:    Annotation({ reducer: (_, b) => b, default: () => "en" }),

//   // Internal pipeline
//   ragContext:  Annotation({ reducer: (_, b) => b, default: () => null }),
//   rawOutput:   Annotation({ reducer: (_, b) => b, default: () => null }),
//   retryCount:  Annotation({ reducer: (_, b) => b, default: () => 0 }),

//   // Output
//   plan:        Annotation({ reducer: (_, b) => b, default: () => null }),
//   tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   error:       Annotation({ reducer: (_, b) => b, default: () => null }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 1: RAG RETRIEVAL
// // Fetches destination + hotel knowledge from Pinecone
// // ─────────────────────────────────────────────────────────────────────────────
// async function ragNode(state) {
//   logger.info(`[TripPlanner] RAG retrieval for "${state.destination}"`);

//   const query = [
//     state.destination,
//     "Egypt travel attractions hotels",
//     ...state.interests,
//   ].join(" ");

//   const ragContext = await retrieveContext(query, 5);
//   logger.info(`[TripPlanner] RAG: ${ragContext ? `${ragContext.length} chars` : "no results"}`);

//   return { ragContext };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 2: PLANNER
// // Calls the LLM to produce a structured JSON itinerary
// // ─────────────────────────────────────────────────────────────────────────────
// async function plannerNode(state) {
//   logger.info(
//     `[TripPlanner] Generating ${state.duration}-day plan for ${state.destination} ` +
//     `(attempt ${state.retryCount + 1})`
//   );

//   const ragBlock = state.ragContext
//     ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
//     : "";

//   const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

//   const langInstruction =
//     state.language === "ar"
//       ? "Respond entirely in Arabic (العربية)."
//       : "Respond in English.";

//   const interestsList =
//     state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

//   // On retry, add explicit correction instruction
//   const retryHint =
//     state.retryCount > 0
//       ? "\n\nIMPORTANT: Your previous response had invalid JSON. " +
//         "Return ONLY a raw JSON object — no markdown, no backticks, no preamble."
//       : "";

//   const userPrompt =
//     `${langInstruction}${retryHint}\n\n` +
//     `Generate a ${state.duration}-day trip plan for:\n` +
//     `- Destination: ${state.destination}, Egypt\n` +
//     `- Budget: ${budgetLabel(state.budget)}\n` +
//     `- Travelers: ${state.travelers}\n` +
//     `- Interests: ${interestsList}`;

//   const response = await tripLLM.invoke([
//     new SystemMessage(systemContent),
//     new HumanMessage(userPrompt),
//   ]);

//   const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
//   logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

//   return { rawOutput: response.content, tokensUsed, rawResponse: response  };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 3: VALIDATOR
// // Parses the JSON and validates its shape; sets plan or error
// // ─────────────────────────────────────────────────────────────────────────────
// async function validatorNode(state) {
//   const parsed = safeJsonParse(state.rawOutput);

//   if (isValidPlan(parsed)) {
//     logger.info(`[TripPlanner] Plan validated: "${parsed.title}" (${parsed.days.length} days)`);
//     return { plan: parsed, error: null };
//   }

//   logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

//   if (state.retryCount < 1) {
//     // Signal retry — retryCount increment handled by the edge
//     return { plan: null, retryCount: state.retryCount + 1 };
//   }

//   return {
//     plan:  null,
//     error: "Failed to generate a valid trip plan after retrying. Please try again.",
//   };
// }

// // ─── Routing after validation ─────────────────────────────────────────────────
// function afterValidation(state) {
//   if (state.plan)  return "done";
//   if (state.error) return "done";
//   return "retry"; // go back to planner
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BUILD GRAPH
// // ─────────────────────────────────────────────────────────────────────────────
// const graph = new StateGraph(State)
//   .addNode("rag",       ragNode)
//   .addNode("planner",   plannerNode)
//   .addNode("validator", validatorNode)

//   .addEdge("__start__", "rag")
//   .addEdge("rag",       "planner")
//   .addEdge("planner",   "validator")

//   .addConditionalEdges("validator", afterValidation, {
//     retry: "planner",  // retry once with a corrective prompt
//     done:  END,
//   });

// const tripPlannerAgent = graph.compile();

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLIC API
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Generate a structured AI trip plan (replaces old generateTripPlan)
//  *
//  * @param {{ destination, duration, budget, travelers, interests, language }} params
//  * @returns {Promise<{ title, summary, estimatedTotalCost, currency, days, tokensUsed }>}
//  */
// export const generateTripPlan = async (params) => {
//   const {
//     destination,
//     duration,
//     budget     = "mid-range",
//     travelers  = 1,
//     interests  = [],
//     language   = "en",
//   } = params;

//   if (!destination) throw new Error("destination is required");
//   if (!duration || duration < 1) throw new Error("duration must be a positive number");

//   const result = await tripPlannerAgent.invoke({
//     destination,
//     duration:   Number(duration),
//     budget,
//     travelers:  Number(travelers),
//     interests:  Array.isArray(interests) ? interests : [],
//     language,
//   });

//   if (result.error) throw new Error(result.error);
//   if (!result.plan) throw new Error("Trip generation failed — no plan returned");

//   return {
//     ...result.plan,
//     tokensUsed: result.tokensUsed,
//   };
// };
// // tripPlanner.ai.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Standalone Agent — AI Trip Planner
// //
// // LangGraph flow:
// //
// //   { destination, duration, budget, travelers, interests, language }
// //               │
// //               ▼
// //         [RAG NODE]       — retrieves destination + hotel knowledge
// //               │
// //               ▼
// //       [PLANNER NODE]     — LLM generates structured JSON itinerary
// //               │
// //               ▼
// //       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
// //               │
// //               ▼
// //           itinerary JSON
// //
// // Exported API:
// //   generateTripPlan(params)
// // ─────────────────────────────────────────────────────────────────────────────

// import { StateGraph, Annotation, END } from "@langchain/langgraph";
// import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// import { tripLLM } from "./llm.client.js";
// import { retrieveContext } from "./rag.retriever.js";
// import { TRIP_PLANNER_SYSTEM } from "./agent.prompts.js";
// import logger from "../../config/logger.js";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const safeJsonParse = (raw) => {
//   if (!raw) return null;
//   try { return JSON.parse(raw); } catch { /* */ }
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
//   const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
//   if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
//   return null;
// };

// const isValidPlan = (plan) =>
//   plan &&
//   typeof plan.title === "string" &&
//   typeof plan.summary === "string" &&
//   Array.isArray(plan.days) &&
//   plan.days.length > 0 &&
//   plan.days.every(
//     (d) =>
//       typeof d.day === "number" &&
//       Array.isArray(d.activities) &&
//       d.activities.length > 0
//   );

// const budgetLabel = (budget) => ({
//   budget:  "budget traveler (EGP 500–900/day)",
//   luxury:  "luxury traveler (EGP 3000+/day)",
// }[budget] || "mid-range traveler (EGP 900–2500/day)");

// // ─── State ────────────────────────────────────────────────────────────────────
// const State = Annotation.Root({
//   // Input
//   destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
//   duration:    Annotation({ reducer: (_, b) => b, default: () => 3 }),
//   budget:      Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
//   travelers:   Annotation({ reducer: (_, b) => b, default: () => 1 }),
//   interests:   Annotation({ reducer: (_, b) => b, default: () => [] }),
//   language:    Annotation({ reducer: (_, b) => b, default: () => "en" }),

//   // Internal pipeline
//   ragContext:  Annotation({ reducer: (_, b) => b, default: () => null }),
//   rawOutput:   Annotation({ reducer: (_, b) => b, default: () => null }),
//   retryCount:  Annotation({ reducer: (_, b) => b, default: () => 0 }),

//   // Output
//   plan:        Annotation({ reducer: (_, b) => b, default: () => null }),
//   tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   error:       Annotation({ reducer: (_, b) => b, default: () => null }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 1: RAG RETRIEVAL
// // Fetches destination + hotel knowledge from Pinecone
// // ─────────────────────────────────────────────────────────────────────────────
// async function ragNode(state) {
//   logger.info(`[TripPlanner] RAG retrieval for "${state.destination}"`);

//   const query = [
//     state.destination,
//     "Egypt travel attractions hotels",
//     ...state.interests,
//   ].join(" ");

//   const ragContext = await retrieveContext(query, 5);
//   logger.info(`[TripPlanner] RAG: ${ragContext ? `${ragContext.length} chars` : "no results"}`);

//   return { ragContext };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 2: PLANNER
// // Calls the LLM to produce a structured JSON itinerary
// // ─────────────────────────────────────────────────────────────────────────────
// async function plannerNode(state) {
//   logger.info(
//     `[TripPlanner] Generating ${state.duration}-day plan for ${state.destination} ` +
//     `(attempt ${state.retryCount + 1})`
//   );

//   const ragBlock = state.ragContext
//     ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
//     : "";

//   const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

//   const langInstruction =
//     state.language === "ar"
//       ? "Respond entirely in Arabic (العربية)."
//       : "Respond in English.";

//   const interestsList =
//     state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

//   // On retry, add explicit correction instruction
//   const retryHint =
//     state.retryCount > 0
//       ? "\n\nIMPORTANT: Your previous response had invalid JSON. " +
//         "Return ONLY a raw JSON object — no markdown, no backticks, no preamble."
//       : "";

//   const userPrompt =
//     `${langInstruction}${retryHint}\n\n` +
//     `Generate a ${state.duration}-day trip plan for:\n` +
//     `- Destination: ${state.destination}, Egypt\n` +
//     `- Budget: ${budgetLabel(state.budget)}\n` +
//     `- Travelers: ${state.travelers}\n` +
//     `- Interests: ${interestsList}`;

//   const response = await tripLLM.invoke([
//     new SystemMessage(systemContent),
//     new HumanMessage(userPrompt),
//   ]);

//   const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
//   logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

//   return { rawOutput: response.content, tokensUsed, rawResponse: response  };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 3: VALIDATOR
// // Parses the JSON and validates its shape; sets plan or error
// // ─────────────────────────────────────────────────────────────────────────────
// async function validatorNode(state) {
//   const parsed = safeJsonParse(state.rawOutput);

//   if (isValidPlan(parsed)) {
//     logger.info(`[TripPlanner] Plan validated: "${parsed.title}" (${parsed.days.length} days)`);
//     return { plan: parsed, error: null };
//   }

//   logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

//   if (state.retryCount < 1) {
//     // Signal retry — retryCount increment handled by the edge
//     return { plan: null, retryCount: state.retryCount + 1 };
//   }

//   return {
//     plan:  null,
//     error: "Failed to generate a valid trip plan after retrying. Please try again.",
//   };
// }

// // ─── Routing after validation ─────────────────────────────────────────────────
// function afterValidation(state) {
//   if (state.plan)  return "done";
//   if (state.error) return "done";
//   return "retry"; // go back to planner
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BUILD GRAPH
// // ─────────────────────────────────────────────────────────────────────────────
// const graph = new StateGraph(State)
//   .addNode("rag",       ragNode)
//   .addNode("planner",   plannerNode)
//   .addNode("validator", validatorNode)

//   .addEdge("__start__", "rag")
//   .addEdge("rag",       "planner")
//   .addEdge("planner",   "validator")

//   .addConditionalEdges("validator", afterValidation, {
//     retry: "planner",  // retry once with a corrective prompt
//     done:  END,
//   });

// const tripPlannerAgent = graph.compile();

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLIC API
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Generate a structured AI trip plan (replaces old generateTripPlan)
//  *
//  * @param {{ destination, duration, budget, travelers, interests, language }} params
//  * @returns {Promise<{ title, summary, estimatedTotalCost, currency, days, tokensUsed }>}
//  */
// export const generateTripPlan = async (params) => {
//   const {
//     destination,
//     duration,
//     budget     = "mid-range",
//     travelers  = 1,
//     interests  = [],
//     language   = "en",
//   } = params;

//   if (!destination) throw new Error("destination is required");
//   if (!duration || duration < 1) throw new Error("duration must be a positive number");

//   const result = await tripPlannerAgent.invoke({
//     destination,
//     duration:   Number(duration),
//     budget,
//     travelers:  Number(travelers),
//     interests:  Array.isArray(interests) ? interests : [],
//     language,
//   });

//   if (result.error) throw new Error(result.error);
//   if (!result.plan) throw new Error("Trip generation failed — no plan returned");

//   return {
//     ...result.plan,
//     tokensUsed: result.tokensUsed,
//   };
// };
// ?
// // tripPlanner.ai.js
// // ─────────────────────────────────────────────────────────────────────────────
// // Standalone Agent — AI Trip Planner
// //
// // LangGraph flow:
// //
// //   { destination, duration, budget, travelers, interests, language }
// //               │
// //               ▼
// //         [RAG NODE]       — retrieves destination + hotel knowledge
// //               │
// //               ▼
// //       [PLANNER NODE]     — LLM generates structured JSON itinerary
// //               │
// //               ▼
// //       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
// //               │
// //               ▼
// //           itinerary JSON
// //
// // Exported API:
// //   generateTripPlan(params)
// // ─────────────────────────────────────────────────────────────────────────────

// import { StateGraph, Annotation, END } from "@langchain/langgraph";
// import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// import { tripLLM } from "./llm.client.js";
// import { retrieveContext } from "./rag.retriever.js";
// import { TRIP_PLANNER_SYSTEM } from "./agent.prompts.js";
// import logger from "../../config/logger.js";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const safeJsonParse = (raw) => {
//   if (!raw) return null;
//   try { return JSON.parse(raw); } catch { /* */ }
//   const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
//   if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
//   const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
//   if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
//   return null;
// };

// const isValidPlan = (plan) =>
//   plan &&
//   typeof plan.title === "string" &&
//   typeof plan.summary === "string" &&
//   Array.isArray(plan.days) &&
//   plan.days.length > 0 &&
//   plan.days.every(
//     (d) =>
//       typeof d.day === "number" &&
//       Array.isArray(d.activities) &&
//       d.activities.length > 0
//   );

// const budgetLabel = (budget) => ({
//   budget:  "budget traveler (EGP 500–900/day)",
//   luxury:  "luxury traveler (EGP 3000+/day)",
// }[budget] || "mid-range traveler (EGP 900–2500/day)");

// // ─── State ────────────────────────────────────────────────────────────────────
// const State = Annotation.Root({
//   // Input
//   destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
//   duration:    Annotation({ reducer: (_, b) => b, default: () => 3 }),
//   budget:      Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
//   travelers:   Annotation({ reducer: (_, b) => b, default: () => 1 }),
//   interests:   Annotation({ reducer: (_, b) => b, default: () => [] }),
//   language:    Annotation({ reducer: (_, b) => b, default: () => "en" }),

//   // Internal pipeline
//   ragContext:  Annotation({ reducer: (_, b) => b, default: () => null }),
//   rawOutput:   Annotation({ reducer: (_, b) => b, default: () => null }),
//   retryCount:  Annotation({ reducer: (_, b) => b, default: () => 0 }),

//   // Output
//   plan:        Annotation({ reducer: (_, b) => b, default: () => null }),
//   tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
//   error:       Annotation({ reducer: (_, b) => b, default: () => null }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 1: RAG RETRIEVAL
// // Fetches destination + hotel knowledge from Pinecone
// // ─────────────────────────────────────────────────────────────────────────────
// async function ragNode(state) {
//   logger.info(`[TripPlanner] RAG retrieval for "${state.destination}"`);

//   const query = [
//     state.destination,
//     "Egypt travel attractions hotels",
//     ...state.interests,
//   ].join(" ");

//   const ragContext = await retrieveContext(query, 5);
//   logger.info(`[TripPlanner] RAG: ${ragContext ? `${ragContext.length} chars` : "no results"}`);

//   return { ragContext };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 2: PLANNER
// // Calls the LLM to produce a structured JSON itinerary
// // ─────────────────────────────────────────────────────────────────────────────
// async function plannerNode(state) {
//   logger.info(
//     `[TripPlanner] Generating ${state.duration}-day plan for ${state.destination} ` +
//     `(attempt ${state.retryCount + 1})`
//   );

//   const ragBlock = state.ragContext
//     ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
//     : "";

//   const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

//   const langInstruction =
//     state.language === "ar"
//       ? "Respond entirely in Arabic (العربية)."
//       : "Respond in English.";

//   const interestsList =
//     state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

//   // On retry, add explicit correction instruction
//   const retryHint =
//     state.retryCount > 0
//       ? "\n\nIMPORTANT: Your previous response had invalid JSON. " +
//         "Return ONLY a raw JSON object — no markdown, no backticks, no preamble."
//       : "";

//   const userPrompt =
//     `${langInstruction}${retryHint}\n\n` +
//     `Generate a ${state.duration}-day trip plan for:\n` +
//     `- Destination: ${state.destination}, Egypt\n` +
//     `- Budget: ${budgetLabel(state.budget)}\n` +
//     `- Travelers: ${state.travelers}\n` +
//     `- Interests: ${interestsList}`;

//   const response = await tripLLM.invoke([
//     new SystemMessage(systemContent),
//     new HumanMessage(userPrompt),
//   ]);

//   const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
//   logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

//   return { rawOutput: response.content, tokensUsed, rawResponse: response  };
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NODE 3: VALIDATOR
// // Parses the JSON and validates its shape; sets plan or error
// // ─────────────────────────────────────────────────────────────────────────────
// async function validatorNode(state) {
//   const parsed = safeJsonParse(state.rawOutput);

//   if (isValidPlan(parsed)) {
//     logger.info(`[TripPlanner] Plan validated: "${parsed.title}" (${parsed.days.length} days)`);
//     return { plan: parsed, error: null };
//   }

//   logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

//   if (state.retryCount < 1) {
//     // Signal retry — retryCount increment handled by the edge
//     return { plan: null, retryCount: state.retryCount + 1 };
//   }

//   return {
//     plan:  null,
//     error: "Failed to generate a valid trip plan after retrying. Please try again.",
//   };
// }

// // ─── Routing after validation ─────────────────────────────────────────────────
// function afterValidation(state) {
//   if (state.plan)  return "done";
//   if (state.error) return "done";
//   return "retry"; // go back to planner
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // BUILD GRAPH
// // ─────────────────────────────────────────────────────────────────────────────
// const graph = new StateGraph(State)
//   .addNode("rag",       ragNode)
//   .addNode("planner",   plannerNode)
//   .addNode("validator", validatorNode)

//   .addEdge("__start__", "rag")
//   .addEdge("rag",       "planner")
//   .addEdge("planner",   "validator")

//   .addConditionalEdges("validator", afterValidation, {
//     retry: "planner",  // retry once with a corrective prompt
//     done:  END,
//   });

// const tripPlannerAgent = graph.compile();

// // ─────────────────────────────────────────────────────────────────────────────
// // PUBLIC API
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * Generate a structured AI trip plan (replaces old generateTripPlan)
//  *
//  * @param {{ destination, duration, budget, travelers, interests, language }} params
//  * @returns {Promise<{ title, summary, estimatedTotalCost, currency, days, tokensUsed }>}
//  */
// export const generateTripPlan = async (params) => {
//   const {
//     destination,
//     duration,
//     budget     = "mid-range",
//     travelers  = 1,
//     interests  = [],
//     language   = "en",
//   } = params;

//   if (!destination) throw new Error("destination is required");
//   if (!duration || duration < 1) throw new Error("duration must be a positive number");

//   const result = await tripPlannerAgent.invoke({
//     destination,
//     duration:   Number(duration),
//     budget,
//     travelers:  Number(travelers),
//     interests:  Array.isArray(interests) ? interests : [],
//     language,
//   });

//   if (result.error) throw new Error(result.error);
//   if (!result.plan) throw new Error("Trip generation failed — no plan returned");

//   return {
//     ...result.plan,
//     tokensUsed: result.tokensUsed,
//   };
// };
// tripPlanner.ai.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Agent — AI Trip Planner
//
// LangGraph flow:
//
//   { destination, duration, budget, travelers, interests, language }
//               │
//               ▼
//         [RAG NODE]       — retrieves destination + hotel knowledge
//               │
//               ▼
//       [PLANNER NODE]     — LLM generates structured JSON itinerary
//               │            (BOTH English and Arabic, every field)
//               ▼
//       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
//               │
//               ▼
//           itinerary JSON
//
// UPDATED: the plan is now always bilingual — every display field is an
// { en, ar } object (title, destination, summary, day.title, activities,
// meals, accommodation, tips). `language` is no longer "respond only in
// this language" — both languages are always generated in the same pass,
// and `language` is just stored on the Trip document as the user's
// preferred display language for the frontend to default to.
//
// Exported API:
//   generateTripPlan(params)
// ─────────────────────────────────────────────────────────────────────────────

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { tripLLM } from "./llm.client.js";
import { retrieveContext } from "./rag.retriever.js";
import { TRIP_PLANNER_SYSTEM } from "./agent.prompts.js";
import logger from "../../config/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeJsonParse = (raw) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { /* */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
  return null;
};

const toLocalizedString = (val, fallback = "") => {
  if (!val) return { en: fallback, ar: fallback };
  if (typeof val === "string") return { en: val, ar: val };
  if (typeof val === "object") {
    const en = typeof val.en === "string" && val.en.trim() ? val.en : fallback;
    const ar = typeof val.ar === "string" && val.ar.trim() ? val.ar : (en || fallback);
    return { en: en || fallback, ar: ar || en || fallback };
  }
  return { en: String(val), ar: String(val) };
};

const normalizePlan = (rawPlan, defaultDestination = "Egypt") => {
  if (!rawPlan || typeof rawPlan !== "object") return null;

  const title = toLocalizedString(rawPlan.title, `Journey to ${defaultDestination}`);
  const destination = toLocalizedString(rawPlan.destination, defaultDestination);
  const summary = toLocalizedString(rawPlan.summary, `An unforgettable journey exploring ${defaultDestination}.`);

  let days = [];
  if (Array.isArray(rawPlan.days) && rawPlan.days.length > 0) {
    days = rawPlan.days.map((d, index) => {
      const dayNum = typeof d.day === "number" ? d.day : (index + 1);
      const dayTitle = toLocalizedString(d.title, `Day ${dayNum}`);

      const activities = Array.isArray(d.activities) && d.activities.length > 0
        ? d.activities.map((a, aIdx) => toLocalizedString(a, `Explore highlights #${aIdx + 1}`))
        : [toLocalizedString(null, "Explore local landmarks")];

      const meals = Array.isArray(d.meals) && d.meals.length > 0
        ? d.meals.map((m, mIdx) => toLocalizedString(m, `Traditional meal #${mIdx + 1}`))
        : [toLocalizedString(null, "Breakfast at hotel"), toLocalizedString(null, "Dinner at authentic local restaurant")];

      const accommodation = toLocalizedString(d.accommodation, "Heritage Hotel");
      const tips = toLocalizedString(d.tips, "Wear comfortable walking shoes and stay hydrated.");

      return {
        day: dayNum,
        title: dayTitle,
        activities,
        meals,
        accommodation,
        tips,
      };
    });
  }

  if (days.length === 0) return null;

  return {
    ...rawPlan,
    title,
    destination,
    summary,
    days,
  };
};

// A bilingual field must be an object with non-empty en AND ar strings.
const isLocalizedString = (v) =>
  v &&
  typeof v === "object" &&
  typeof v.en === "string" && v.en.trim().length > 0 &&
  typeof v.ar === "string" && v.ar.trim().length > 0;

// Same check, but empty strings are allowed (accommodation/tips can be blank)
const isLocalizedStringOptional = (v) =>
  v &&
  typeof v === "object" &&
  typeof v.en === "string" &&
  typeof v.ar === "string";

const isLocalizedListItem = (v) => isLocalizedString(v);

const isValidPlan = (plan) =>
  plan &&
  isLocalizedString(plan.title) &&
  isLocalizedString(plan.destination) &&
  isLocalizedString(plan.summary) &&
  Array.isArray(plan.days) &&
  plan.days.length > 0 &&
  plan.days.every(
    (d) =>
      typeof d.day === "number" &&
      isLocalizedStringOptional(d.title) &&
      Array.isArray(d.activities) &&
      d.activities.length > 0 &&
      d.activities.every(isLocalizedListItem) &&
      Array.isArray(d.meals) &&
      d.meals.every(isLocalizedListItem) &&
      isLocalizedStringOptional(d.accommodation) &&
      isLocalizedStringOptional(d.tips)
  );

const budgetLabel = (budget) => ({
  budget: "budget traveler (EGP 500–900/day)",
  luxury: "luxury traveler (EGP 3000+/day)",
}[budget] || "mid-range traveler (EGP 900–2500/day)");

// ─── State ────────────────────────────────────────────────────────────────────
const State = Annotation.Root({
  // Input
  destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
  duration: Annotation({ reducer: (_, b) => b, default: () => 3 }),
  budget: Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
  travelers: Annotation({ reducer: (_, b) => b, default: () => 1 }),
  interests: Annotation({ reducer: (_, b) => b, default: () => [] }),
  // `language` is now only a stored display-preference hint, not a
  // generation directive — both languages are always produced. Kept in
  // state so it round-trips through to the returned plan untouched.
  language: Annotation({ reducer: (_, b) => b, default: () => "en" }),

  // Internal pipeline
  ragContext: Annotation({ reducer: (_, b) => b, default: () => null }),
  rawOutput: Annotation({ reducer: (_, b) => b, default: () => null }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  rawResponse: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Output
  plan: Annotation({ reducer: (_, b) => b, default: () => null }),
  tokensUsed: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  error: Annotation({ reducer: (_, b) => b, default: () => null }),
});

// ─────────────────────────────────────────────────────────────────────────────
// NODE 1: RAG RETRIEVAL
// Fetches destination + hotel knowledge from Pinecone
// ─────────────────────────────────────────────────────────────────────────────
async function ragNode(state) {
  logger.info(`[TripPlanner] RAG retrieval for "${state.destination}"`);

  const query = [
    state.destination,
    "Egypt travel attractions hotels",
    ...state.interests,
  ].join(" ");

  const ragContext = await retrieveContext(query, 5);
  logger.info(`[TripPlanner] RAG: ${ragContext ? `${ragContext.length} chars` : "no results"}`);

  return { ragContext };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 2: PLANNER
// Calls the LLM to produce a structured, BILINGUAL JSON itinerary
// ─────────────────────────────────────────────────────────────────────────────
async function plannerNode(state) {
  logger.info(
    `[TripPlanner] Generating ${state.duration}-day bilingual plan for ${state.destination} ` +
    `(attempt ${state.retryCount + 1})`
  );

  const ragBlock = state.ragContext
    ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
    : "";

  const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

  const interestsList =
    state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

  // On retry, add explicit correction instruction
  const retryHint =
    state.retryCount > 0
      ? "\n\nIMPORTANT: Your previous response was invalid — either the JSON " +
      "didn't parse or some field was missing its 'en'/'ar' pair. " +
      "Return ONLY a raw JSON object — no markdown, no backticks, no preamble — " +
      "and make sure EVERY text field has both 'en' and 'ar' filled in."
      : "";

  const userPrompt =
    `Generate BOTH English and Arabic content for the same trip plan — every ` +
    `field needs its { en, ar } pair, in a single response.${retryHint}\n\n` +
    `Generate a ${state.duration}-day trip plan for:\n` +
    `- Destination: ${state.destination}, Egypt\n` +
    `- Budget: ${budgetLabel(state.budget)}\n` +
    `- Travelers: ${state.travelers}\n` +
    `- Interests: ${interestsList}`;

  let response;
  try {
    response = await tripLLM.invoke([
      new SystemMessage(systemContent),
      new HumanMessage(userPrompt),
    ]);
  } catch (err) {
    logger.error(`[TripPlanner] LLM invocation failed: ${err.message}`);
    throw err;
  }

  const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
  logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

  // Normalize response.content → plain string regardless of the underlying
  // API format. NVIDIA/OpenAI returns a plain string. The Anthropic API
  // (used via the student proxy in llm.client.js) returns an array of
  // content blocks: [{ type: "text", text: "..." }, ...].
  // Passing an array to safeJsonParse causes JSON.parse to succeed on the
  // array itself (not the JSON inside the text block), producing a corrupt
  // plan that bypasses isValidPlan and then crashes Mongoose with CastError
  // on every localized field.
  const rawOutput = Array.isArray(response.content)
    ? response.content
      .filter((b) => b?.type === "text")
      .map((b) => b.text || "")
      .join("")
    : (response.content ?? "");

  logger.info(`[TripPlanner] rawOutput (first 120): ${rawOutput.slice(0, 120)}`);

  return { rawOutput, tokensUsed, rawResponse: response };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: VALIDATOR
// Parses the JSON and validates its bilingual shape; sets plan or error
// ─────────────────────────────────────────────────────────────────────────────
async function validatorNode(state) {
  const parsed = safeJsonParse(state.rawOutput);
  const normalized = normalizePlan(parsed, state.destination);

  if (normalized && (isValidPlan(normalized) || (Array.isArray(normalized.days) && normalized.days.length > 0))) {
    const titleEn = normalized.title?.en || normalized.title || "Trip Plan";
    const titleAr = normalized.title?.ar || normalized.title || "خطة الرحلة";
    logger.info(`[TripPlanner] Plan validated: "${titleEn}" / "${titleAr}" (${normalized.days.length} days)`);
    return { plan: normalized, error: null };
  }

  logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

  if (state.retryCount < 1) {
    // Signal retry — retryCount increment handled by the edge
    return { plan: null, retryCount: state.retryCount + 1 };
  }

  if (normalized) {
    return { plan: normalized, error: null };
  }

  return {
    plan: null,
    error: "Failed to generate a valid bilingual trip plan after retrying. Please try again.",
  };
}

// ─── Routing after validation ─────────────────────────────────────────────────
function afterValidation(state) {
  if (state.plan) return "done";
  if (state.error) return "done";
  return "retry"; // go back to planner
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD GRAPH
// ─────────────────────────────────────────────────────────────────────────────
const graph = new StateGraph(State)
  .addNode("rag", ragNode)
  .addNode("planner", plannerNode)
  .addNode("validator", validatorNode)

  .addEdge("__start__", "rag")
  .addEdge("rag", "planner")
  .addEdge("planner", "validator")

  .addConditionalEdges("validator", afterValidation, {
    retry: "planner",  // retry once with a corrective prompt
    done: END,
  });

const tripPlannerAgent = graph.compile();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured, BILINGUAL AI trip plan.
 *
 * Returns every display field as { en, ar } — title, destination, summary,
 * and each day's title/activities/meals/accommodation/tips. `language` is
 * passed through unchanged as a display-preference hint for the frontend;
 * it does NOT restrict which language gets generated (both always are).
 *
 * @param {{ destination, duration, budget, travelers, interests, language }} params
 * @returns {Promise<{ title, destination, summary, estimatedTotalCost, currency, days, language, tokensUsed, rawResponse }>}
 */
export const generateTripPlan = async (params) => {
  const {
    destination,
    duration,
    budget = "mid-range",
    travelers = 1,
    interests = [],
    language = "en",
  } = params;

  if (!destination) throw new Error("destination is required");
  if (!duration || duration < 1) throw new Error("duration must be a positive number");

  const result = await tripPlannerAgent.invoke({
    destination,
    duration: Number(duration),
    budget,
    travelers: Number(travelers),
    interests: Array.isArray(interests) ? interests : [],
    language,
  });

  if (result.error) throw new Error(result.error);
  if (!result.plan) throw new Error("Trip generation failed — no plan returned");

  return {
    ...result.plan,
    language,
    tokensUsed: result.tokensUsed,
    // Kept for trip.service.js's AI-usage logging (model/prompt/completion tokens)
    rawResponse: result.rawResponse,
  };
};