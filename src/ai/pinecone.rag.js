import openai from "./openai.client.js";
import pinecone from "../config/pinecone.js";

const index = pinecone.index(process.env.PINECONE_INDEX);

export const searchKnowledge = async (question, namespace = "hotels") => {
  // ─── 1. حوّل السؤال لـ vector ────────────────────────
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });

  const vector = embeddingResponse.data[0].embedding;

  // ─── 2. دوّر في Pinecone ──────────────────────────────
  const results = await index.namespace(namespace).query({
    vector,
    topK: 5,
    includeMetadata: true,
  });

  // ─── 3. لو مفيش نتائج ────────────────────────────────
  if (!results.matches || results.matches.length === 0) {
    return [];
  }

  // ─── 4. رجّع النتائج ─────────────────────────────────
  return results.matches.map((match) => ({
    score: match.score,
    metadata: match.metadata,
  }));
};