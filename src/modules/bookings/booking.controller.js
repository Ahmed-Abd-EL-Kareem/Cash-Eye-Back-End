// import asyncHandler from "../../utils/asyncHandler.js";
// import * as bookingService from "./booking.service.js";
// import { successResponse, createdResponse } from "../../utils/apiResponse.js";

// export const createBooking = asyncHandler(async (req, res) => {
//   const booking = await bookingService.createBooking(req.user._id, req.body);
//   createdResponse(res, { message: "Booking request submitted", data: booking });
// });

// export const getMyBookings = asyncHandler(async (req, res) => {
//   const result = await bookingService.getMyBookings(req.user._id, req.query);
//   successResponse(res, { message: "Bookings fetched", length: result.bookings.length, data: result.bookings, meta: { pagination: result.pagination } });
// });

// export const getBookingById = asyncHandler(async (req, res) => {
//   const booking = await bookingService.getBookingById(req.params.id, req.user._id);
//   successResponse(res, { message: "Booking fetched", data: booking });
// });

// export const cancelBooking = asyncHandler(async (req, res) => {
//   const booking = await bookingService.cancelBooking(req.params.id, req.user._id);
//   successResponse(res, { message: "Booking canceled", data: booking });
// });

// export const adminGetAllBookings = asyncHandler(async (req, res) => {
//   const result = await bookingService.adminGetAllBookings(req.query);
//   successResponse(res, { message: "All bookings fetched", length: result.bookings.length, data: result.bookings, meta: { pagination: result.pagination } });
// });

// export const adminUpdateStatus = asyncHandler(async (req, res) => {
//   const booking = await bookingService.adminUpdateStatus(req.params.id, req.body.status);
//   successResponse(res, { message: "Booking status updated", data: booking });
// });
// import asyncHandler from "../../../utils/asyncHandler.js";
import asyncHandler from "../../utils/asyncHandler.js"; ;
// import * as bookingPaymentService from "./bookingPayment.service.js";
import * as bookingPaymentService from "./booking.service.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";
import ApiError from "../../utils/apiError.js";
import { getStripeWebhookPayload } from "../../middleware/stripeWebhook.middleware.js";

// Stripe Checkout — returns a URL to pay in the browser (same flow as subscription upgrade)
export const createBookingCheckout = asyncHandler(async (req, res) => {
  const { bookingId, currency } = req.body;

  if (!bookingId) {
    throw new ApiError("bookingId is required", 400);
  }

  const result = await bookingPaymentService.createBookingCheckoutSession(
    bookingId,
    req.user._id,
    currency
  );

  createdResponse(res, {
    message: "Booking checkout session created successfully",
    data: result,
  });
});

// Called by Stripe only — do not invoke manually from Postman.
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const payload = getStripeWebhookPayload(req);

  if (!sig) {
    return res.status(400).send("Webhook Error: No stripe-signature header");
  }

  if (!payload) {
    return res.status(400).send("Webhook Error: No webhook payload was provided.");
  }

  try {
    await bookingPaymentService.handleWebhookEvent(payload, sig);
    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const result = await bookingPaymentService.getPaymentStatus(
    bookingId,
    req.user._id
  );

  successResponse(res, {
    message: "Payment status retrieved",
    data: result,
  });
});
// =====================update===(Cancelled Bookings/Average Booking Price/Revenue)
export const getRevenueStats = asyncHandler(async (req, res) => {
  const data = await bookingPaymentService.getRevenueStats();

  successResponse(res, {
    message: "Revenue stats fetched successfully",
    data,
  });
});

export const getAverageBookingPrice = asyncHandler(async (req, res) => {
  const data = await bookingPaymentService.getAverageBookingPrice();

  successResponse(res, {
    message: "Average booking price fetched successfully",
    data,
  });
});

export const getCancelledBookingsCount = asyncHandler(async (req, res) => {
  const data = await bookingPaymentService.getCancelledBookingsCount();

  successResponse(res, {
    message: "Cancelled bookings fetched successfully",
    data,
  });
});