<<<<<<< HEAD
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
export const adminUpdateStatus = async (bookingId, status) => {
  const VALID = ["pending", "confirmed", "canceled", "completed"];
  if (!VALID.includes(status))
    throw new ApiError(`status must be one of: ${VALID.join(", ")}`, 400);

  const booking = await BookingModel.findByIdAndUpdate(
    bookingId,
    { status },
    { new: true, runValidators: true }
  );
  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};
=======
import HotelModel from "../hotels/hotel.model.js";
import TripModel from "../trips/trip.model.js";
import ApiError from "../../utils/apiError.js";

import {
  createBooking,
  findBookingById,
  findAllBookings,
  findBookingsByUser,
  updateBookingById,
  deleteBookingById,
  findBookingByIdAndUser,
} from "./booking.repository.js";

const calculateNights = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const diffMs =
    checkOutDate.getTime() -
    checkInDate.getTime();

  return Math.ceil(
    diffMs / (1000 * 60 * 60 * 24)
  );
};

// Create Booking
export const createBookingService = async (
  body,
  userId
) => {
  const { hotelId, tripId,checkIn,checkOut,rooms,guests, } = body;

  const hotel = await HotelModel.findById(
    hotelId
  );

  if (!hotel) {
    throw new ApiError(
      "Hotel not found",
      404
    );
  }

  const trip = await TripModel.findById(
    tripId
  );

  if (!trip) {
    throw new ApiError(
      "Trip not found",
      404
    );
  }

  if (
    trip.user.toString() !==
    userId.toString()
  ) {
    throw new ApiError(
      "You are not authorized to book for this trip",
      403
    );
  }

  const nights = calculateNights(
    checkIn,
    checkOut
  );

  const totalPrice =
    nights *
    rooms *
    hotel.averagePricePerNight;

// ----------------------------
const bookingData = {
  user: userId,
  hotel: hotelId,
  trip: tripId,
  rooms,
  guests,
  nights,
  checkIn,
  checkOut,
  totalPrice,
  currency: hotel.currency,
  status: "pending",
};
  return await createBooking(
    bookingData
  );
};

// Get All Bookings
export const getAllBookingsService =
  async (requestingUser) => {
    if (
      requestingUser.role === "admin"
    ) {
      return await findAllBookings();
    }

    return await findBookingsByUser(
      requestingUser._id
    );
  };

// Get Booking By Id
export const getBookingByIdService =
  async (
    bookingId,
    requestingUser
  ) => {
    let booking;

    if (
      requestingUser.role === "admin"
    ) {
      booking =
        await findBookingById(
          bookingId
        );
    } else {
      booking =
        await findBookingByIdAndUser(
          bookingId,
          requestingUser._id
        );
    }

    if (!booking) {
      throw new ApiError(
        "Booking not found",
        404
      );
    }

    return booking;
  };

// Update Booking Status
export const updateBookingStatusService =
  async (bookingId, body) => {
    const { status } = body;

    const booking =
      await findBookingById(
        bookingId
      );

    if (!booking) {
      throw new ApiError(
        "Booking not found",
        404
      );
    }

    return await updateBookingById(
      bookingId,
      { status }
    );
  };

// Delete Booking
export const deleteBookingService =
  async (
    bookingId,
    requestingUser
  ) => {
    let booking;

    if (
      requestingUser.role === "admin"
    ) {
      booking =
        await findBookingById(
          bookingId
        );
    } else {
      booking =
        await findBookingByIdAndUser(
          bookingId,
          requestingUser._id
        );
    }

    if (!booking) {
      throw new ApiError(
        "Booking not found",
        404
      );
    }

    await deleteBookingById(
      bookingId
    );

    return booking;
  };
>>>>>>> 1c3d0d59e09f38e49e52123c1567f7768790a4b8
