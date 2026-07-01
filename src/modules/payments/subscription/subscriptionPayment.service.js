import stripe from "../../../utils/stripe.js";
import SubscriptionModel from "../../subscriptions/subscription.model.js";
import UserModel from "../../users/user.model.js";
import PlanModel from "../../subscriptions/plan/plan.model.js";
import ApiError from "../../../utils/apiError.js";
import logger from "../../../config/logger.js";

const getStripeSubscriptionId = (session) => {
  const sub = session.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
};

const formatTripsLimit = (tripsPerMonth) =>
  tripsPerMonth == null
    ? "Unlimited AI trip plans per month"
    : `${tripsPerMonth} AI trip plans per month`;

const buildPlanCheckoutDescription = (plan) => {
  const { tokensPerMonth, requestsPerDay, tripsPerMonth } = plan.limits;
  const parts = [
    plan.description,
    `${tokensPerMonth.toLocaleString()} AI tokens per month`,
    `${requestsPerDay} AI requests per day`,
    formatTripsLimit(tripsPerMonth),
    ...(plan.features || []),
  ].filter(Boolean);

  return parts.join(" · ").slice(0, 500);
};

const toStripeImages = (...urls) =>
  [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("https://")))].slice(
    0,
    8
  );

const fulfillSubscriptionFromCheckout = async (session) => {
  const { userId, subscriptionId, planName } = session.metadata || {};

  if (!subscriptionId || !planName) {
    logger.warn(
      `[Stripe] checkout.session.completed missing metadata: ${session.id}`
    );
    return null;
  }

  const sub = await SubscriptionModel.findById(subscriptionId);
  if (!sub) {
    logger.warn(`[Stripe] Subscription not found: ${subscriptionId}`);
    return null;
  }

  const plan = await PlanModel.findOne({ name: planName });
  const stripeSubscriptionId = getStripeSubscriptionId(session);

  if (sub.planName !== planName) {
    sub.history.push({
      fromPlan: sub.planName,
      toPlan: planName,
      reason: "stripe_checkout",
    });
  }

  if (stripeSubscriptionId) sub.stripeSubscriptionId = stripeSubscriptionId;
  sub.planName = planName;
  sub.status = "active";
  sub.startDate = new Date();
  sub.endDate = null;
  sub.canceledAt = null;
  if (plan) sub.plan = plan._id;

  await sub.save();

  if (userId) {
    await UserModel.findByIdAndUpdate(userId, { subscription: sub._id });
  }

  logger.info(
    `[Stripe] Subscription upgraded to ${planName} for user ${userId || sub.user}`
  );

  return sub;
};

export const createSubscriptionCheckoutSession = async (userId, planName) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const plan = await PlanModel.findOne({ name: planName, isActive: true });
  if (!plan) {
    throw new ApiError("Plan not found or inactive", 404);
  }

  if (planName === "free") {
    throw new ApiError("No payment required for free plan", 400);
  }

  const subscription = await SubscriptionModel.findOne({ user: userId });
  if (!subscription) {
    throw new ApiError("Subscription not found", 404);
  }

  if (subscription.planName === planName) {
    throw new ApiError(`Already on ${planName} plan`, 400);
  }

  let customerId = subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    subscription.stripeCustomerId = customerId;
    await subscription.save();
  }

  const priceId =
    plan.stripePriceId?.monthly || process.env.STRIPE_PRICE_ID_PRO;
  if (planName === "pro" && !priceId) {
    throw new ApiError("Stripe price ID for pro plan not configured", 500);
  }
  if (planName !== "pro") {
    throw new ApiError(`Price ID not configured for plan: ${planName}`, 500);
  }
  const stripePrice = await stripe.prices.retrieve(priceId);

  if (!stripePrice.active) {
    throw new ApiError("Stripe price for this plan is inactive", 500);
  }
  if (stripePrice.type !== "recurring") {
    throw new ApiError(
      "Stripe price must be a recurring (monthly) subscription price. " +
        "Create a recurring price in Stripe Dashboard and set STRIPE_PRICE_ID_PRO or plan.stripePriceId.monthly.",
      500
    );
  }

  const planImages = toStripeImages(process.env.RAHAL_LOGO_URL);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: stripePrice.currency,
          unit_amount: stripePrice.unit_amount,
          recurring: {
            interval: stripePrice.recurring.interval,
            interval_count: stripePrice.recurring.interval_count || 1,
          },
          product_data: {
            name: `Rahal ${plan.displayName} Plan`,
            description: buildPlanCheckoutDescription(plan),
            ...(planImages.length ? { images: planImages } : {}),
            metadata: { planName: plan.name },
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    custom_text: {
      submit: {
        message: `${plan.displayName}: ${plan.limits.tokensPerMonth.toLocaleString()} tokens/mo · ${formatTripsLimit(plan.limits.tripsPerMonth)}`,
      },
    },
    metadata: {
      userId: user._id.toString(),
      subscriptionId: subscription._id.toString(),
      planName,
    },
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        subscriptionId: subscription._id.toString(),
        planName,
      },
    },
  });

  return { url: session.url, sessionId: session.id };
};

// Fallback: manually sync plan after checkout when webhooks can't reach localhost.
// Disabled — plan upgrades are applied by handleSubscriptionWebhookEvent below.
// export const verifyCheckoutSession = async (userId, sessionId) => {
//   if (!sessionId) {
//     throw new ApiError("sessionId is required", 400);
//   }
//
//   const session = await stripe.checkout.sessions.retrieve(sessionId, {
//     expand: ["subscription"],
//   });
//
//   if (session.payment_status !== "paid") {
//     throw new ApiError("Payment not completed yet", 400);
//   }
//
//   if (session.metadata?.userId !== userId.toString()) {
//     throw new ApiError("Not authorized for this checkout session", 403);
//   }
//
//   const subscription = await fulfillSubscriptionFromCheckout(session);
//   if (!subscription) {
//     throw new ApiError("Failed to apply subscription upgrade", 500);
//   }
//
//   return subscription.populate("plan", "name displayName price limits features");
// };

export const handleSubscriptionWebhookEvent = async (payload, sig) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTION
    );
  } catch (err) {
    throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  logger.info(`[Stripe] Subscription webhook received: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed":
      await fulfillSubscriptionFromCheckout(event.data.object);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object);
      break;
    default:
      console.log(`[Stripe] Unhandled subscription event: ${event.type}`);
  }

  return { received: true };
};

const handleSubscriptionCreated = async (subscriptionObj) => {
  const { userId, subscriptionId, planName } = subscriptionObj.metadata || {};
  if (!subscriptionId || !planName) return;

  const sub = await SubscriptionModel.findById(subscriptionId);
  if (!sub || sub.planName === planName) return;

  const plan = await PlanModel.findOne({ name: planName });

  sub.history.push({
    fromPlan: sub.planName,
    toPlan: planName,
    reason: "stripe_subscription_created",
  });
  sub.stripeSubscriptionId = subscriptionObj.id;
  sub.planName = planName;
  sub.status = "active";
  sub.startDate = new Date();
  if (plan) sub.plan = plan._id;
  await sub.save();

  if (userId) {
    await UserModel.findByIdAndUpdate(userId, { subscription: sub._id });
  }
};

const mapStripeSubscriptionStatus = (stripeStatus) => {
  if (stripeStatus === "past_due") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "unpaid") return "canceled";
  return "active";
};

const handleSubscriptionUpdated = async (subscriptionObj) => {
  const sub = await SubscriptionModel.findOne({
    stripeSubscriptionId: subscriptionObj.id,
  });
  if (!sub) return;

  sub.status = mapStripeSubscriptionStatus(subscriptionObj.status);
  await sub.save();
};

const handleSubscriptionDeleted = async (subscriptionObj) => {
  const sub = await SubscriptionModel.findOne({
    stripeSubscriptionId: subscriptionObj.id,
  });
  if (!sub) return;

  sub.status = "canceled";
  sub.canceledAt = new Date();
  await sub.save();
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  const sub = await SubscriptionModel.findOne({
    stripeSubscriptionId: invoice.subscription,
  });
  if (!sub) return;

  if (sub.status === "past_due") {
    sub.status = "active";
    await sub.save();
  }
};

const handleInvoicePaymentFailed = async (invoice) => {
  const sub = await SubscriptionModel.findOne({
    stripeSubscriptionId: invoice.subscription,
  });
  if (!sub) return;

  sub.status = "past_due";
  await sub.save();
};

export const getSubscriptionPaymentStatus = async (subscriptionId, userId) => {
  const subscription = await SubscriptionModel.findById(subscriptionId);
  if (!subscription) {
    throw new ApiError("Subscription not found", 404);
  }

  if (subscription.user.toString() !== userId.toString()) {
    throw new ApiError("Not authorized to view this subscription", 403);
  }

  const paymentStatus =
    subscription.status === "active"
      ? "succeeded"
      : subscription.status === "past_due"
        ? "failed"
        : subscription.status === "canceled"
          ? "canceled"
          : "pending";

  return {
    subscriptionId: subscription._id,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    status: subscription.status,
    planName: subscription.planName,
    paymentStatus,
  };
};
