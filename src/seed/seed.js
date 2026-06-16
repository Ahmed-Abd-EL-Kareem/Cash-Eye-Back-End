// Master seed runner
import "../config/env.js";
import mongoose from "mongoose";
import { Pinecone } from "@pinecone-database/pinecone";
import { seedDestinations } from "./destinations.seed.js";
import { seedHotels } from "./hotels.seed.js";

// ✅ Wait until Pinecone index is ready
const waitForPineconeIndex = async (indexName, maxWaitMs = 60000) => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const start = Date.now();

  console.log(`[Pinecone] Waiting for index "${indexName}" to be ready...`);

  while (Date.now() - start < maxWaitMs) {
    try {
      const description = await pc.describeIndex(indexName);
      if (description?.status?.ready === true) {
        console.log(`[Pinecone] ✅ Index "${indexName}" is ready`);
        return true;
      }
      console.log(`[Pinecone] Index status: ${description?.status?.state} — waiting...`);
    } catch (err) {
      console.log(`[Pinecone] Index not found yet: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 3000)); // poll every 3s
  }

  console.warn(`[Pinecone] ⚠️ Index not ready after ${maxWaitMs / 1000}s — seeding without RAG`);
  return false;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_DATABASE_URL);
  console.log("🔌 Connected to MongoDB");

  // Wait for Pinecone index before seeding
  await waitForPineconeIndex(process.env.PINECONE_INDEX);

  await seedHotels();
  await seedDestinations();

  console.log("✅ All seeds complete");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});