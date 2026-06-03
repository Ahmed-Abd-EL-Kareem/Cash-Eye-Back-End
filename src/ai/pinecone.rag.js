// RAG engine — three responsibilities:
//   1. embedText()        → text → 1536-dim vector via OpenAI
//   2. upsertDocuments()  → batch-write vectors to Pinecone (used in seeder)
//   3. retrieveContext()  → query Pinecone, return top-k relevant text chunks
//
// If Pinecone is not configured the functions degrade gracefully:
//   - upsertDocuments() logs a warning and returns without crashing
//   - retrieveContext() returns null so prompts work without RAG context

// import openai from "./openai.client.js";
import { getPinecone, PINECONE_INDEX } from "../config/pinecone.js";
// import logger from "../config/logger.js";

// const EMBED_MODEL = "text-embedding-3-small"; // 1536 dimensions, fast + cheap
const MIN_SCORE = 0.45;                     // relevance threshold — lower = more noise

// ─── Embed a text string ──────────────────────────────────────────────────────
import { embeddingClient } from "./openai.client.js";
// import { getPinecone, PINECONE_INDEX } from "../config/pinecone.js";
import logger from "../config/logger.js";

const EMBED_MODEL = "text-embedding-3-small";

export const embedText = async (text) => {
  const response = await embeddingClient.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
};

// ─── Upsert documents into Pinecone ──────────────────────────────────────────
// docs: Array<{ id: string, text: string, metadata: object }>
// Called from the hotel and destination seeders.
// export const upsertDocuments = async (docs) => {
//   const pc = getPinecone();
//   if (!pc) {
//     console.log("[RAG] Pinecone not configured — skipping upsert");
//     return;
//   }

//   const index = pc.index(PINECONE_INDEX);

//   try {
//     // Embed all docs in parallel (OpenAI allows concurrent requests)
//     const vectors = await Promise.all(
//       docs.map(async (doc) => ({
//         id: doc.id,
//         values: await embedText(doc.text),
//         metadata: { ...doc.metadata, text: doc.text }, // store text for retrieval
//       }))
//     );
//     console.log(`[RAG] Upserting ${vectors.length} vectors to Pinecone...`);
//     await index.upsert(vectors);
//     console.log(`[RAG] Upserted ${vectors.length} vectors to Pinecone`);
//   } catch (error) {
//     // Don't crash if OpenAI is unavailable — just skip upsert
//     console.log(`[RAG] OpenAI/Pinecone unavailable — skipping upsert: ${error.message}`);
//   }
// };
export const upsertDocuments = async (docs) => {
  const pc = getPinecone();
  if (!pc) {
    console.log("[RAG] Pinecone not configured — skipping upsert");
    return false;
  }

  const index = pc.index(PINECONE_INDEX);

  try {
    const records = await Promise.all(
      docs.map(async (doc) => ({
        id: doc.id || doc._id?.toString(),
        values: await embedText(doc.text),
        metadata: {
          id: doc.id || doc._id?.toString(),
          city: doc.metadata?.city || "",
          category: doc.metadata?.category || "",
          region: doc.metadata?.region || "",
          slug: doc.metadata?.slug || "",

          name_en: doc.metadata?.name_en || "",
          name_ar: doc.metadata?.name_ar || "",

          description_en: doc.metadata?.description_en || "",
          description_ar: doc.metadata?.description_ar || "",
          text: doc.text,
        },
      }))
    );

    if (!records.length) {
      console.log("[RAG] No records to upsert");
      return false;
    }

    console.log(`[RAG] Upserting ${records.length} vectors to Pinecone...`);

    const result = await index.upsert({
      records,
    });

    console.log(`[RAG] Upsert successful`, result);
    return true;
  } catch (error) {
    console.log(`[RAG] OpenAI/Pinecone unavailable — skipping upsert: ${error.message}`);
    return false;
  }
};

// ─── Retrieve relevant context for a query ────────────────────────────────────
// Returns a single context string ready to inject into a prompt,
// or null if Pinecone is unavailable or no relevant results found.
// export const retrieveContext = async (query, topK = 5) => {
//   const pc = getPinecone();
//   if (!pc) return null; // graceful degradation — AI still works, just without RAG

//   try {
//     const index = pc.index(PINECONE_INDEX);
//     const queryVector = await embedText(query);

//     const result = await index.query({
//       vector: queryVector,
//       topK,
//       includeMetadata: true,
//     });

//     if (!result.matches?.length) return null;

//     const chunks = result.matches
//       .filter((m) => m.score >= MIN_SCORE)
//       .map((m) => m.metadata?.text || "")
//       .filter(Boolean);

//     if (!chunks.length) return null;

//     return chunks.join("\n\n---\n\n");
//   } catch (err) {
//     // Don't crash the request if Pinecone is down — just skip context
//     logger.error(`[RAG] Pinecone query failed: ${err.message}`);
//     return null;
//   }
// };
export const retrieveContext = async (query, topK = 5) => {
  const MIN_SCORE = 0.45; // ⬅️ move here (safe)

  const pc = getPinecone();
  if (!pc) return null;

  try {
    const index = pc.index(PINECONE_INDEX);
    const queryVector = await embedText(query);

    const result = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    if (!result.matches?.length) return null;

    const chunks = result.matches
      .filter((m) => m.score >= MIN_SCORE)
      .map((m) => m.metadata?.text || "")
      .filter(Boolean);

    if (!chunks.length) return null;

    return chunks.join("\n\n---\n\n");
  } catch (err) {
    logger.error(`[RAG] Pinecone query failed: ${err.message}`);
    return null;
  }
};
// ─── Build plain-text document for indexing ──────────────────────────────────
// Converts a hotel or destination document into a searchable text blob.
export const buildIndexText = (type, data) => {
  if (type === "hotel") {
    const amenities = data.amenities?.slice(0, 8).join(", ") || "N/A";
    return [
      `Hotel: ${data.name}`,
      `City: ${data.city}`,
      `Type: ${data.type || "hotel"}`,
      `Rating: ${data.rating}/5 (${data.reviews} reviews)`,
      `Price per night: EGP ${data.pricePerNight}`,
      `Location rating: ${data.locationRating}/5`,
      `Amenities: ${amenities}`,
    ].join(". ");
  }

  if (type === "destination") {
    const attractions = data.attractions
      ?.slice(0, 5)
      .map((a) => a.name?.en || a.name)
      .join(", ") || "";

    return [
      `Destination: ${data.name?.en || data.name}`,
      `City: ${data.city}`,
      `Region: ${data.region || "Egypt"}`,
      `Category: ${data.category}`,
      `Description: ${data.description?.en || data.description}`,
      attractions ? `Key attractions: ${attractions}` : "",
      data.bestMonths?.length ? `Best months to visit: ${data.bestMonths.join(", ")}` : "",
      `Average budget per day: EGP ${data.averageBudgetPerDay}`,
    ].filter(Boolean).join(". ");
  }

  return "";
};