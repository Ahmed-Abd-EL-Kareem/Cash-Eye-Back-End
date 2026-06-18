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
//               │
//               ▼
//       [VALIDATOR NODE]   — validates JSON shape, retries once on failure
//               │
//               ▼
//           itinerary JSON
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

const isValidPlan = (plan) =>
  plan &&
  typeof plan.title === "string" &&
  typeof plan.summary === "string" &&
  Array.isArray(plan.days) &&
  plan.days.length > 0 &&
  plan.days.every(
    (d) =>
      typeof d.day === "number" &&
      Array.isArray(d.activities) &&
      d.activities.length > 0
  );

const budgetLabel = (budget) => ({
  budget:  "budget traveler (EGP 500–900/day)",
  luxury:  "luxury traveler (EGP 3000+/day)",
}[budget] || "mid-range traveler (EGP 900–2500/day)");

// ─── State ────────────────────────────────────────────────────────────────────
const State = Annotation.Root({
  // Input
  destination: Annotation({ reducer: (_, b) => b, default: () => "" }),
  duration:    Annotation({ reducer: (_, b) => b, default: () => 3 }),
  budget:      Annotation({ reducer: (_, b) => b, default: () => "mid-range" }),
  travelers:   Annotation({ reducer: (_, b) => b, default: () => 1 }),
  interests:   Annotation({ reducer: (_, b) => b, default: () => [] }),
  language:    Annotation({ reducer: (_, b) => b, default: () => "en" }),

  // Internal pipeline
  ragContext:  Annotation({ reducer: (_, b) => b, default: () => null }),
  rawOutput:   Annotation({ reducer: (_, b) => b, default: () => null }),
  retryCount:  Annotation({ reducer: (_, b) => b, default: () => 0 }),

  // Output
  plan:        Annotation({ reducer: (_, b) => b, default: () => null }),
  tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
  error:       Annotation({ reducer: (_, b) => b, default: () => null }),
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
// Calls the LLM to produce a structured JSON itinerary
// ─────────────────────────────────────────────────────────────────────────────
async function plannerNode(state) {
  logger.info(
    `[TripPlanner] Generating ${state.duration}-day plan for ${state.destination} ` +
    `(attempt ${state.retryCount + 1})`
  );

  const ragBlock = state.ragContext
    ? `\n## Knowledge Base Context:\n${state.ragContext}\n`
    : "";

  const systemContent = TRIP_PLANNER_SYSTEM.replace("{ragContext}", ragBlock);

  const langInstruction =
    state.language === "ar"
      ? "Respond entirely in Arabic (العربية)."
      : "Respond in English.";

  const interestsList =
    state.interests.length > 0 ? state.interests.join(", ") : "general sightseeing";

  // On retry, add explicit correction instruction
  const retryHint =
    state.retryCount > 0
      ? "\n\nIMPORTANT: Your previous response had invalid JSON. " +
        "Return ONLY a raw JSON object — no markdown, no backticks, no preamble."
      : "";

  const userPrompt =
    `${langInstruction}${retryHint}\n\n` +
    `Generate a ${state.duration}-day trip plan for:\n` +
    `- Destination: ${state.destination}, Egypt\n` +
    `- Budget: ${budgetLabel(state.budget)}\n` +
    `- Travelers: ${state.travelers}\n` +
    `- Interests: ${interestsList}`;

  const response = await tripLLM.invoke([
    new SystemMessage(systemContent),
    new HumanMessage(userPrompt),
  ]);

  const tokensUsed = (response.usage_metadata?.total_tokens || 0) + state.tokensUsed;
  logger.info(`[TripPlanner] LLM done — ${tokensUsed} total tokens`);

  return { rawOutput: response.content, tokensUsed, rawResponse: response  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE 3: VALIDATOR
// Parses the JSON and validates its shape; sets plan or error
// ─────────────────────────────────────────────────────────────────────────────
async function validatorNode(state) {
  const parsed = safeJsonParse(state.rawOutput);

  if (isValidPlan(parsed)) {
    logger.info(`[TripPlanner] Plan validated: "${parsed.title}" (${parsed.days.length} days)`);
    return { plan: parsed, error: null };
  }

  logger.warn(`[TripPlanner] Validation failed (attempt ${state.retryCount + 1})`);

  if (state.retryCount < 1) {
    // Signal retry — retryCount increment handled by the edge
    return { plan: null, retryCount: state.retryCount + 1 };
  }

  return {
    plan:  null,
    error: "Failed to generate a valid trip plan after retrying. Please try again.",
  };
}

// ─── Routing after validation ─────────────────────────────────────────────────
function afterValidation(state) {
  if (state.plan)  return "done";
  if (state.error) return "done";
  return "retry"; // go back to planner
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD GRAPH
// ─────────────────────────────────────────────────────────────────────────────
const graph = new StateGraph(State)
  .addNode("rag",       ragNode)
  .addNode("planner",   plannerNode)
  .addNode("validator", validatorNode)

  .addEdge("__start__", "rag")
  .addEdge("rag",       "planner")
  .addEdge("planner",   "validator")

  .addConditionalEdges("validator", afterValidation, {
    retry: "planner",  // retry once with a corrective prompt
    done:  END,
  });

const tripPlannerAgent = graph.compile();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured AI trip plan (replaces old generateTripPlan)
 *
 * @param {{ destination, duration, budget, travelers, interests, language }} params
 * @returns {Promise<{ title, summary, estimatedTotalCost, currency, days, tokensUsed }>}
 */
export const generateTripPlan = async (params) => {
  const {
    destination,
    duration,
    budget     = "mid-range",
    travelers  = 1,
    interests  = [],
    language   = "en",
  } = params;

  if (!destination) throw new Error("destination is required");
  if (!duration || duration < 1) throw new Error("duration must be a positive number");

  const result = await tripPlannerAgent.invoke({
    destination,
    duration:   Number(duration),
    budget,
    travelers:  Number(travelers),
    interests:  Array.isArray(interests) ? interests : [],
    language,
  });

  if (result.error) throw new Error(result.error);
  if (!result.plan) throw new Error("Trip generation failed — no plan returned");

  return {
    ...result.plan,
    tokensUsed: result.tokensUsed,
  };
};
