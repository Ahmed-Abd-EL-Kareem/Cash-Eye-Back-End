import { Router } from "express";
import * as bookingPaymentController from "./bookingPayment.controller.js";
import { protect } from "../../../middleware/auth.middleware.js";
import { restrictTo } from "../../../middleware/role.middleware.js";

const router = Router();

// Booking Payment
router.post(
  "/pay/checkout",
  protect,
  bookingPaymentController.createBookingCheckout
);

// Stripe calls this after checkout payment
router.post(
  "/webhook",
  bookingPaymentController.handleWebhook
);

// Get payment status for a booking
router.get(
  "/status/:bookingId",
  protect,
  bookingPaymentController.getPaymentStatus
);

// ─────────────────────────────────────────────
// Admin Dashboard Payment Statistics
// ─────────────────────────────────────────────

// Total Revenue = Booking Revenue + Pro Subscription Revenue
router.get(
  "/admin/revenue",
  protect,
  restrictTo("admin"),
  bookingPaymentController.getRevenueStats
);

// Average Booking Price
router.get(
  "/admin/avg-price",
  protect,
  restrictTo("admin"),
  bookingPaymentController.getAverageBookingPrice
);

// Cancelled Bookings Count
router.get(
  "/admin/cancelled",
  protect,
  restrictTo("admin"),
  bookingPaymentController.getCancelledBookingsCount
);
export default router;