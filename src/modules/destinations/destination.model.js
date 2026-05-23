import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    language: { type: String, enum: ["en", "ar"], default: "en" },
    attractions: [{ type: String }],
    bestMonths: [{ type: String }],
    averageBudgetPerDay: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "EGP"], default: "EGP" },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    images: [{ type: String }],
  },
  { timestamps: true }
);

const DestinationModel = mongoose.model("Destination", destinationSchema);
export default DestinationModel;
