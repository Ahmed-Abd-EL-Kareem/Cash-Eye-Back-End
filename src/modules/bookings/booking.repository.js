import BookingModel from "./booking.model.js";
import { Types } from "mongoose";

export const getOccupiedUnitsForRoom = async (
  hotelId,
  roomId,
  checkIn,
  checkOut,
  session = null
) => {
  const pipeline = [
    {
      $match: {
        hotel: new Types.ObjectId(hotelId),
        status: { $in: ["held", "pending", "confirmed"] },
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      },
    },
    { $unwind: "$rooms" },
    { $match: { "rooms.room": new Types.ObjectId(roomId) } },
    { $group: { _id: null, occupiedUnits: { $sum: "$rooms.quantity" } } },
  ];

  const result = await BookingModel.aggregate(pipeline).session(session);
  return result[0]?.occupiedUnits || 0;
};

export const getAvailabilityForHotel = async (hotelId, checkIn, checkOut) => {
  const pipeline = [
    {
      $match: {
        hotel: new Types.ObjectId(hotelId),
        status: { $in: ["held", "pending", "confirmed"] },
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      },
    },
    { $unwind: "$rooms" },
    {
      $group: {
        _id: "$rooms.room",
        occupiedUnits: { $sum: "$rooms.quantity" },
      },
    },
  ];

  return BookingModel.aggregate(pipeline);
};

export const findHoldById = async (holdId, userId) => {
  return BookingModel.findOne({
    _id: holdId,
    user: userId,
    status: "held",
  }).populate("hotel", "name rooms");
};

export const findHoldByCheckoutSessionId = async (sessionId) => {
  return BookingModel.findOne({
    stripeCheckoutSessionId: sessionId,
    status: "held",
  });
};

export const confirmHold = async (holdId, paymentIntentId) => {
  return BookingModel.updateOne(
    { _id: holdId, status: "held" },
    {
      $set: {
        status: "confirmed",
        stripePaymentIntentId: paymentIntentId,
        paymentStatus: "succeeded",
        paidAt: new Date(),
      },
      $unset: { expiresAt: "" },
    }
  );
};

export const releaseHold = async (holdId) => {
  return BookingModel.deleteOne({ _id: holdId, status: "held" });
};

export const getBookingById = async (bookingId, userId) => {
  return BookingModel.findOne({ _id: bookingId, user: userId })
    .populate("hotel", "name city averagePricePerNight stars currency coverImage")
    .populate("trip", "title destination days");
};

export const getUserBookings = async (userId, query = {}) => {
  const { page = 1, limit = 10, sort = "-createdAt", status } = query;
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    BookingModel.find(filter)
      .populate("hotel", "name city averagePricePerNight stars coverImage")
      .populate("trip", "title destination")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    BookingModel.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const cancelBooking = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId });
  if (!booking) return null;

  if (booking.status === "canceled" || booking.status === "completed") {
    throw new Error("Cannot cancel this booking");
  }

  booking.status = "canceled";
  booking.canceledAt = new Date();
  await booking.save();
  return booking;
};