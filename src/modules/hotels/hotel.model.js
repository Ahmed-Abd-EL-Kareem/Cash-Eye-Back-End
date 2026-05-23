import mongoose from "mongoose";
import { HOTEL_CATEGORIES } from "../../utils/constants.js";

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "EGP"], default: "EGP" },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    amenities: [{ type: String }],
    category: { type: String, enum: HOTEL_CATEGORIES, default: "standard" },
    location: {
      address: String,
      lat: Number,
      lng: Number,
    },
    images: [{ type: String }],
    destinationSlug: { type: String },
  },
  { timestamps: true }
);

const HotelModel = mongoose.model("Hotel", hotelSchema);
export default HotelModel;
