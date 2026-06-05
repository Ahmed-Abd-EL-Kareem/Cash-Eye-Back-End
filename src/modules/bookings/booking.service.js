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