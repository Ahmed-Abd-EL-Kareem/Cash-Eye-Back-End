import mongoose from "mongoose";
import { BOOKING_STATUSES } from "../../utils/constants.js";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
    rooms: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "EGP"], default: "EGP" },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
    notes: { type: String },
  },
  { timestamps: true }
);

const BookingModel = mongoose.model("Booking", bookingSchema);
export default BookingModel;
