// llm.client.js
// Centralised LangChain LLM / embedding instances.
// Exclusively configured for NVIDIA NIM (integrate.api.nvidia.com).

import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

if (!NVIDIA_API_KEY) {
  logger.warn("[LLM] NVIDIA_API_KEY is not set — AI features will fail");
}

const sanitizeBaseUrl = (url) => {
  const DEFAULT_URL = "https://integrate.api.nvidia.com/v1";
  if (!url || typeof url !== "string") return DEFAULT_URL;
  let trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
    logger.warn(
      `[LLM] NVIDIA_BASE_URL "${trimmed}" is not a valid URL. Using "${DEFAULT_URL}" instead.`
    );
    return DEFAULT_URL;
  }
  // Ensure the base URL ends with /v1
  if (!trimmed.endsWith("/v1")) {
    trimmed = `${trimmed}/v1`;
  }
  return trimmed;
};

const NVIDIA_BASE_URL = sanitizeBaseUrl(process.env.NVIDIA_BASE_URL);
const NVIDIA_EMBEDDING_BASE_URL = sanitizeBaseUrl(
  process.env.NVIDIA_EMBEDDING_BASE_URL || process.env.NVIDIA_BASE_URL
);
const NVIDIA_EMBEDDING_API_KEY = process.env.NVIDIA_EMBEDDING_API_KEY || NVIDIA_API_KEY;

// Active, verified production models on NVIDIA NIM (integrate.api.nvidia.com)
const DEFAULT_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_STRUCTURED_MODEL = process.env.NVIDIA_STRUCTURED_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_BOOKING_MODEL = process.env.NVIDIA_BOOKING_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const DEFAULT_TRIP_MODEL = process.env.NVIDIA_TRIP_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

// ── Chat model (NVIDIA NIM endpoint) ─────────────────────────────────────────
export const chatLLM = new ChatOpenAI({
  model: DEFAULT_CHAT_MODEL,
  temperature: 0.5,
  maxTokens: 1000,
  apiKey: NVIDIA_API_KEY,
  configuration: {
    baseURL: NVIDIA_BASE_URL,
  },
});

// Stricter variant for structured-output agents (field extraction / JSON parsing)
export const structuredLLM = new ChatOpenAI({
  model: DEFAULT_STRUCTURED_MODEL,
  temperature: 0.2,
  maxTokens: 1500,
  apiKey: NVIDIA_API_KEY,
  configuration: {
    baseURL: NVIDIA_BASE_URL,
  },
});

// Booking conversation agent
export const bookingLLM = new ChatOpenAI({
  model: DEFAULT_BOOKING_MODEL,
  temperature: 0.5,
  maxTokens: 2000,
  apiKey: NVIDIA_API_KEY,
  maxRetries: 4,
  timeout: 35_000,
  configuration: {
    baseURL: NVIDIA_BASE_URL,
  },
});

// Trip planner agent with token headroom for full itineraries
export const tripLLM = new ChatOpenAI({
  model: DEFAULT_TRIP_MODEL,
  temperature: 0.6,
  maxTokens: 3500,
  apiKey: NVIDIA_API_KEY,
  maxRetries: 4,
  timeout: 45_000,
  configuration: {
    baseURL: NVIDIA_BASE_URL,
  },
});

// ── NVIDIA Embedding Client ───────────────────────────────────────────────────
const nvidiaEmbeddingClient = NVIDIA_EMBEDDING_API_KEY
  ? new OpenAI({
      apiKey: NVIDIA_EMBEDDING_API_KEY,
      baseURL: NVIDIA_EMBEDDING_BASE_URL,
    })
  : null;

/**
 * @param {string} text
 * @param {"query"|"passage"} inputType - "query" when embedding a search
 *   query, "passage" when embedding a document being indexed.
 */
export const embedText = async (text, inputType = "query") => {
  if (!nvidiaEmbeddingClient) {
    throw new Error("NVIDIA_API_KEY is not configured for embeddings");
  }

  const configuredModel = (process.env.NVIDIA_EMBEDDING_MODEL || "").trim();
  const candidateModels = Array.from(
    new Set(
      [
        configuredModel,
        configuredModel && !configuredModel.includes("/")
          ? `nvidia/${configuredModel}`
          : null,
        "nvidia/llama-3.2-nv-embedqa-1b-v1",
        "nvidia/nemotron-3-embed-1b",
        "snowflake/arctic-embed-l",
        "nvidia/embed-qa-4",
        "nvidia/nv-embedqa-mistral-7b-v2",
        "baai/bge-m3",
      ].filter(Boolean)
    )
  );

  for (const model of candidateModels) {
    try {
      const response = await nvidiaEmbeddingClient.embeddings.create({
        model,
        input: text.slice(0, 8000),
        input_type: inputType,
        encoding_format: "float",
      });

      let embedding = response.data[0].embedding;
      if (embedding.length > 1024) {
        embedding = embedding.slice(0, 1024);
      }
      return embedding;
    } catch (err) {
      logger.warn(
        `[Embeddings] Model "${model}" failed (${err.message}), trying next candidate...`
      );
    }
  }

  throw new Error("All NVIDIA embedding models failed to generate embedding");
};