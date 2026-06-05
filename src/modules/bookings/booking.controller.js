import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  successResponse,
  createdResponse,
} from "../../utils/apiResponse.js";

import {
  createBookingService,
  getAllBookingsService,
  getBookingByIdService,
  updateBookingStatusService,
  deleteBookingService,
} from "./booking.service.js";

// Create Booking
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await createBookingService(
    req.body,
    req.user._id
  );

  createdResponse(res, {
    message: "Booking created successfully",
    data: booking,
  });
});

// Get All Bookings
export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await getAllBookingsService(req.user);

  successResponse(res, {
    message: "Bookings fetched successfully",
    length: bookings.length,
    data: bookings,
  });
});

// Get Single Booking
export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await getBookingByIdService(
    req.params.id,
    req.user
  );

  successResponse(res, {
    message: "Booking fetched successfully",
    data: booking,
  });
});

// Update Booking Status
export const updateBookingStatus = asyncHandler(
  async (req, res) => {
    const booking =
      await updateBookingStatusService(
        req.params.id,
        req.body
      );

    successResponse(res, {
      message: "Booking status updated successfully",
      data: booking,
    });
  }
);

// Delete Booking
export const deleteBooking = asyncHandler(async (req, res) => {
  await deleteBookingService(
    req.params.id,
    req.user
  );

  successResponse(res, {
    message: "Booking deleted successfully",
  });
});