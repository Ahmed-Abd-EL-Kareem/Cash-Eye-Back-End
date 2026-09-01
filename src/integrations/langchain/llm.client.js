// llm.client.js
// Centralised LangChain LLM / embedding instances.
// All agents import from here — swap models in one place.

import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

if (!process.env.NVIDIA_API_KEY && !process.env.OPENAI_API_KEY) {
  logger.warn("[LLM] Neither NVIDIA_API_KEY nor OPENAI_API_KEY set — AI features will fail");
}

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

// Active, verified production models on NVIDIA NIM (integrate.api.nvidia.com)
const DEFAULT_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_STRUCTURED_MODEL = process.env.NVIDIA_STRUCTURED_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_BOOKING_MODEL = process.env.NVIDIA_BOOKING_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_TRIP_MODEL = process.env.NVIDIA_TRIP_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

// ── Chat model (NVIDIA NIM endpoint, OpenAI-compatible) ──────────────────────────
export const chatLLM = new ChatOpenAI({
  model: DEFAULT_CHAT_MODEL,
  temperature: 0.5,
  maxTokens: 1000,
  apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.NVIDIA_API_KEY ? NVIDIA_BASE_URL : undefined,
  },
});

// Stricter variant for structured-output agents (field extraction / JSON parsing)
export const structuredLLM = new ChatOpenAI({
  model: DEFAULT_STRUCTURED_MODEL,
  temperature: 0.2,
  maxTokens: 1500,
  apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.NVIDIA_API_KEY ? NVIDIA_BASE_URL : undefined,
  },
});

// Booking conversation agent
export const bookingLLM = new ChatOpenAI({
  model: DEFAULT_BOOKING_MODEL,
  temperature: 0.5,
  maxTokens: 2000,
  apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
  maxRetries: 4,
  timeout: 35_000,
  configuration: {
    baseURL: process.env.NVIDIA_API_KEY ? NVIDIA_BASE_URL : undefined,
  },
});

// Trip planner agent with token headroom for full itineraries
export const tripLLM = new ChatOpenAI({
  model: DEFAULT_TRIP_MODEL,
  temperature: 0.6,
  maxTokens: 3500,
  apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
  maxRetries: 4,
  timeout: 45_000,
  configuration: {
    baseURL: process.env.NVIDIA_API_KEY ? NVIDIA_BASE_URL : undefined,
  },
});

// ── Embedding model ─────────────────────────────────────────────────────────────
const nvidiaEmbeddingClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: NVIDIA_BASE_URL,
    })
  : null;

const openaiEmbeddingClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * @param {string} text
 * @param {"query"|"passage"} inputType - "query" when embedding a search
 *   query, "passage" when embedding a document being indexed.
 */
export const embedText = async (text, inputType = "query") => {
  // If OpenAI API key is available, use text-embedding-3-small (1024 dimensions)
  if (openaiEmbeddingClient) {
    try {
      const response = await openaiEmbeddingClient.embeddings.create({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
        dimensions: 1024,
      });
      return response.data[0].embedding;
    } catch (err) {
      logger.warn(`[Embeddings] OpenAI embedding failed (${err.message}), trying NVIDIA`);
    }
  }

  if (nvidiaEmbeddingClient) {
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
  }

  throw new Error("No embedding provider configured (NVIDIA_API_KEY or OPENAI_API_KEY required)");
};