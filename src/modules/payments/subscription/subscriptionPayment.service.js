import stripe from "../../../utils/stripe.js";
import SubscriptionModel from "../../subscriptions/subscription.model.js";
import UserModel from "../../users/user.model.js";
import PlanModel from "../../subscriptions/plan/plan.model.js";
import ApiError from "../../../utils/apiError.js";

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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: {
      userId: user._id.toString(),
      subscriptionId: subscription._id.toString(),
      planName,
    },
  });

  return { url: session.url, sessionId: session.id };
};

export const handleSubscriptionWebhookEvent = async (payload, sig) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
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

const handleCheckoutSessionCompleted = async (session) => {
  const { userId, subscriptionId, planName } = session.metadata || {};
  if (!subscriptionId || !planName) return;

  const sub = await SubscriptionModel.findById(subscriptionId);
  if (!sub) return;

  const plan = await PlanModel.findOne({ name: planName });
  sub.stripeSubscriptionId = session.subscription;
  sub.planName = planName;
  sub.status = "active";
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
