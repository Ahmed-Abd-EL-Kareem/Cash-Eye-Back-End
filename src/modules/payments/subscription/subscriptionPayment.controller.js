import asyncHandler from "../../../utils/asyncHandler.js";
import * as subscriptionPaymentService from "./subscriptionPayment.service.js";
import { successResponse, createdResponse } from "../../../utils/apiResponse.js";
import ApiError from "../../../utils/apiError.js";
import { getStripeWebhookPayload } from "../../../middleware/stripeWebhook.middleware.js";

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

export const createSubscriptionPaymentIntent = asyncHandler(async (req, res) => {
  const { planName, currency } = req.body;

  if (!planName) {
    throw new ApiError("planName is required", 400);
  }

  const result = await subscriptionPaymentService.createSubscriptionPaymentIntent(
    req.user._id,
    planName,
    currency
  );

  createdResponse(res, {
    message: "Subscription payment intent created successfully",
    data: result,
  });
});

export const handleSubscriptionWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const payload = getStripeWebhookPayload(req);

  if (!sig) {
    return res.status(400).send("Webhook Error: No stripe-signature header");
  }

  if (!payload) {
    return res.status(400).send("Webhook Error: No webhook payload was provided.");
  }

  try {
    await subscriptionPaymentService.handleSubscriptionWebhookEvent(
      payload,
      sig
    );
    res.json({ received: true });
  } catch (err) {
    console.error(`Subscription Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Fallback: manually sync plan after checkout when webhooks can't reach localhost.
// Disabled — plan upgrades are applied by POST /subscriptions/webhook (Stripe).
// export const verifySubscriptionPayment = asyncHandler(async (req, res) => {
//   const sessionId = req.body.sessionId || req.query.session_id;
//
//   const subscription = await subscriptionPaymentService.verifyCheckoutSession(
//     req.user._id,
//     sessionId
//   );
//
//   successResponse(res, {
//     message: "Subscription upgraded successfully",
//     data: { subscription },
//   });
// });

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
