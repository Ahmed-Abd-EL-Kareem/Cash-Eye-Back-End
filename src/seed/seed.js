// Master seed runner — runs in order, each seeder is idempotent (skips if data exists)
// Usage: npm run seed

import "../config/env.js";
import mongoose from "mongoose";
import { seedPlans } from "../modules/subscriptions/plan/plan.service.js";
import { seedDestinations } from "./destinations.seed.js";
import { seedHotels } from "./hotels.seed.js";
import logger from "../config/logger.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_DATABASE_URL);
  console.log("🔌 Connected to MongoDB");

  // await seedPlans();
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