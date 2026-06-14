import BookingModel from "./booking.model.js";
import HotelModel from "../hotels/hotel.model.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";

// ─── Create booking ───────────────────────────────────────────────────────────
export const createBooking = async (userId, data) => {
  const hotel = await HotelModel.findById(data.hotel);
  if (!hotel || !hotel.isActive) throw new ApiError("Hotel not found", 404);

  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);

  if (checkIn < new Date()) throw new ApiError("checkIn must be a future date", 400);

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  if (nights <= 0) throw new ApiError("checkOut must be after checkIn", 400);

   const totalPrice = hotel.averagePricePerNight * nights * (data.rooms || 1);

  const booking = await BookingModel.create({
    user: userId,
    hotel: hotel._id,
    trip: data.trip || null,
    checkIn,
    checkOut,
    guests: data.guests || 1,
    rooms: data.rooms || 1,
    totalPrice,
    currency: hotel.currency,
    specialRequests: data.specialRequests || null,
  });

  return booking.populate([
    { path: "hotel", select: "name city averagePricePerNight stars currency coverImage" },
    { path: "trip", select: "title destination" },
  ]);
};

// ─── Get my bookings ──────────────────────────────────────────────────────────
export const getMyBookings = async (userId, query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find({ user: userId })
      .populate("hotel", "name city averagePricePerNight stars coverImage"),
    query
  ).filter().sort().paginate();

  const [bookings, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};

// ─── Get single booking (owner only) ─────────────────────────────────────────
export const getBookingById = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId })
    .populate("hotel")
    .populate("trip", "title destination days");

  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};

// ─── Cancel booking ───────────────────────────────────────────────────────────
export const cancelBooking = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId });
  if (!booking) throw new ApiError("Booking not found", 404);

  if (booking.status === "canceled")
    throw new ApiError("Booking is already canceled", 400);
  if (booking.status === "completed")
    throw new ApiError("Completed bookings cannot be canceled", 400);

  booking.status = "canceled";
  booking.canceledAt = new Date();
  await booking.save();
  return booking;
};

// ─── Admin: get all bookings ──────────────────────────────────────────────────
export const adminGetAllBookings = async (query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find()
      .populate("user", "name email")
      .populate("hotel", "name city"),
    query
  ).filter().sort().paginate();

  const [bookings, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};

// ─── Admin: update booking status ─────────────────────────────────────────────
export const adminUpdateStatus = async (bookingId, { status, paymentStatus }) => {
  const VALID_STATUS = ["pending", "confirmed", "canceled", "completed"];
  const VALID_PAYMENT = ["pending", "processing", "succeeded", "failed", "refunded"];

  const update = {};

  if (status) {
    if (!VALID_STATUS.includes(status))
      throw new ApiError(`status must be one of: ${VALID_STATUS.join(", ")}`, 400);
    update.status = status;
  }

  if (paymentStatus) {
    if (!VALID_PAYMENT.includes(paymentStatus))
      throw new ApiError(`paymentStatus must be one of: ${VALID_PAYMENT.join(", ")}`, 400);
    update.paymentStatus = paymentStatus;
  }

  if (!Object.keys(update).length)
    throw new ApiError("Provide status or paymentStatus", 400);

  const booking = await BookingModel.findByIdAndUpdate(
    bookingId,
    update,
    { new: true, runValidators: true }
  );
  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};