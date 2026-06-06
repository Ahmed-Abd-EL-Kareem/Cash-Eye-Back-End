import { Router } from "express";
import * as bookingPaymentController from "./bookingPayment.controller.js";
import { protect } from "../../../middleware/auth.middleware.js";

const router = Router();

router.post("/pay/checkout", protect, bookingPaymentController.createBookingCheckout);
// Stripe calls this after checkout payment — required in production (Railway)
router.post("/webhook", bookingPaymentController.handleWebhook);
router.get("/status/:bookingId", protect, bookingPaymentController.getPaymentStatus);

export default router;
