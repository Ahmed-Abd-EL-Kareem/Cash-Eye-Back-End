// llm.client.js
// Centralised LangChain LLM / embedding instances.
// All agents import from here — swap models in one place.

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

if (!process.env.NVIDIA_API_KEY) {
  logger.warn("[LLM] NVIDIA_API_KEY not set — AI features will fail");
}

// ── Chat model (NVIDIA endpoint, OpenAI-compatible) ──────────────────────────
// Used by every agent sub-graph.
export const chatLLM = new ChatOpenAI({
  model: "nvidia/nemotron-3-super-120b-a12b",
  temperature: 0.5,
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
  model: "nvidia/nemotron-3-super-120b-a12b",
  temperature: 0.3,
  maxTokens: 1200,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Booking agent uses Llama — keeps JSON compliance higher
export const bookingLLM = new ChatOpenAI({
  model: "nvidia/nemotron-3-ultra-550b-a55b",
  temperature: 0.6,
  maxTokens: 1500,
  apiKey: process.env.NVIDIA_API_KEY,
  maxRetries: 4,        // langchain will retry on 429/5xx with backoff
  timeout: 30_000,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Trip planner needs more tokens for full itineraries
export const tripLLM = new ChatOpenAI({
  model: "nvidia/nemotron-3-ultra-550b-a55b",
  temperature: 0.6,
  maxTokens: 3000,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// ── Embedding model (NVIDIA nemotron-3-embed-1b) ────────────────────────────
// Used by the RAG retriever — NOT the chat models.

const nvidiaEmbeddingClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

/**
 * @param {string} text
 * @param {"query"|"passage"} inputType - "query" when embedding a search
 *   query, "passage" when embedding a document being indexed.
 */
export const embedText = async (text, inputType = "query") => {
  const response = await nvidiaEmbeddingClient.embeddings.create({
    model: "nvidia/nemotron-3-embed-1b",
    input: text.slice(0, 8000),
    input_type: inputType,
    encoding_format: "float",
  });

  let embedding = response.data[0].embedding;
  if (embedding.length > 1024) {
    embedding = embedding.slice(0, 1024);
  }
  return embedding;
};