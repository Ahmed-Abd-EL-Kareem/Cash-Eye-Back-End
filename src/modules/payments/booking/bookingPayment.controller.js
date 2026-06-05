import asyncHandler from "../../../utils/asyncHandler.js";
import * as bookingPaymentService from "./bookingPayment.service.js";
import { successResponse, createdResponse } from "../../../utils/apiResponse.js";
import ApiError from "../../../utils/apiError.js";

export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { bookingId, currency } = req.body;

  if (!bookingId) {
    throw new ApiError("bookingId is required", 400);
  }

  const result = await bookingPaymentService.createPaymentIntent(
    bookingId,
    req.user._id,
    currency
  );

  createdResponse(res, {
    message: "Payment intent created successfully",
    data: result,
  });
});

export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Webhook Error: No stripe-signature header");
  }

  try {
    await bookingPaymentService.handleWebhookEvent(req.rawBody, sig);
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
