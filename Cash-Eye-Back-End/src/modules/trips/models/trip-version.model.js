import mongoose from "mongoose";

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// Trip Version Schema
// Stores a full itinerary snapshot on every meaningful change
// ─────────────────────────────────────────────

const TripVersionSchema = new Schema(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    // Sequential version number (1, 2, 3 …)
    version: {
      type: Number,
      required: true,
      min: 1,
    },

    // Full itinerary snapshot at this point in time
    itinerarySnapshot: {
      type: Schema.Types.Mixed,
      default: [],
    },

    // Human-readable description of what changed
    changesSummary: {
      type: String,
      maxlength: 500,
      default: "",
    },

    // Who triggered the save
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // "user" | "ai" | "system"
    source: {
      type: String,
      enum: ["user", "ai", "system"],
      default: "user",
    },

    // AI metadata snapshot (only relevant when source === "ai")
    aiMetadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index so lookups by tripId + version are fast
TripVersionSchema.index({ tripId: 1, version: -1 });

export default mongoose.model("TripVersion", TripVersionSchema);
