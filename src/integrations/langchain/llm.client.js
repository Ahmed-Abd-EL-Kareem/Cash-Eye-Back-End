// llm.client.js
// Centralised LangChain LLM / embedding instances.
// All agents import from here — swap models in one place.

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
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
export const structuredLLM = new ChatOpenAI({
  model: "openai/gpt-oss-20b",
  temperature: 0.0,
  maxTokens: 400,
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});

// Booking agent uses Llama — keeps JSON compliance higher
export const bookingLLM = new ChatOpenAI({
  model: "moonshotai/kimi-k2.6",
  temperature: 0.2,
  maxTokens: 700,
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


// ── Embedding model (NVIDIA BAAI) ─────────────────────────────────────────────
// Used by the RAG retriever — NOT the chat models.
export const embeddings = new OpenAIEmbeddings({
  model: "baai/bge-m3",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
});
