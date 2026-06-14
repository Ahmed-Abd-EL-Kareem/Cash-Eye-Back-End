// debug-pinecone.js — run with: node debug-pinecone.js
// Place this in your project root

// import "../src/config/env.js"; // adjust path if needed
import { Pinecone } from "@pinecone-database/pinecone";

const INDEX_NAME = "rahal";
const API_KEY = "pcsk_3vjWoJ_2UdTE2auWr5JhYESHMFgytfG65JitEEcq3FjTBMkDXQ9y8jTpZzXfhpfT2kvJv6";

console.log("=== Pinecone Debug ===");
console.log("API_KEY set:", !!API_KEY);
console.log("INDEX_NAME:", INDEX_NAME);

const pc = new Pinecone({ apiKey: API_KEY });

// Step 1: List all indexes
console.log("\n[1] Listing all indexes...");
const list = await pc.listIndexes();
console.log("Indexes:", JSON.stringify(list, null, 2));

// Step 2: Describe the specific index
console.log(`\n[2] Describing index "${INDEX_NAME}"...`);
try {
  const desc = await pc.describeIndex(INDEX_NAME);
  console.log("Description:", JSON.stringify(desc, null, 2));
  console.log("Host:", desc.host);
} catch (err) {
  console.error("describeIndex failed:", err.message);
}

// Step 3: Try a minimal upsert with a fake 1024-dim vector
console.log("\n[3] Testing upsert with dummy vector...");
try {
  const index = pc.index(INDEX_NAME);
  console.log("Index object created");

  const dummyVector = Array(1024).fill(0.1);
  const records = [
    {
      id: "test-vector-001",
      values: dummyVector,
      metadata: { text: "test", city: "Cairo" },
    },
  ];

  console.log("Upserting 1 record...");
  const result = await index.upsert(records);
  console.log("✅ Upsert success:", result);
} catch (err) {
  console.error("❌ Upsert failed:", err.message);
  console.error("Full error:", JSON.stringify(err, null, 2));
}
