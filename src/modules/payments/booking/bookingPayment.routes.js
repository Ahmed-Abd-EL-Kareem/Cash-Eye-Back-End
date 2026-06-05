import { Router } from "express";
import * as bookingPaymentController from "./bookingPayment.controller.js";
import { protect } from "../../../middleware/auth.middleware.js";

const router = Router();

router.post("/create-intent", protect, bookingPaymentController.createPaymentIntent);
router.post("/webhook", bookingPaymentController.handleWebhook);
router.get("/status/:bookingId", protect, bookingPaymentController.getPaymentStatus);

export default router;
