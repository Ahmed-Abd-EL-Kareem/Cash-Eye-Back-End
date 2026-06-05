import asyncHandler from "../../../utils/asyncHandler.js";
import * as subscriptionPaymentService from "./subscriptionPayment.service.js";
import { successResponse, createdResponse } from "../../../utils/apiResponse.js";
import ApiError from "../../../utils/apiError.js";

export const upgradeSubscription = asyncHandler(async (req, res) => {
  const { planName } = req.body;

  if (!planName) {
    throw new ApiError("planName is required", 400);
  }

  const result = await subscriptionPaymentService.createSubscriptionCheckoutSession(
    req.user._id,
    planName
  );

  createdResponse(res, {
    message: "Subscription checkout session created successfully",
    data: result,
  });
});

export const handleSubscriptionWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Webhook Error: No stripe-signature header");
  }

  try {
    await subscriptionPaymentService.handleSubscriptionWebhookEvent(
      req.rawBody,
      sig
    );
    res.json({ received: true });
  } catch (err) {
    console.error(`Subscription Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

export const getSubscriptionPaymentStatus = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;

  const result = await subscriptionPaymentService.getSubscriptionPaymentStatus(
    subscriptionId,
    req.user._id
  );

  successResponse(res, {
    message: "Subscription payment status retrieved",
    data: result,
  });
});
