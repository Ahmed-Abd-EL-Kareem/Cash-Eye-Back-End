import mongoose from "mongoose";
import { TRIP_STATUSES, CURRENCIES } from "../../utils/constants.js";

const itineraryDaySchema = new mongoose.Schema(
  {
    day: Number,
    title: String,
    activities: [String],
    estimatedCost: Number,
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    destination: { type: String, required: true },
    budget: { type: Number, required: true },
    currency: { type: String, enum: CURRENCIES, default: "EGP" },
    days: { type: Number, required: true, min: 1 },
    travelers: { type: Number, required: true, min: 1 },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    itinerary: [itineraryDaySchema],
    aiTips: [{ type: String }],
    totalEstimatedCost: { type: Number, default: 0 },
    status: { type: String, enum: TRIP_STATUSES, default: "draft" },
    language: { type: String, enum: ["en", "ar"], default: "en" },
  },
  { timestamps: true }
);

const TripModel = mongoose.model("Trip", tripSchema);
export default TripModel;
