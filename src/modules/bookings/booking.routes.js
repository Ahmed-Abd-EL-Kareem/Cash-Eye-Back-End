import { Router } from "express";
import * as bookingController from "./booking.controller.js";
import * as bookingPaymentController from "../payments/booking/bookingPayment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { validateCreateHold, validateAvailabilityQuery } from "./booking.validation.js";

const router = Router();

router.use(protect);

// ─── Availability ─────────────────────────────────────────────────────────────
router.get(
  "/hotels/:hotelId/availability",
  validateAvailabilityQuery,
  bookingController.getAvailability
);
router.get(
  "/hotels/:hotelId/rooms/:roomId/availability",
  validateAvailabilityQuery,
  bookingController.getRoomAvailability
);

// ─── Hold & Checkout ──────────────────────────────────────────────────────────
router.post("/hold", validateCreateHold, bookingController.createHold);
router.post("/hold/:holdId/checkout-session", bookingController.createCheckoutSessionForHold);
router.get("/hold/:holdId/status", bookingController.getHoldStatus);

// ─── Booking Management ───────────────────────────────────────────────────────
router.post("/", bookingController.createBooking); // legacy - creates pending booking
router.get("/", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);
router.patch("/:id/cancel", bookingController.cancelBooking);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/admin/stats", restrictTo("admin"), bookingController.getBookingStats);
router.get("/admin/all", restrictTo("admin"), bookingController.adminGetAllBookings);
router.patch("/admin/:id/status", restrictTo("admin"), bookingController.adminUpdateStatus);

// ─── Payments (Booking) ───────────────────────────────────────────────────────
router.post("/pay/checkout", bookingPaymentController.createBookingCheckout);
router.post("/checkout", bookingPaymentController.createBookingCheckout);
router.post("/pay", bookingPaymentController.createBookingCheckout);
router.post("/webhook", bookingPaymentController.handleWebhook);
router.get("/pay/status/:bookingId", bookingPaymentController.getPaymentStatus);
router.get("/status/:bookingId", bookingPaymentController.getPaymentStatus);

export default router;