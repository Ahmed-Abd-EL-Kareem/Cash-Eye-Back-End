import {
  chatWithAI,
  recommendHotelsWithAI,
} from "../../ai/chat.ai.js";

// ─── 1. Chatbot ───────────────────────────────────────────
export const chat = async (message) => {
  const { reply, tokensUsed } = await chatWithAI(message);
  return { reply, tokensUsed };
};

// ─── 2. Hotel Recommendation ──────────────────────────────
export const recommendHotels = async (message) => {
  const { reply, tokensUsed } = await recommendHotelsWithAI(message);
  return { reply, tokensUsed };
};