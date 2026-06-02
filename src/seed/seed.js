import "../config/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import pinecone from "../config/pinecone.js";
import asyncHandler from "../utils/asyncHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Embeddings client ────────────────────────────────────
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small",
});

// ─── Helper: قسّم array لـ batches ───────────────────────
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// ─── Helper: قرا CSV وحوّله لـ array ─────────────────────
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
};

// ─── 1. تحضير documents الفنادق ──────────────────────────
const prepareHotelDocs = async () => {
  console.log("📦 Reading hotels CSV...");

  const csvPath = path.join(__dirname, "../../Data/Egypt_hotels_data.csv");
  const rows = await readCSV(csvPath);

  const docs = rows.map((row, i) => {
    const pageContent = `
      Hotel: ${row["Name"] || ""}
      Type: ${row["Type"] || ""}
      Location: Egypt
      Rating: ${row["Overall Rating"] || ""}
      Amenities: ${row["Amenities"] || ""}
      Price per night: ${row["Rate per Night (Lowest)"] || ""}
      Essential Info: ${row["Essential Info"] || ""}
      Nearby Places: ${row["Nearby Places"] || ""}
    `.trim();

    return new Document({
      pageContent,
      metadata: {
        type: "hotel",
        name: row["Name"] || "",
        hotelType: row["Type"] || "",
        rating: row["Overall Rating"] || "",
        price: row["Rate per Night (Lowest)"] || "",
        amenities: (row["Amenities"] || "").substring(0, 500),
        lat: row["Latitude"] || "",
        lng: row["Longitude"] || "",
      },
    });
  });

  console.log(`✅ Prepared ${docs.length} hotel documents`);
  return docs;
};

// ─── 2. تحضير documents المعالم ──────────────────────────
const prepareLandmarkDocs = async () => {
  console.log("📦 Reading landmarks CSV...");

  const csvPath = path.join(__dirname, "../../Data/gldv2_info.csv");
  const rows = await readCSV(csvPath);

  // إزالة التكرارات بناءً على اسم المعلم
  const uniqueRows = Object.values(
    rows.reduce((acc, row) => {
      const name = row["name"] || "";
      if (name && !acc[name]) acc[name] = row;
      return acc;
    }, {})
  );

  const docs = uniqueRows.map((row) => {
    const cleanName = (row["name"] || "").replace(/_/g, " ");

    const pageContent = `
      Landmark: ${cleanName}
      Country: Egypt
      Image: ${row["url"] || ""}
    `.trim();

    return new Document({
      pageContent,
      metadata: {
        type: "landmark",
        name: cleanName,
        landmarkId: row["landmark_id"] || "",
        imageUrl: row["url"] || "",
      },
    });
  });

  console.log(`✅ Prepared ${docs.length} unique landmark documents`);
  return docs;
};

// ─── 3. رفع documents على Pinecone ───────────────────────
const upsertDocs = async (docs, namespace) => {
  console.log(`🚀 Uploading ${docs.length} docs to namespace: [${namespace}]`);

  const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX);

  // رفع على batches عشان متعدّيش OpenAI rate limit
  const batches = chunkArray(docs, 50);

  for (let i = 0; i < batches.length; i++) {
    await PineconeStore.fromDocuments(batches[i], embeddings, {
      pineconeIndex,
      namespace,
    });
    console.log(`   ↳ Batch ${i + 1}/${batches.length} uploaded`);
  }

  console.log(`✅ Done — namespace: [${namespace}]\n`);
};

// ─── Run ──────────────────────────────────────────────────
const run =asyncHandler( async () => {
  
    console.log("🌍 Rahal — Pinecone Seed (Langchain)\n");

    const hotelDocs = await prepareHotelDocs();
    await upsertDocs(hotelDocs, "hotels");

    const landmarkDocs = await prepareLandmarkDocs();
    await upsertDocs(landmarkDocs, "landmarks");

    console.log("🎉 All data uploaded to Pinecone successfully!");
    process.exit(0);
});

run();