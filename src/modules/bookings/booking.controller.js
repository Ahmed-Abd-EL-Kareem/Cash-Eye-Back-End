<<<<<<< HEAD
import asyncHandler from "../../utils/asyncHandler.js";
import * as bookingService from "./booking.service.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user._id, req.body);
  createdResponse(res, { message: "Booking request submitted", data: booking });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getMyBookings(req.user._id, req.query);
  successResponse(res, { message: "Bookings fetched", length: result.bookings.length, data: result.bookings, meta: { pagination: result.pagination } });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user._id);
  successResponse(res, { message: "Booking fetched", data: booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user._id);
  successResponse(res, { message: "Booking canceled", data: booking });
});

export const adminGetAllBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.adminGetAllBookings(req.query);
  successResponse(res, { message: "All bookings fetched", length: result.bookings.length, data: result.bookings, meta: { pagination: result.pagination } });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.adminUpdateStatus(req.params.id, req.body.status);
  successResponse(res, { message: "Booking status updated", data: booking });
=======
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
>>>>>>> 1c3d0d59e09f38e49e52123c1567f7768790a4b8
});