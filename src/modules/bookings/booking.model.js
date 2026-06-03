import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, default: 1, min: 1 },
    rooms: { type: Number, default: 1, min: 1 },

    totalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled", "completed"],
      default: "pending",
    },

    specialRequests: { type: String, default: null },
    canceledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ hotel: 1, checkIn: 1, checkOut: 1 });

const BookingModel = mongoose.model("Booking", bookingSchema);
export default BookingModel;