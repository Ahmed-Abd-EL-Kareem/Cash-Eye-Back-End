// // rag.retriever.js
// // LangChain-native RAG layer.
// // embedText()      — embed a string with NVIDIA BAAI/bge-m3
// // retrieveContext()— query Pinecone, return joined text chunks (or null)
// // upsertDocuments()— batch-write vectors (seeders keep calling this unchanged)
// // buildIndexText() — shared text serialiser for hotels and destinations
// //
// // Graceful degradation: when Pinecone is unavailable every function
// // returns null / false instead of crashing the request.

// import { getPinecone, PINECONE_INDEX } from "../../config/pinecone.js";
// import { embeddings } from "./llm.client.js";
// import logger from "../../config/logger.js";

// const MIN_SCORE = 0.45;

// // ─── Normalise Mongo _id (handles $oid wrappers from seed files) ─────────────
// export const normalizeDocId = (id) => {
//   if (id == null) return "";
//   if (typeof id === "object" && id.$oid) return String(id.$oid);
//   return String(id);
// };

// export const normalizeSeedDoc = (doc) => ({
//   ...doc,
//   _id: normalizeDocId(doc._id),
// });

// // ─── Embed a single string ────────────────────────────────────────────────────
// export const embedText = async (text) => {
//   const vectors = await embeddings.embedQuery(text.slice(0, 8000));
//   return vectors;
// };

// // ─── Retrieve relevant context chunks from Pinecone ──────────────────────────
// export const retrieveContext = async (query, topK = 5) => {
//   const pc = getPinecone();
//   if (!pc) return null;

//   try {
//     const desc = await pc.describeIndex(PINECONE_INDEX);
//     const index = pc.index(PINECONE_INDEX, desc.host);
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

//     return chunks.length ? chunks.join("\n\n---\n\n") : null;
//   } catch (err) {
//     if (err.message?.includes("404") || err.status === 404) {
//       logger.warn("[RAG] Pinecone index not ready — skipping RAG");
//       return null;
//     }
//     logger.error(`[RAG] Pinecone query failed: ${err.message}`);
//     return null;
//   }
// };

// // ─── Upsert documents into Pinecone (called by seeders) ──────────────────────
// export const upsertDocuments = async (docs) => {
//   const pc = getPinecone();
//   if (!pc) {
//     logger.warn("[RAG] Pinecone not configured — skipping upsert");
//     return false;
//   }

//   try {
//     const desc = await pc.describeIndex(PINECONE_INDEX);
//     const index = pc.index(PINECONE_INDEX, desc.host);
//     const records = [];

//     for (const doc of docs) {
//       const values = await embedText(doc.text);
//       await new Promise((r) => setTimeout(r, 200));

//       const isDestination = doc.id.startsWith("dest");
//       records.push({
//         id: doc.id || normalizeDocId(doc._id),
//         values,
//         metadata: isDestination
//           ? {
//               id: doc.metadata?.id || normalizeDocId(doc._id),
//               city: doc.metadata?.city || "",
//               category: doc.metadata?.category || "",
//               region: doc.metadata?.region || "",
//               slug: doc.metadata?.slug || "",
//               averageBudgetPerDay: doc.metadata?.averageBudgetPerDay || "",
//               name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
//               name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",
//               description_en: doc.metadata?.description?.en || doc.metadata?.description_en || "",
//               description_ar: doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
//               text: doc.text,
//             }
//           : {
//               id: doc.metadata?.id || normalizeDocId(doc._id),
//               city: doc.metadata?.city || "",
//               averagePricePerNight: doc.metadata?.averagePricePerNight || "",
//               stars: doc.metadata?.stars || "",
//               slug: doc.metadata?.slug || "",
//               currency: doc.metadata?.currency || "",
//               name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
//               name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",
//               description_en: doc.metadata?.description?.en || doc.metadata?.description_en || "",
//               description_ar: doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
//               text: doc.text,
//             },
//       });
//     }

//     if (!records.length) return false;
//     await index.upsert({ records });
//     logger.info(`[RAG] Upserted ${records.length} vectors`);
//     return true;
//   } catch (err) {
//     logger.error(`[RAG] Upsert failed: ${err.message}`);
//     return false;
//   }
// };

// // ─── Build plain-text blob for indexing ──────────────────────────────────────
// export const buildIndexText = (type, data) => {
//   if (type === "hotel") {
//     const amenities = data.amenities?.slice(0, 8).join(", ") || "N/A";
//     const roomTypes = data.rooms?.map((r) => r.type).join(", ") || "N/A";
//     return [
//       `Hotel: ${data.name?.en || data.name}`,
//       data.name?.ar ? `Arabic name: ${data.name.ar}` : "",
//       `City: ${data.city}`,
//       `Stars: ${data.stars}/5`,
//       `Price per night: ${data.currency || "EGP"} ${data.averagePricePerNight}`,
//       `Room types: ${roomTypes}`,
//       `Amenities: ${amenities}`,
//       data.description?.en ? `Description: ${data.description.en}` : "",
//     ]
//       .filter(Boolean)
//       .join(". ");
//   }

//   if (type === "destination") {
//     const attractions =
//       data.attractions
//         ?.slice(0, 5)
//         .map((a) => a.name?.en || a.name)
//         .join(", ") || "";
//     return [
//       `Destination: ${data.name?.en || data.name}`,
//       `City: ${data.city}`,
//       `Region: ${data.region || "Egypt"}`,
//       `Category: ${data.category}`,
//       `Description: ${data.description?.en || data.description}`,
//       attractions ? `Key attractions: ${attractions}` : "",
//       data.bestMonths?.length ? `Best months: ${data.bestMonths.join(", ")}` : "",
//       `Average budget per day: EGP ${data.averageBudgetPerDay}`,
//     ]
//       .filter(Boolean)
//       .join(". ");
//   }

//   return "";
// };

// export const buildHotelIndexDoc = (doc) => {
//   const id = normalizeDocId(doc._id);
//   return {
//     id: `hotel_${id}`,
//     text: buildIndexText("hotel", doc),
//     metadata: {
//       id,
//       city: doc.city,
//       averagePricePerNight: doc.averagePricePerNight,
//       currency: doc.currency,
//       stars: doc.stars,
//       slug: doc.slug || "",
//       name_en: doc.name?.en || "",
//       name_ar: doc.name?.ar || "",
//       description_en: doc.description?.en || "",
//       description_ar: doc.description?.ar || "",
//     },
//   };
// };

// export const buildDestinationIndexDoc = (doc) => {
//   const id = normalizeDocId(doc._id);
//   return {
//     id: `dest_${id}`,
//     text: buildIndexText("destination", doc),
//     metadata: {
//       id,
//       city: doc.city,
//       region: doc.region || "",
//       category: doc.category || "",
//       slug: doc.slug || "",
//       name_en: doc.name?.en || "",
//       name_ar: doc.name?.ar || "",
//       averageBudgetPerDay: doc.averageBudgetPerDay || "",
//       currency: doc.currency || "",
//       description_en: doc.description?.en || "",
//       description_ar: doc.description?.ar || "",
//     },
//   };
// };

// export const indexHotel = (doc) => upsertDocuments([buildHotelIndexDoc(doc)]);
// export const indexDestination = (doc) => upsertDocuments([buildDestinationIndexDoc(doc)]);
// ! UPSTASH

// rag.retriever.js
// LangChain-native RAG layer, now backed by Upstash Vector + NVIDIA nv-embedqa-e5-v5.
//
// embedText()      — imported from llm.client.js (query vs passage aware)
// retrieveContext()— query Upstash, return joined text chunks (or null)
// upsertDocuments()— batch-write vectors (seeders keep calling this unchanged)
// buildIndexText() — shared text serialiser for hotels and destinations
//
// Graceful degradation: when Upstash is unavailable every function
// returns null / false instead of crashing the request.

import { getUpstashIndex } from "../../config/upstash.js";
import { embedText } from "./llm.client.js";
import logger from "../../config/logger.js";

// Cosine similarity on Upstash typically ranges higher than Pinecone's
// dot-product scores for well-matched content — re-tune this after you
// reseed and see real scores in your logs.
const MIN_SCORE = 0.35;

// ─── Normalise Mongo _id (handles $oid wrappers from seed files) ─────────────
export const normalizeDocId = (id) => {
  if (id == null) return "";
  if (typeof id === "object" && id.$oid) return String(id.$oid);
  return String(id);
};

export const normalizeSeedDoc = (doc) => ({
  ...doc,
  _id: normalizeDocId(doc._id),
});

// ─── Retrieve relevant context chunks from Upstash ───────────────────────────
export const retrieveContext = async (query, topK = 5) => {
  const index = getUpstashIndex();
  if (!index) return null;

  try {
    let queryVector;
    try {
      queryVector = await embedText(query, "query");
    } catch (embedErr) {
      logger.error(`[RAG] Embedding failed: ${embedErr.message}`);
      return null;
    }

    const result = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    if (!result?.length) return null;

    logger.info(`[RAG] Upstash returned ${result.length} matches. Top score: ${result[0]?.score?.toFixed(3)} (threshold: ${MIN_SCORE})`);

    const chunks = result
      .filter((m) => m.score >= MIN_SCORE)
      .map((m) => m.metadata?.text || "")
      .filter(Boolean);

    return chunks.length ? chunks.join("\n\n---\n\n") : null;
  } catch (err) {
    logger.error(`[RAG] Upstash query failed: ${err.message}`);
    return null;
  }
};

// ─── Upsert documents into Upstash (called by seeders) ───────────────────────
// docs: Array<{ id: string, text: string, metadata: object }>
export const upsertDocuments = async (docs) => {
  const index = getUpstashIndex();
  if (!index) {
    logger.warn("[RAG] Upstash not configured — skipping upsert");
    return false;
  }

  try {
    const vectors = [];

    for (const doc of docs) {
      const vector = await embedText(doc.text, "passage");
      await new Promise((r) => setTimeout(r, 100)); // gentle rate limiting

      const isDestination = doc.id.startsWith("dest");
      vectors.push({
        id: doc.id || normalizeDocId(doc._id),
        vector,
        metadata: isDestination
          ? {
            id: doc.metadata?.id || normalizeDocId(doc._id),
            city: doc.metadata?.city || "",
            category: doc.metadata?.category || "",
            region: doc.metadata?.region || "",
            slug: doc.metadata?.slug || "",
            averageBudgetPerDay: doc.metadata?.averageBudgetPerDay || "",
            name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
            name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",
            description_en: doc.metadata?.description?.en || doc.metadata?.description_en || "",
            description_ar: doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
            text: doc.text,
          }
          : {
            id: doc.metadata?.id || normalizeDocId(doc._id),
            city: doc.metadata?.city || "",
            averagePricePerNight: doc.metadata?.averagePricePerNight || "",
            stars: doc.metadata?.stars || "",
            slug: doc.metadata?.slug || "",
            currency: doc.metadata?.currency || "",
            name_en: doc.metadata?.name?.en || doc.metadata?.name_en || "",
            name_ar: doc.metadata?.name?.ar || doc.metadata?.name_ar || "",
            description_en: doc.metadata?.description?.en || doc.metadata?.description_en || "",
            description_ar: doc.metadata?.description?.ar || doc.metadata?.description_ar || "",
            text: doc.text,
          },
      });
    }

    if (!vectors.length) return false;

    // Upstash accepts a single object or an array — batch upsert here.
    await index.upsert(vectors);
    logger.info(`[RAG] Upserted ${vectors.length} vectors to Upstash`);
    return true;
  } catch (err) {
    logger.error(`[RAG] Upsert failed: ${err.message}`);
    return false;
  }
};

// ─── Build plain-text blob for indexing (unchanged) ──────────────────────────
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
    ]
      .filter(Boolean)
      .join(". ");
  }

  if (type === "destination") {
    const attractions =
      data.attractions
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
      data.bestMonths?.length ? `Best months: ${data.bestMonths.join(", ")}` : "",
      `Average budget per day: EGP ${data.averageBudgetPerDay}`,
    ]
      .filter(Boolean)
      .join(". ");
  }

  return "";
};

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

export const indexHotel = (doc) => upsertDocuments([buildHotelIndexDoc(doc)]);
export const indexDestination = (doc) => upsertDocuments([buildDestinationIndexDoc(doc)]);

// ─── Remove documents from Upstash by id ─────────────────────────────────────
// ids: Array<string> — full vector ids, e.g. ["hotel_507f...", "dest_507f..."]
export const deleteDocuments = async (ids = []) => {
  const index = getUpstashIndex();
  if (!index) {
    logger.warn("[RAG] Upstash not configured — skipping delete");
    return false;
  }
  if (!ids.length) return false;

  try {
    await index.delete(ids);
    logger.info(`[RAG] Deleted ${ids.length} vector(s) from Upstash: ${ids.join(", ")}`);
    return true;
  } catch (err) {
    logger.error(`[RAG] Delete failed: ${err.message}`);
    return false;
  }
};

export const removeHotelIndex = (id) => deleteDocuments([`hotel_${normalizeDocId(id)}`]);
export const removeDestinationIndex = (id) => deleteDocuments([`dest_${normalizeDocId(id)}`]);