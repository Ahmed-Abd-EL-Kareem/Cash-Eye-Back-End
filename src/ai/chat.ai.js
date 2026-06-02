import openai from "./openai.client.js";
import { searchKnowledge } from "./pinecone.rag.js";
import {
  getChatSystemPrompt,
  getTripPlannerSystemPrompt,
  getHotelRecommendationPrompt,
} from "./prompt.engine.js";

// ─── Helper ───────────────────────────────────────────────
const buildContextText = (results) => {
  return results
    .map((item) => item.metadata?.text || "")
    .filter(Boolean)
    .join("\n\n");
};

// ─── 1. Chatbot ───────────────────────────────────────────
export const chatWithAI = async (userMessage) => {
  const results = await searchKnowledge(userMessage, "hotels");
  const contextText = buildContextText(results);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getChatSystemPrompt(contextText) },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return {
    reply: response.choices[0].message.content,
    tokensUsed: response.usage.total_tokens,
  };
};

// ─── 2. Trip Planner ──────────────────────────────────────
export const planTripWithAI = async (userMessage) => {
  const results = await searchKnowledge(userMessage, "hotels");
  const contextText = buildContextText(results);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getTripPlannerSystemPrompt(contextText) },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 2000,
  });

  return {
    reply: response.choices[0].message.content,
    tokensUsed: response.usage.total_tokens,
  };
};

// ─── 3. Hotel Recommendation ──────────────────────────────
export const recommendHotelsWithAI = async (userMessage) => {
  const results = await searchKnowledge(userMessage, "hotels");
  const contextText = buildContextText(results);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getHotelRecommendationPrompt(contextText) },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return {
    reply: response.choices[0].message.content,
    tokensUsed: response.usage.total_tokens,
  };
};