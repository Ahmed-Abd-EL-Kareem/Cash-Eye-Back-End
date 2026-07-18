import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    step: {
      type: String,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const bookingConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: [messageSchema],
    slots: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // slots: {
    //   destination: String,
    //   checkIn: Date,
    //   checkOut: Date,
    //   guests: Number,
    //   rooms: Number,
    //   budgetPerNight: Number,
    //   paymentMethod: String,
    //   hotelId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Hotel",
    //   },
    // },
    step: {
      type: String,
      default: "destination",
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  { timestamps: true }
);

bookingConversationSchema.index({ user: 1, updatedAt: -1 });

export const BookingConversation = mongoose.model(
  "BookingConversation",
  bookingConversationSchema
);