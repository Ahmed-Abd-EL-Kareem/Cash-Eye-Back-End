import mongoose from "mongoose";
import { Types } from "mongoose";

const bookedRoomSchema = new mongoose.Schema(
  {
    room: {
      type: Types.ObjectId,
      required: true,
    },
    roomType: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    guests: {
      adults: {
        type: Number,
        required: true,
        min: 1,
      },
      children: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    hotel: {
      type: Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    trip: {
      type: Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },

    rooms: {
      type: [bookedRoomSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one room must be booked",
      },
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["EGP", "USD"],
      default: "EGP",
    },

    status: {
      type: String,
      enum: ["held", "pending", "confirmed", "canceled", "completed", "expired"],
      default: "held",
    },

    expiresAt: {
      type: Date,
    },

    stripeCheckoutSessionId: {
      type: String,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: { type: String },
    amountPaid: { type: Number, default: 0 },
    paidAt: { type: Date },
    failureReason: { type: String },

    specialRequests: { type: String, default: null },
    canceledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

bookingSchema.index({ hotel: 1, "rooms.room": 1, checkIn: 1, checkOut: 1, status: 1 });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ paymentStatus: 1 });

const BookingModel = mongoose.model("Booking", bookingSchema);

export default BookingModel;