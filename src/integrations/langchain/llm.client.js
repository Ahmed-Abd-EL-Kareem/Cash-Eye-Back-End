// llm.client.js
// Centralised LangChain LLM / embedding instances.
// Supports both Google Gemini and NVIDIA NIM via USE_GEMINI env var (true = Gemini, false = NVIDIA).
// Embeddings are exclusively on NVIDIA NIM as requested.

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import logger from "../../config/logger.js";

// ── Provider Toggle ──────────────────────────────────────────────────────────
// If USE_GEMINI is true / 1, use Google Gemini. If false / 0, use NVIDIA NIM.
export const USE_GEMINI =
  String(process.env.USE_GEMINI).trim().toLowerCase() === "true" ||
  process.env.USE_GEMINI === "1" ||
  String(process.env.USE_GEMINI_MODELS).trim().toLowerCase() === "true";

logger.info(
  `[LLM] Active AI provider for generative models: ${
    USE_GEMINI ? "Google Gemini" : "NVIDIA NIM"
  }`
);

// ── Google Gemini Configuration ──────────────────────────────────────────────
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

if (USE_GEMINI && !GEMINI_API_KEY) {
  logger.warn(
    "[LLM] USE_GEMINI is true but GEMINI_API_KEY is not set — AI chat, booking, and trip features will fail"
  );
}

const safeGeminiKey = GEMINI_API_KEY || "missing-gemini-api-key";

const sanitizeGeminiModel = (modelName) => {
  const DEFAULT_MODEL = "gemini-3.6-flash";
  if (!modelName || typeof modelName !== "string") return DEFAULT_MODEL;
  const trimmed = modelName.trim();
  const lower = trimmed.toLowerCase();

  // Auto-upgrade deprecated/unavailable models reported by Google
  if (
    lower === "gemini-2.5-flash" ||
    lower === "gemini-2.0-flash" ||
    lower === "gemini-1.5-flash" ||
    lower === "gemini-1.5-pro"
  ) {
    return DEFAULT_MODEL;
  }

  return trimmed;
};

// ── NVIDIA NIM Configuration ─────────────────────────────────────────────────
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

const NVIDIA_BASE_URL = sanitizeBaseUrl(process.env.NVIDIA_BASE_URL);
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

if (!USE_GEMINI && !NVIDIA_API_KEY) {
  logger.warn(
    "[LLM] USE_GEMINI is false but NVIDIA_API_KEY is not set — AI chat, booking, and trip features will fail"
  );
}

const safeNvidiaKey = NVIDIA_API_KEY || "missing-nvidia-api-key";

// ── Model Selection (Configurable per provider) ──────────────────────────────
const GEMINI_DEFAULT_MODEL = sanitizeGeminiModel(process.env.GEMINI_CHAT_MODEL);
const NVIDIA_DEFAULT_MODEL =
  process.env.NVIDIA_CHAT_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

const createLLM = ({
  geminiModel,
  nvidiaModel,
  temperature = 0.5,
  maxTokens = 1500,
  timeout = 25000,
}) => {
  if (USE_GEMINI) {
    return new ChatGoogleGenerativeAI({
      model: sanitizeGeminiModel(geminiModel || GEMINI_DEFAULT_MODEL),
      temperature,
      maxOutputTokens: maxTokens,
      apiKey: safeGeminiKey,
      maxRetries: 0,
    });
  }

  return new ChatOpenAI({
    model: nvidiaModel || NVIDIA_DEFAULT_MODEL,
    temperature,
    maxTokens,
    apiKey: safeNvidiaKey,
    maxRetries: 0,
    timeout,
    configuration: {
      baseURL: NVIDIA_BASE_URL,
    },
  });
};

// ── Shared Agent LLM Instances ───────────────────────────────────────────────
export const chatLLM = createLLM({
  geminiModel: process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
  nvidiaModel: process.env.NVIDIA_CHAT_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct",
  temperature: 0.5,
  maxTokens: 1200,
  timeout: 20000,
});

export const structuredLLM = createLLM({
  geminiModel: process.env.GEMINI_STRUCTURED_MODEL || "gemini-3.6-flash",
  nvidiaModel:
    process.env.NVIDIA_STRUCTURED_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct",
  temperature: 0.2,
  maxTokens: 1500,
  timeout: 20000,
});

export const bookingLLM = createLLM({
  geminiModel: process.env.GEMINI_BOOKING_MODEL || "gemini-3.6-flash",
  nvidiaModel: process.env.NVIDIA_BOOKING_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct",
  temperature: 0.5,
  maxTokens: 1800,
  timeout: 22000,
});

export const tripLLM = createLLM({
  geminiModel: process.env.GEMINI_TRIP_MODEL || "gemini-3.6-flash",
  nvidiaModel: process.env.NVIDIA_TRIP_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct",
  temperature: 0.6,
  maxTokens: 2500,
  timeout: 25000,
});

// Candidate models for trip planning failover
const candidateGeminiModels = Array.from(
  new Set(
    [
      process.env.GEMINI_TRIP_MODEL,
      "gemini-3.6-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-002",
      "gemini-2.0-flash-001",
    ]
      .map(sanitizeGeminiModel)
      .filter(Boolean)
  )
);

const candidateNvidiaModels = Array.from(
  new Set(
    [
      process.env.NVIDIA_TRIP_MODEL,
      "deepseek-ai/deepseek-v4-flash-0731",
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-large-2-instruct",
    ].filter(Boolean)
  )
);

/**
 * Invokes LLM for trip generation with automatic failover and strict 22s timeout.
 * @param {Array} messages - LangChain messages array
 */
export const invokeTripPlanner = async (messages) => {
  const candidates = USE_GEMINI ? candidateGeminiModels : candidateNvidiaModels;
  let lastError = null;

  for (const model of candidates) {
    try {
      logger.info(
        `[TripPlanner] Invoking ${
          USE_GEMINI ? "Gemini" : "NVIDIA"
        } model "${model}"...`
      );

      const llm = USE_GEMINI
        ? new ChatGoogleGenerativeAI({
            model,
            temperature: 0.6,
            maxOutputTokens: 2500,
            apiKey: safeGeminiKey,
            maxRetries: 0,
          })
        : new ChatOpenAI({
            model,
            temperature: 0.6,
            maxTokens: 2500,
            apiKey: safeNvidiaKey,
            maxRetries: 0,
            timeout: 22000,
            configuration: {
              baseURL: NVIDIA_BASE_URL,
            },
          });

      // Strict 22-second timeout per model so total request stays under 30s
      const invocationPromise = llm.invoke(messages);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Model "${model}" timed out after 22 seconds`)),
          22000
        )
      );

      const response = await Promise.race([invocationPromise, timeoutPromise]);
      logger.info(`[TripPlanner] Invocation succeeded with model "${model}"`);
      return response;
    } catch (err) {
      lastError = err;
      logger.warn(
        `[TripPlanner] Model "${model}" failed or timed out (${err.message}), trying next candidate...`
      );
    }
  }

  throw (
    lastError ||
    new Error("All candidate trip models failed to generate response within 30 seconds")
  );
};

// ── NVIDIA Embedding Client ───────────────────────────────────────────────────
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