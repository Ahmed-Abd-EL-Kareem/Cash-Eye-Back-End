import SubscriptionModel from "./subscription.model.js";
import PlanModel from "../plans/plan.model.js";
import UserModel from "../users/user.model.js";
import AppError from "../../utils/appError.js";

// export const seedPlans = async () => {
//   const count = await PlanModel.countDocuments();
//   if (count > 0) return;

//   await PlanModel.insertMany([
//     {
//       name: "free",
//       displayName: "Free",
//       description: "Get started with basic AI financial insights",
//       price: { monthly: 0 },
//       limits: {
//         tokensPerMonth: 10000,
//         requestsPerDay: 20,
//         maxFileUploads: 2,
//         maxFileSizeMB: 5,
//         allowedModels: ["gpt-3.5-turbo"],
//       },
//       features: ["Basic financial analysis", "20 requests/day", "2 file uploads"],
//       sortOrder: 0,
//     },
//     {
//       name: "pro",
//       displayName: "Pro",
//       description: "Full AI advisor for growing businesses",
//       price: { monthly: 29 },
//       limits: {
//         tokensPerMonth: 500000,
//         requestsPerDay: 500,
//         maxFileUploads: 50,
//         maxFileSizeMB: 25,
//         allowedModels: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
//       },
//       features: [
//         "Advanced AI forecasting",
//         "500 requests/day",
//         "50 file uploads",
//         "Risk analysis",
//         "Priority support",
//       ],
//       sortOrder: 1,
//     },
//   ]);

//   console.log(" Plans seeded");
// };

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

export const getMySubscription = async (userId) => {
  const sub = await SubscriptionModel.findOne({ user: userId }).populate(
    "plan",
    "name displayName price limits features"
  );
  if (!sub) throw new AppError("Subscription not found", 404);
  return sub;
};

export const changePlan = async (userId, newPlanName) => {
  const [plan, subscription] = await Promise.all([
    PlanModel.findOne({ name: newPlanName, isActive: true }),
    SubscriptionModel.findOne({ user: userId }),
  ]);

  if (!plan) throw new AppError("Plan not found", 404);
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

  await UserModel.findByIdAndUpdate(userId, {
    subscription: newPlanName === "free" ? "free" : "pro",
  });

  await subscription.save();
  return subscription;
};

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

export const getAllSubscriptions = async (query = {}) => {
  const { page = 1, limit = 20, status, planName } = query;
  const filter = {};
  if (status) filter.status = status;
  if (planName) filter.planName = planName;

  const [subscriptions, total] = await Promise.all([
    SubscriptionModel.find(filter)
      .populate("user", "name email")
      .populate("plan", "name displayName price")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    SubscriptionModel.countDocuments(filter),
  ]);

  return {
    subscriptions,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  };
};

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

  await UserModel.findByIdAndUpdate(userId, {
    subscription: newPlanName === "free" ? "free" : "pro",
  });

  await subscription.save();
  return subscription;
};