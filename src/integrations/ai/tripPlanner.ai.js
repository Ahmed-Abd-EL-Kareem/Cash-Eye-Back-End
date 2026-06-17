// Trip Planner AI
// Flow: build RAG query → retrieve Pinecone context → build prompt → call GPT-4
// Returns a parsed trip object + token usage for quota tracking.

import { chatClient } from "./openai.client.js";
// import openai from "./openai.client.js";
import { retrieveContext, buildIndexText } from "./pinecone.rag.js";
import { buildTripPlannerPrompt, buildRagQuery } from "./prompt.engine.js";
import ApiError from "../../utils/apiError.js";
import logger from "../../config/logger.js";

export const generateTripPlan = async ({
  destination,
  duration,
  budget = "mid-range",
  travelers = 1,
  interests = [],
  language = "en",
}) => {
  // ── Step 1: retrieve relevant context from Pinecone ──────────────────────
  const ragQuery = buildRagQuery("trip", { destination, interests });
  const ragContext = await retrieveContext(ragQuery, 5);

  if (ragContext) {
    logger.info(`[TripPlanner] RAG context retrieved (${ragContext.length} chars)`);
  } else {
    logger.info("[TripPlanner] No RAG context — proceeding with model knowledge only");
  }

  // ── Step 2: build the prompt ─────────────────────────────────────────────
  const prompt = buildTripPlannerPrompt({
    destination,
    duration,
    budget,
    travelers,
    interests,
    language,
    ragContext,
  });

  // ── Step 3: call OpenAI ──────────────────────────────────────────────────
  const response = await chatClient.chat.completions.create({
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o-mini",
    // model: "nvidia/nemotron-3-super-120b-a12b",
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: "json_object" }, // guarantees valid JSON output
  });
  // console.log("response", response);
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new ApiError("AI failed to generate a trip plan — empty response", 500);

  // ── Step 4: parse and validate JSON ─────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      logger.error(`[TripPlanner] JSON parse failed: ${raw.slice(0, 300)}`);
      throw new ApiError("AI returned malformed trip data. Please try again.", 500);
    }
  }
  // Basic shape validation — days array is the minimum required
  if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new ApiError("AI trip plan is missing itinerary days. Please try again.", 500);
  }

  const tokensUsed = response.usage?.total_tokens || 0;
  logger.info(
    `[TripPlanner] Generated "${parsed.title}" for ${destination} — ${tokensUsed} tokens`
  );

  return { ...parsed, tokensUsed, rawResponse: response };
};