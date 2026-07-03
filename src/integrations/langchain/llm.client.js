// llm.client.js
// Centralised LangChain LLM / embedding instances.
// All agents import from here — swap models in one place.

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

if (!process.env.NVIDIA_API_KEY) {
  logger.warn("[LLM] NVIDIA_API_KEY not set — AI features will fail");
}
if (!process.env.OPENAI_API_KEY) {
  logger.warn("[LLM] OPENAI_API_KEY not set — embeddings will fail");
}

// ── Chat model (NVIDIA endpoint, OpenAI-compatible) ──────────────────────────
// Used by every agent sub-graph.
export const chatLLM = new ChatOpenAI({
  model: "openai/gpt-oss-20b",
  temperature: 0.4,
  maxTokens: 800,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Stricter / faster variant for structured-output agents
// Used by fieldExtractorNode (aiBookingConversation.js) to pull booking facts
// (destination/dates/guests/etc) out of the user's message every turn.
// gpt-oss-20b is a reasoning-style model — it spends completion tokens on
// internal reasoning BEFORE writing the JSON. 400 was enough for short
// messages but silently truncated (and lost) extraction on longer, more
// detail-packed ones — the JSON never finished, safeJsonParse fell back to
// {}, and nothing got merged into session.context. Raised for headroom.
export const structuredLLM = new ChatOpenAI({
  model: "openai/gpt-oss-20b",
  temperature: 0.0,
  maxTokens: 1200,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Booking agent uses Llama — keeps JSON compliance higher
export const bookingLLM = new ChatOpenAI({
  model: "moonshotai/kimi-k2.6",
  temperature: 0.6,
  maxTokens: 1500,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Trip planner needs more tokens for full itineraries
export const tripLLM = new ChatOpenAI({
  model: "moonshotai/kimi-k2.6",
  temperature: 0.6,
  maxTokens: 3000,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});


// // ── Embedding model (NVIDIA BAAI) ─────────────────────────────────────────────
// // Used by the RAG retriever — NOT the chat models.
// export const embeddings = new OpenAIEmbeddings({
//   model: "baai/bge-m3",
//   // model: "nvidia/nv-embedqa-e5-v5",
//   apiKey: process.env.NVIDIA_API_KEY,
//   configuration: {
//     baseURL: "https://integrate.api.nvidia.com/v1",
//   },
// });

// ── Embedding model (NVIDIA nv-embedqa-e5-v5, 1024-dim, matches the Upstash index) ──
// Used by the RAG retriever — NOT the chat models.
//
// nv-embedqa-e5-v5 is an asymmetric retrieval model: NVIDIA's API requires
// `input_type` ("query" for search terms, "passage" for indexed documents)
// or retrieval quality drops significantly. LangChain's OpenAIEmbeddings
// wrapper doesn't expose that field, so we call the OpenAI-compatible
// NVIDIA endpoint directly instead.

const embeddingHttpClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

/**
 * @param {string} text
 * @param {"query"|"passage"} inputType - "query" when embedding a search
 *   query, "passage" when embedding a document being indexed.
 */
export const embedText = async (text, inputType = "query") => {
  const response = await embeddingHttpClient.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 8000),
    input_type: inputType,
    truncate: "NONE",
    encoding_format: "float",
  });
  return response.data[0].embedding;
};