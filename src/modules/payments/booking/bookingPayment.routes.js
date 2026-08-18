import { Router } from "express";
import * as bookingPaymentController from "./bookingPayment.controller.js";
import { protect } from "../../../middleware/auth.middleware.js";
import { restrictTo } from "../../../middleware/role.middleware.js";

const router = Router();

router.post("/pay/checkout", protect, bookingPaymentController.createBookingCheckout);
router.post("/checkout", protect, bookingPaymentController.createBookingCheckout);
router.post("/pay", protect, bookingPaymentController.createBookingCheckout);
router.post("/hold/checkout", protect, bookingPaymentController.createHoldCheckout);
router.post("/webhook", bookingPaymentController.handleWebhook);
router.get("/pay/status/:bookingId", protect, bookingPaymentController.getPaymentStatus);
router.get("/status/:bookingId", protect, bookingPaymentController.getPaymentStatus);

router.get("/admin/revenue", protect, restrictTo("admin"), bookingPaymentController.getRevenueStats);
router.get("/admin/avg-price", protect, restrictTo("admin"), bookingPaymentController.getAverageBookingPrice);
router.get("/admin/cancelled", protect, restrictTo("admin"), bookingPaymentController.getCancelledBookingsCount);

export default router;