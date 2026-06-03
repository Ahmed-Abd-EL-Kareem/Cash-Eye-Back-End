import mongoose from "mongoose";

// ─── Day sub-schema ───────────────────────────────────────────────────────────
// Embedded because days are always read together with the trip
// and never queried independently.
const daySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, default: null },
    activities: { type: [String], default: [] },
    meals: { type: [String], default: [] },
    accommodation: { type: String, default: null },
    tips: { type: String, default: null },
    estimatedCost: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Trip schema ──────────────────────────────────────────────────────────────
const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // AI-generated or manually saved
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },

    budget: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      default: "mid-range",
    },

    travelers: { type: Number, default: 1, min: 1 },
    interests: { type: [String], default: [] },

    // Itinerary from AI
    days: { type: [daySchema], default: [] },
    summary: { type: String, default: null },

    estimatedTotalCost: { type: Number, default: 0 },
    currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

    // Language the trip was generated in
    language: { type: String, enum: ["en", "ar"], default: "en" },

    status: {
      type: String,
      enum: ["draft", "saved", "archived"],
      default: "draft",
    },

    isAIGenerated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tripSchema.index({ user: 1, createdAt: -1 });
tripSchema.index({ destination: 1, status: 1 });

const TripModel = mongoose.model("Trip", tripSchema);
export default TripModel;