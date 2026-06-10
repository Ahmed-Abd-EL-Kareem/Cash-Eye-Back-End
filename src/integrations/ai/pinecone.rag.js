// RAG engine — three responsibilities:
//   1. embedText()        → text → 1536-dim vector via OpenAI
//   2. upsertDocuments()  → batch-write vectors to Pinecone (used in seeder)
//   3. retrieveContext()  → query Pinecone, return top-k relevant text chunks
//
// If Pinecone is not configured the functions degrade gracefully:
//   - upsertDocuments() logs a warning and returns without crashing
//   - retrieveContext() returns null so prompts work without RAG context

// import openai from "./openai.client.js";
import { embeddingClient } from "./openai.client.js";
import { getPinecone, PINECONE_INDEX } from "../../config/pinecone.js";
// import logger from "../../config/logger.js";

// const EMBED_MODEL = "text-embedding-3-small"; // 1536 dimensions, fast + cheap
// ─── Embed a text string ──────────────────────────────────────────────────────
// import { embeddingClient } from "./openai.client.js";
// import { getPinecone, PINECONE_INDEX } from "../../config/pinecone.js";
import logger from "../../config/logger.js";

const EMBED_MODEL = "text-embedding-3-small";

export const normalizeDocId = (id) => {
  if (id == null) return "";
  if (typeof id === "object" && id.$oid) return String(id.$oid);
  return String(id);
};

export const normalizeSeedDoc = (doc) => ({
  ...doc,
  _id: normalizeDocId(doc._id),
});

// export const embedText = async (text) => {
//   const response = await openai.embeddings.create({
//     model: EMBED_MODEL,
//     input: text.slice(0, 8000),
//   });
//   return response.data[0].embedding;
// };
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
      docs.map(async (doc) => (
        // console.log(doc.id)
        // console.log(doc.id.startsWith("dest"))
        (doc.id.startsWith("dest"))? {
          id: doc.id || normalizeDocId(doc._id),
          values: await embedText(doc.text),
          metadata: {
            id: doc.metadata?.id || normalizeDocId(doc._id),
            city: doc.metadata?.city || "",
            category: doc.metadata?.category || "",
            region: doc.metadata?.region || "",
            slug: doc.metadata?.slug || "",
            averageBudgetPerDay: doc.metadata?.averageBudgetPerDay ||"",
            name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
            name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",
  
            description_en:
              doc.metadata?.description?.en || doc.metadata?.description_en || "",
            description_ar:
              doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
            text: doc.text,
          },
        }
        :{
        id: doc.id || normalizeDocId(doc._id),
        values: await embedText(doc.text),
        metadata: {
          id: doc.metadata?.id || normalizeDocId(doc._id),
          city: doc.metadata?.city || "",
          averagePricePerNight: doc.metadata?.averagePricePerNight || "",
          stars: doc.metadata?.stars || "",
          slug: doc.metadata?.slug || "",
          currency: doc.metadata?.currency||"",
          name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
          name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",

          description_en:
            doc.metadata?.description?.en || doc.metadata?.description_en || "",
          description_ar:
            doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
          text: doc.text,
        },
      }

    )
    )
      // docs.map(async (doc) => ({
      //   id: doc.id || normalizeDocId(doc._id),
      //   values: await embedText(doc.text),
      //   metadata: {
      //     id: doc.metadata?.id || normalizeDocId(doc._id),
      //     city: doc.metadata?.city || "",
      //     category: doc.metadata?.category || "",
      //     region: doc.metadata?.region || "",
      //     slug: doc.metadata?.slug || "",

      //     name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
      //     name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",

      //     description_en:
      //       doc.metadata?.description?.en || doc.metadata?.description_en || "",
      //     description_ar:
      //       doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
      //     text: doc.text,
      //   },
      // }))
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
export const buildHotelIndexDoc = (doc) => {
  const id = normalizeDocId(doc._id);
  return {
    id: `hotel_${id}`,
    text: buildIndexText("hotel", doc),
    metadata: {
      id,
      city: doc.city,
      averagePricePerNight: doc.averagePricePerNight,
      currency: doc.currency,
      stars: doc.stars,
      slug: doc.slug || "",
      name_en: doc.name?.en || "",
      name_ar: doc.name?.ar || "",
      description_en: doc.description?.en || "",
      description_ar: doc.description?.ar || "",
    },
  };
};

export const buildDestinationIndexDoc = (doc) => {
  const id = normalizeDocId(doc._id);
  return {
    id: `dest_${id}`,
    text: buildIndexText("destination", doc),
    metadata: {
      id,
      city: doc.city,
      region: doc.region || "",
      category: doc.category || "",
      slug: doc.slug || "",
      name_en: doc.name?.en || "",
      name_ar: doc.name?.ar || "",
      averageBudgetPerDay: doc.averageBudgetPerDay || "",
      currency: doc.currency || "",
      description_en: doc.description?.en || "",
      description_ar: doc.description?.ar || "",
    },
  };
};

export const indexHotel = async (doc) =>
  upsertDocuments([buildHotelIndexDoc(doc)]);

export const indexDestination = async (doc) =>
  upsertDocuments([buildDestinationIndexDoc(doc)]);

export const buildIndexText = (type, data) => {
  if (type === "hotel") {
    const amenities = data.amenities?.slice(0, 8).join(", ") || "N/A";
    const roomTypes = data.rooms?.map((r) => r.type).join(", ") || "N/A";
    return [
      `Hotel: ${data.name?.en || data.name}`,
      data.name?.ar ? `Arabic name: ${data.name.ar}` : "",
      `City: ${data.city}`,
      `Stars: ${data.stars}/5`,
      `Price per night: ${data.currency || "EGP"} ${data.averagePricePerNight}`,
      `Room types: ${roomTypes}`,
      `Amenities: ${amenities}`,
      data.description?.en ? `Description: ${data.description.en}` : "",
    ].filter(Boolean).join(". ");
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