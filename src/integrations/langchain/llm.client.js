// llm.client.js
// Centralised LangChain LLM / embedding instances.
// Generative Chat, Trip Planner & Booking: Google Gemini (via @langchain/google-genai)
// Vector Embeddings: NVIDIA NIM Embeddings

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

// ── Google Gemini Configuration ──────────────────────────────────────────────
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn("[LLM] GEMINI_API_KEY is not set — AI chat, booking, and trip features will fail");
}

const safeApiKey = GEMINI_API_KEY || "missing-gemini-api-key";

const DEFAULT_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash";
const DEFAULT_STRUCTURED_MODEL = process.env.GEMINI_STRUCTURED_MODEL || "gemini-3.6-flash";
const DEFAULT_BOOKING_MODEL = process.env.GEMINI_BOOKING_MODEL || "gemini-3.6-flash";
const DEFAULT_TRIP_MODEL = process.env.GEMINI_TRIP_MODEL || "gemini-3.6-flash";

// ── Chat model (Google Gemini) ───────────────────────────────────────────────
export const chatLLM = new ChatGoogleGenerativeAI({
  model: DEFAULT_CHAT_MODEL,
  temperature: 0.5,
  maxOutputTokens: 1500,
  apiKey: safeApiKey,
});

// Stricter variant for structured-output agents (field extraction / JSON parsing)
export const structuredLLM = new ChatGoogleGenerativeAI({
  model: DEFAULT_STRUCTURED_MODEL,
  temperature: 0.2,
  maxOutputTokens: 2000,
  apiKey: safeApiKey,
});

// Booking conversation agent
export const bookingLLM = new ChatGoogleGenerativeAI({
  model: DEFAULT_BOOKING_MODEL,
  temperature: 0.5,
  maxOutputTokens: 2500,
  apiKey: safeApiKey,
  maxRetries: 2,
});

// Trip planner agent with token headroom for full itineraries
export const tripLLM = new ChatGoogleGenerativeAI({
  model: DEFAULT_TRIP_MODEL,
  temperature: 0.6,
  maxOutputTokens: 4000,
  apiKey: safeApiKey,
  maxRetries: 1,
});

// Candidate Gemini models for trip planning failover
const candidateTripModels = Array.from(
  new Set(
    [
      DEFAULT_TRIP_MODEL,
      "gemini-3.6-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-001",
      "gemini-2.0-flash-001",
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro-002",
    ].filter(Boolean)
  )
);

/**
 * Invokes LLM for trip generation with automatic failover across active Gemini models.
 * @param {Array} messages - LangChain messages array
 */
export const invokeTripPlanner = async (messages) => {
  let lastError = null;

  for (const model of candidateTripModels) {
    try {
      logger.info(`[TripPlanner] Invoking Gemini model "${model}"...`);
      const llm = new ChatGoogleGenerativeAI({
        model,
        temperature: 0.6,
        maxOutputTokens: 4000,
        apiKey: safeApiKey,
        maxRetries: 0,
      });

      const response = await llm.invoke(messages);
      logger.info(`[TripPlanner] Invocation succeeded with Gemini model "${model}"`);
      return response;
    } catch (err) {
      lastError = err;
      logger.warn(
        `[TripPlanner] Gemini model "${model}" failed (${err.message}), trying next candidate...`
      );
    }
  }

  throw lastError || new Error("All candidate Gemini trip models failed to generate response");
};

// ── NVIDIA Embedding Client ───────────────────────────────────────────────────
const sanitizeBaseUrl = (url) => {
  const DEFAULT_URL = "https://integrate.api.nvidia.com/v1";
  if (!url || typeof url !== "string") return DEFAULT_URL;
  let trimmed = url.trim().replace(/\/+$/, "");

  // Strip endpoint suffixes if user pasted the full endpoint URL
  trimmed = trimmed.replace(/\/chat\/completions\/?$/i, "");
  trimmed = trimmed.replace(/\/embeddings\/?$/i, "");
  trimmed = trimmed.replace(/\/models\/?$/i, "");
  trimmed = trimmed.replace(/\/+$/, "");

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

const NVIDIA_EMBEDDING_BASE_URL = sanitizeBaseUrl(
  process.env.NVIDIA_EMBEDDING_BASE_URL ||
    process.env.NVIDIA_BASE_URL ||
    "https://integrate.api.nvidia.com/v1"
);
const NVIDIA_EMBEDDING_API_KEY =
  process.env.NVIDIA_EMBEDDING_API_KEY || process.env.NVIDIA_API_KEY;

if (!NVIDIA_EMBEDDING_API_KEY) {
  logger.warn(
    "[LLM] NVIDIA_EMBEDDING_API_KEY / NVIDIA_API_KEY is not set — embeddings will fail"
  );
}

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
    throw new Error("NVIDIA_EMBEDDING_API_KEY is not configured for embeddings");
  }

  const configuredModel = (process.env.NVIDIA_EMBEDDING_MODEL || "").trim();
  const candidateModels = Array.from(
    new Set(
      [
        configuredModel,
        configuredModel && !configuredModel.includes("/")
          ? `nvidia/${configuredModel}`
          : null,
        "nvidia/llama-nemotron-embed-vl-1b-v2",
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