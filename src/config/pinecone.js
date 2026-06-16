import { Pinecone } from "@pinecone-database/pinecone";
import logger from "./logger.js";

if (!process.env.PINECONE_API_KEY) {
  logger.warn("[Pinecone] PINECONE_API_KEY is not set — RAG features will be skipped");
}

let pinecone = null;

// Lazy init — only instantiate when actually needed
// so the app still boots without PINECONE_API_KEY in dev
export const getPinecone = () => {
  if (!pinecone && process.env.PINECONE_API_KEY) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pinecone;
};

export const PINECONE_INDEX = process.env.PINECONE_INDEX || "rahal";

export default getPinecone;