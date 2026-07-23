import mongoose from "mongoose";

const aiLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    feature: {
      type: String,
      required: [true, "Feature is required"],
      enum: [
        "chat",
        "bookingConversation",
        "hotelAiSearch",
        "recommendations",
        "tripPlanner",
      ],
      index: true,
    },
    sessionId: {
      type: String,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    prompt: {
      type: String,
    },
    response: {
      type: String,
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
    latencyMs: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      default: "success",
      index: true,
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

// TTL index - auto-delete logs after 30 days (adjust as needed)
// aiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for common query patterns
aiLogSchema.index({ user: 1, createdAt: -1 });
aiLogSchema.index({ feature: 1, createdAt: -1 });
aiLogSchema.index({ status: 1, createdAt: -1 });
aiLogSchema.index({ sessionId: 1 });

const AILogModel = mongoose.model("AILog", aiLogSchema);
export default AILogModel;