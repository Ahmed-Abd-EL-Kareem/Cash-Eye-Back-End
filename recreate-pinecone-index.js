// scripts/recreate-pinecone-index.js
import { Pinecone } from "@pinecone-database/pinecone";


const pc = new Pinecone({ apiKey:"pcsk_3vjWoJ_2UdTE2auWr5JhYESHMFgytfG65JitEEcq3FjTBMkDXQ9y8jTpZzXfhpfT2kvJv6"  });
const INDEX_NAME = "rahal"; // must match your .env

const existing = await pc.listIndexes();
const exists = existing.indexes?.some((i) => i.name === INDEX_NAME);

if (exists) {
  console.log(`Deleting old index "${INDEX_NAME}"...`);
  await pc.deleteIndex(INDEX_NAME);
  await new Promise((r) => setTimeout(r, 8000)); // wait for deletion
}

await pc.createIndex({
  name: INDEX_NAME,
  dimension: 1024,       // ✅ baai/bge-large-en-v1.5 output size
  metric: "cosine",
  spec: {
    serverless: {
      cloud: "aws",
      region: "us-east-1", // change to match your Pinecone region
    },
  },
  waitUntilReady: true,
});

console.log("✅ Index recreated at 1024 dimensions. Now re-run your seeders.");
process.exit(0);