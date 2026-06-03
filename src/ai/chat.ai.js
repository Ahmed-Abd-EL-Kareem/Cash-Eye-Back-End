// Chat AI — Rahal travel chatbot
// Flow: extract last user message → retrieve RAG context → build system prompt
//       → send full conversation history → return reply + token usage

import { chatClient } from "./openai.client.js";
import { retrieveContext } from "./pinecone.rag.js";
import { buildChatSystemPrompt, buildRagQuery } from "./prompt.engine.js";
import ApiError from "../utils/apiError.js";
import logger from "../config/logger.js";

// Max conversation turns to send — keeps tokens under control
const MAX_HISTORY_TURNS = 10;

export const chatWithRahal = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError("messages must be a non-empty array", 400);
  }

  // Validate message shape
  const valid = messages.every(
    (m) => m.role && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
  );
  if (!valid) {
    throw new ApiError(
      "Each message must have role ('user'|'assistant') and content (string)",
      400
    );
  }

  // ── Step 1: get last user message for RAG query ──────────────────────────
  const lastUserMsg = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  // ── Step 2: retrieve RAG context based on the latest user query ──────────
  let ragContext = null;
  if (lastUserMsg?.content) {
    const ragQuery = buildRagQuery("chat", lastUserMsg.content);
    ragContext = await retrieveContext(ragQuery, 3);
    if (ragContext) {
      logger.info(`[Chat] RAG context retrieved (${ragContext.length} chars)`);
    }
  }

  // ── Step 3: build system prompt with context injected ────────────────────
  const systemPrompt = buildChatSystemPrompt(ragContext);

  // ── Step 4: trim history to MAX_HISTORY_TURNS to control token usage ─────
  const trimmedHistory = messages.slice(-MAX_HISTORY_TURNS);

  // ── Step 5: call OpenAI ──────────────────────────────────────────────────
  const response = await chatClient.chat.completions.create({
    // model: "gpt-4o-mini",   // fast + cheap for conversational turns
    model: "nvidia/nemotron-3-super-120b-a12b",   // fast + cheap for conversational turns
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ],
    temperature: 0.6,
    max_tokens: 800,
  });

  const reply = response.choices[0]?.message?.content;
  if (!reply) throw new ApiError("AI failed to respond — empty response", 500);

  const tokensUsed = response.usage?.total_tokens || 0;
  logger.info(`[Chat] Reply generated — ${tokensUsed} tokens`);

  return { reply, tokensUsed };
};