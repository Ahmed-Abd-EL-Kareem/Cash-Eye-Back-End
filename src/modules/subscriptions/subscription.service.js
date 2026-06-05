import SubscriptionModel from "./subscription.model.js";
import PlanModel from "./plan/plan.model.js";
import UserModel from "../users/user.model.js";
import AppError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";

// ─── Create Free Subscription ──────────────────────────────────────────────────

export const createFreeSubscription = async (userId) => {
  const freePlan = await PlanModel.findOne({ name: "free" });
  if (!freePlan) throw new AppError("Free plan not found", 500);

  const existing = await SubscriptionModel.findOne({ user: userId });
  if (existing) return existing;

  return await SubscriptionModel.create({
    user: userId,
    plan: freePlan._id,
    planName: "free",
    status: "free",
  });
};

// ─── Get My Subscription ───────────────────────────────────────────────────────

export const getMySubscription = async (userId) => {
  const sub = await SubscriptionModel.findOne({ user: userId }).populate(
    "plan",
    "name displayName price limits features"
  );
  if (!sub) throw new AppError("Subscription not found", 404);
  return sub;
};

// ─── Change Plan (user self-service) ──────────────────────────────────────────

export const changePlan = async (userId, newPlanName) => {
  const [plan, subscription] = await Promise.all([
    PlanModel.findOne({ name: newPlanName, isActive: true }),
    SubscriptionModel.findOne({ user: userId }),
  ]);

  if (!plan) throw new AppError("Plan not found or inactive", 404);
  if (!subscription) throw new AppError("Subscription not found", 404);
  if (subscription.planName === newPlanName)
    throw new AppError("Already on this plan", 400);

  subscription.history.push({
    fromPlan: subscription.planName,
    toPlan: newPlanName,
    reason: newPlanName === "free" ? "downgrade" : "upgrade",
  });

  subscription.plan = plan._id;
  subscription.planName = newPlanName;
  subscription.status = newPlanName === "free" ? "free" : "active";
  subscription.startDate = new Date();

  await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
  await subscription.save();
  return subscription;
};

// ─── Check & Consume Tokens ────────────────────────────────────────────────────

export const checkAndConsumeTokens = async (userId, tokensToUse) => {
  const subscription = await SubscriptionModel.findOne({ user: userId }).populate(
    "plan",
    "limits"
  );
  if (!subscription) throw new AppError("Subscription not found", 404);

  subscription.checkAndResetMonthly();
  subscription.checkAndResetDaily();

  const { tokensPerMonth, requestsPerDay } = subscription.plan.limits;

  if (subscription.usage.requestsToday >= requestsPerDay) {
    throw new AppError(
      `Daily request limit reached (${requestsPerDay}/day). Upgrade to Pro for more.`,
      429
    );
  }

  if (subscription.usage.tokensUsedThisMonth + tokensToUse > tokensPerMonth) {
    throw new AppError(
      `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Upgrade to Pro for more.`,
      429
    );
  }

  subscription.usage.tokensUsedThisMonth += tokensToUse;
  subscription.usage.requestsToday += 1;
  subscription.usage.lastRequestDate = new Date();
  await subscription.save();

  return {
    tokensRemaining: tokensPerMonth - subscription.usage.tokensUsedThisMonth,
    requestsRemainingToday: requestsPerDay - subscription.usage.requestsToday,
  };
};

// ─── Admin: Get All Subscriptions (with APIFeatures) ──────────────────────────
// Supports: ?status=active  ?planName=pro  ?search=ahmed
//           ?sort=-createdAt  ?page=1  ?limit=10

export const getAllSubscriptions = async (query = {}) => {
  const baseQuery = SubscriptionModel.find()
    .populate("user", "name email")
    .populate("plan", "name displayName price");

  const features = new APIFeatures(SubscriptionModel, baseQuery, query)
    .filter()
    .search([])   // subscriptions have no text fields worth searching — extend if needed
    .sort()
    .paginate();

  const [subscriptions, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    subscriptions,
    length: subscriptions.length,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      pages: Math.ceil(total / features.limit),
    },
  };
};

// ─── Admin: Change Any User's Plan ────────────────────────────────────────────

export const adminChangePlan = async (userId, newPlanName) => {
  const [plan, subscription] = await Promise.all([
    PlanModel.findOne({ name: newPlanName }),
    SubscriptionModel.findOne({ user: userId }),
  ]);

  if (!plan) throw new AppError("Plan not found", 404);
  if (!subscription) throw new AppError("Subscription not found", 404);

  subscription.history.push({
    fromPlan: subscription.planName,
    toPlan: newPlanName,
    reason: "admin_change",
  });

  subscription.plan = plan._id;
  subscription.planName = newPlanName;
  subscription.status = newPlanName === "free" ? "free" : "active";

  await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
  await subscription.save();
  return subscription;
};