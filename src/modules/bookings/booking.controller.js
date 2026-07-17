import asyncHandler from "../../utils/asyncHandler.js";
import * as bookingService from "./booking.service.js";
import * as bookingPaymentService from "../payments/booking/bookingPayment.service.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";

export const createHold = asyncHandler(async (req, res) => {
  const hold = await bookingService.createHold(req.user._id, req.body);
  createdResponse(res, {
    message: "Rooms held successfully. Proceed to payment.",
    data: {
      holdId: hold._id,
      expiresAt: hold.expiresAt,
      totalPrice: hold.totalPrice,
      currency: hold.currency,
      checkIn: hold.checkIn,
      checkOut: hold.checkOut,
      rooms: hold.rooms,
    },
  });
});

export const getHoldStatus = asyncHandler(async (req, res) => {
  const status = await bookingService.getHoldStatus(req.params.holdId, req.user._id);
  successResponse(res, { message: "Hold status fetched", data: status });
});

export const getAvailability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const availability = await bookingService.getAvailability(req.params.hotelId, checkIn, checkOut);
  successResponse(res, { message: "Availability fetched", data: availability });
});

export const getRoomAvailability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, quantity } = req.query;
  const availability = await bookingService.getRoomAvailability(
    req.params.hotelId,
    req.params.roomId,
    checkIn,
    checkOut,
    quantity || 1
  );
  successResponse(res, { message: "Room availability fetched", data: availability });
});

export const createCheckoutSessionForHold = asyncHandler(async (req, res) => {
  const { holdId, currency } = req.body;
  const result = await bookingService.createCheckoutSessionForHold(holdId, req.user._id, currency);
  successResponse(res, {
    message: "Checkout session created",
    data: result,
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getMyBookings(req.user._id, req.query);
  successResponse(res, {
    message: "Bookings fetched",
    length: result.bookings.length,
    data: result.bookings,
    meta: { pagination: result.pagination },
  });
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
  successResponse(res, {
    message: "All bookings fetched",
    length: result.bookings.length,
    data: result.bookings,
    meta: { pagination: result.pagination },
  });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.adminUpdateStatus(req.params.id, req.body.status);
  successResponse(res, { message: "Booking status updated", data: booking });
});

export const getBookingStats = asyncHandler(async (req, res) => {
  const stats = await bookingService.getBookingStats();
  successResponse(res, { message: "Booking stats fetched", data: stats });
});

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user._id, req.body);
  createdResponse(res, { message: "Booking request submitted", data: booking });
});