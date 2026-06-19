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
});
export const getBookingStats = asyncHandler(async (req, res) => {
  const stats = await bookingService.getBookingStats();

  successResponse(res, {
    message: "Booking stats fetched successfully",
    data: stats,
  });
});