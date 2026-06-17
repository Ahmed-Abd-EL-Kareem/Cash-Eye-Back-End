import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    model: {
      type: String,
      required: [true, "Model name is required"],
      trim: true,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    responseTime: {
      type: Number, // In milliseconds
      required: [true, "Response time is required"],
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound index for querying user usage sorted by date
aiUsageSchema.index({ user: 1, createdAt: -1 });

// Single indexes for filtering and statistics
aiUsageSchema.index({ model: 1 });
aiUsageSchema.index({ success: 1 });
aiUsageSchema.index({ createdAt: -1 });

const AIUsageModel = mongoose.model("AIUsage", aiUsageSchema);
export default AIUsageModel;
