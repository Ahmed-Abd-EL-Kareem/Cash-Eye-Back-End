import { Index } from "@upstash/vector";
import logger from "./logger.js";

if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
  logger.warn("[Upstash] UPSTASH_VECTOR_REST_URL/TOKEN not set — RAG features will be skipped");
}

let index = null;

// Lazy init — mirrors the old getPinecone() pattern so the app still
// boots without Upstash env vars in dev.
export const getUpstashIndex = () => {
  if (!index && process.env.UPSTASH_VECTOR_REST_URL && process.env.UPSTASH_VECTOR_REST_TOKEN) {
    index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
  }
  return index;
};

export default getUpstashIndex;