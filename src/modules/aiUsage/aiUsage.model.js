import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    feature: {
      type: String,
      enum: [
        "chat",
        "bookingConversation",
        "hotelAiSearch",
        "recommendations",
        "tripPlanner",
      ],
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    requestCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound unique index: one document per user+feature+day
aiUsageSchema.index(
  { user: 1, feature: 1, date: 1 },
  { unique: true }
);

// Index for date range queries
aiUsageSchema.index({ date: 1 });
aiUsageSchema.index({ user: 1, date: -1 });
aiUsageSchema.index({ feature: 1, date: -1 });

const AIUsageModel = mongoose.model("AIUsage", aiUsageSchema);
export default AIUsageModel;