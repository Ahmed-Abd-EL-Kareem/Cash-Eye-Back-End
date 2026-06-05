import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "pro", "enterprise"],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: String,
    price: {
      monthly: { type: Number, required: true, default: 0 },
      yearly: { type: Number, default: 0 },
    },
    currency: {
      type: String,
      enum: ["usd", "egp"],
      default: "usd",
    },
    stripePriceId: {
      monthly: { type: String, default: null },
      yearly: { type: String, default: null },
    },
    limits: {
      tokensPerMonth: { type: Number, required: true },
      requestsPerDay: { type: Number, required: true },
      maxFileUploads: { type: Number, default: 0 },
      maxFileSizeMB: { type: Number, default: 0 },
      allowedModels: {
        type: [String],
        default: ["gpt-4o-mini"],
      },
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const PlanModel = mongoose.model("Plan", planSchema);

export default PlanModel;
