// import SubscriptionModel from "./subscription.model.js";
// import PlanModel from "./plan/plan.model.js";
// import UserModel from "../users/user.model.js";
// import AppError from "../../utils/apiError.js";
// import APIFeatures from "../../utils/apiFeature.js";

// // ─── Create Free Subscription ──────────────────────────────────────────────────

// export const createFreeSubscription = async (userId) => {
//   const freePlan = await PlanModel.findOne({ name: "free" });
//   if (!freePlan) throw new AppError("Free plan not found", 500);

//   const existing = await SubscriptionModel.findOne({ user: userId });
//   if (existing) return existing;

//   return await SubscriptionModel.create({
//     user: userId,
//     plan: freePlan._id,
//     planName: "free",
//     status: "free",
//   });
// };

// // ─── Get My Subscription ───────────────────────────────────────────────────────

// export const getMySubscription = async (userId) => {
//   const sub = await SubscriptionModel.findOne({ user: userId }).populate(
//     "plan",
//     "name displayName price limits features"
//   );
//   if (!sub) throw new AppError("Subscription not found", 404);
//   return sub;
// };

// // ─── Change Plan (user self-service) ──────────────────────────────────────────

// export const changePlan = async (userId, newPlanName) => {
//   const [plan, subscription] = await Promise.all([
//     PlanModel.findOne({ name: newPlanName, isActive: true }),
//     SubscriptionModel.findOne({ user: userId }),
//   ]);

//   if (!plan) throw new AppError("Plan not found or inactive", 404);
//   if (!subscription) throw new AppError("Subscription not found", 404);
//   if (subscription.planName === newPlanName)
//     throw new AppError("Already on this plan", 400);

//   subscription.history.push({
//     fromPlan: subscription.planName,
//     toPlan: newPlanName,
//     reason: newPlanName === "free" ? "downgrade" : "upgrade",
//   });

//   subscription.plan = plan._id;
//   subscription.planName = newPlanName;
//   subscription.status = newPlanName === "free" ? "free" : "active";
//   subscription.startDate = new Date();

//   await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
//   await subscription.save();
//   return subscription;
// };

// // ─── Check & Consume Tokens ────────────────────────────────────────────────────

// export const checkAndConsumeTokens = async (userId, tokensToUse) => {
//   const subscription = await SubscriptionModel.findOne({ user: userId }).populate(
//     "plan",
//     "limits"
//   );
//   if (!subscription) throw new AppError("Subscription not found", 404);

//   subscription.checkAndResetMonthly();
//   subscription.checkAndResetDaily();

//   const { tokensPerMonth, requestsPerDay } = subscription.plan.limits;

//   if (subscription.usage.requestsToday >= requestsPerDay) {
//     throw new AppError(
//       `Daily request limit reached (${requestsPerDay}/day). Upgrade to Pro for more.`,
//       429
//     );
//   }

//   if (subscription.usage.tokensUsedThisMonth + tokensToUse > tokensPerMonth) {
//     throw new AppError(
//       `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Upgrade to Pro for more.`,
//       429
//     );
//   }

//   subscription.usage.tokensUsedThisMonth += tokensToUse;
//   subscription.usage.requestsToday += 1;
//   subscription.usage.lastRequestDate = new Date();
//   await subscription.save();

//   return {
//     tokensRemaining: tokensPerMonth - subscription.usage.tokensUsedThisMonth,
//     requestsRemainingToday: requestsPerDay - subscription.usage.requestsToday,
//   };
// };

// // ─── Admin: Get All Subscriptions (with APIFeatures) ──────────────────────────
// // Supports: ?status=active  ?planName=pro  ?search=ahmed
// //           ?sort=-createdAt  ?page=1  ?limit=10

// export const getAllSubscriptions = async (query = {}) => {
//   const baseQuery = SubscriptionModel.find()
//     .populate("user", "name email")
//     .populate("plan", "name displayName price");

//   const features = new APIFeatures(SubscriptionModel, baseQuery, query)
//     .filter()
//     .search([])   // subscriptions have no text fields worth searching — extend if needed
//     .sort()
//     .paginate();

//   const [subscriptions, total] = await Promise.all([
//     features.query,
//     features.countDocuments(),
//   ]);

//   return {
//     subscriptions,
//     length: subscriptions.length,
//     pagination: {
//       total,
//       page: features.page,
//       limit: features.limit,
//       pages: Math.ceil(total / features.limit),
//     },
//   };
// };

// // ─── Admin: Change Any User's Plan ────────────────────────────────────────────

// export const adminChangePlan = async (userId, newPlanName) => {
//   const [plan, subscription] = await Promise.all([
//     PlanModel.findOne({ name: newPlanName }),
//     SubscriptionModel.findOne({ user: userId }),
//   ]);

//   if (!plan) throw new AppError("Plan not found", 404);
//   if (!subscription) throw new AppError("Subscription not found", 404);

//   subscription.history.push({
//     fromPlan: subscription.planName,
//     toPlan: newPlanName,
//     reason: "admin_change",
//   });

//   subscription.plan = plan._id;
//   subscription.planName = newPlanName;
//   subscription.status = newPlanName === "free" ? "free" : "active";

//   await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
//   await subscription.save();
//   return subscription;
// };
// ? /////////////////////////////////////////
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
  subscription.endDate =
    newPlanName === "free"
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
  await subscription.save();
  return subscription;
};

// ─── Cancel Subscription (user self-service) ──────────────────────────────────

export const cancelSubscription = async (userId) => {
  const subscription = await SubscriptionModel.findOne({ user: userId });
  if (!subscription) throw new AppError("Subscription not found", 404);
  if (subscription.status === "canceled")
    throw new AppError("Subscription already canceled", 400);

  subscription.history.push({
    fromPlan: subscription.planName,
    toPlan: subscription.planName,
    reason: "cancellation",
  });

  subscription.status = "canceled";
  subscription.canceledAt = new Date();
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

// export const getAllSubscriptions = async (query = {}) => {
//   const filter = { user: { $ne: null } };

//   const baseQuery = SubscriptionModel.find(filter)
//     .populate("user", "name email")
//     .populate("plan", "name displayName price limits");

//   const features = new APIFeatures(SubscriptionModel, baseQuery, query)
//     .filter()
//     .search([])
//     .sort()
//     .paginate();

//   const [subscriptions, total] = await Promise.all([
//     features.query,
//     SubscriptionModel.countDocuments(filter),
//   ]);

//   return {
//     subscriptions,
//     length: subscriptions.length,
//     pagination: {
//       total,
//       page: features.page,
//       limit: features.limit,
//       pages: Math.ceil(total / features.limit),
//     },
//   };
// };

export const getAllSubscriptions = async (query = {}) => {
  const validUserIds = await UserModel.distinct('_id');
  const filter = { user: { $in: validUserIds } };

  const subscriptions = await SubscriptionModel.find(filter)
    .populate("user", "name email")
    .populate("plan", "name displayName price limits");

  return {
    subscriptions,
    length: subscriptions.length,
    pagination: {
      total: subscriptions.length,
      page: 1,
      limit: subscriptions.length,
      pages: 1,
    },
  };
};
// ─── Admin: Get Expiring Subscriptions ────────────────────────────────────────

export const getExpiringSubscriptions = async (days = 7) => {
  const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return await SubscriptionModel.find({
    status: "active",
    endDate: { $lte: future, $gte: new Date() },
  })
    .populate("user", "name email")
    .populate("plan", "name displayName");
};

// ─── Admin: Expire Past-Due Subscriptions (Cron Job) ──────────────────────────

export const expireSubscriptions = async () => {
  const result = await SubscriptionModel.updateMany(
    { status: "active", endDate: { $lt: new Date() } },
    { status: "past_due" }
  );
  return result.modifiedCount;
};

// ─── Admin: Get Churn Stats ────────────────────────────────────────────────────
export const getChurnStats = async () => {
  // جيب الـ IDs الموجودين فعلاً في الـ users collection
  const validUserIds = await UserModel.distinct('_id');
  
  const filter = { user: { $in: validUserIds } };
  
  const [total, active, free, canceled, past_due] = await Promise.all([
    SubscriptionModel.countDocuments(filter),
    SubscriptionModel.countDocuments({ ...filter, status: 'active' }),
    SubscriptionModel.countDocuments({ ...filter, status: 'free' }),
    SubscriptionModel.countDocuments({ ...filter, status: 'canceled' }),
    SubscriptionModel.countDocuments({ ...filter, status: 'past_due' }),
  ]);

  return {
    total,
    active,
    free,
    canceled,
    past_due,
    churnRate: total > 0 ? ((canceled / total) * 100).toFixed(2) : '0.00',
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
  subscription.endDate =
    newPlanName === "free"
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await UserModel.findByIdAndUpdate(userId, { subscription: subscription._id });
  await subscription.save();
  return subscription;
};

// ─── Admin: Cancel Any User's Subscription ────────────────────────────────────

export const adminCancelSubscription = async (userId) => {
  const subscription = await SubscriptionModel.findOne({ user: userId });
  if (!subscription) throw new AppError("Subscription not found", 404);
  if (subscription.status === "canceled")
    throw new AppError("Subscription already canceled", 400);

  subscription.history.push({
    fromPlan: subscription.planName,
    toPlan: subscription.planName,
    reason: "admin_cancellation",
  });

  subscription.status = "canceled";
  subscription.canceledAt = new Date();
  await subscription.save();
  return subscription;
};

// ─── Admin: Create Subscription for Existing User ─────────────────────────────

export const adminCreateSubscription = async (userId, planName) => {
  const [plan, user] = await Promise.all([
    PlanModel.findOne({ name: planName, isActive: true }),
    UserModel.findById(userId),
  ]);

  if (!plan) throw new AppError("Plan not found or inactive", 404);
  if (!user) throw new AppError("User not found", 404);

  const existing = await SubscriptionModel.findOne({ user: userId });
  if (existing) {
    existing.history.push({
      fromPlan: existing.planName,
      toPlan: planName,
      reason: "admin_create",
    });
    existing.plan = plan._id;
    existing.planName = planName;
    existing.status = planName === "free" ? "free" : "active";
    existing.startDate = new Date();
    existing.endDate =
      planName === "free"
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await existing.save();
    return existing;
  }

  const sub = await SubscriptionModel.create({
    user: userId,
    plan: plan._id,
    planName,
    status: planName === "free" ? "free" : "active",
    startDate: new Date(),
    endDate:
      planName === "free"
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await UserModel.findByIdAndUpdate(userId, { subscription: sub._id });
  return sub;
};
export const getSubscriptionStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const calcGrowth = (current, previous) => {
    if (!previous) return 100;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };

  const [tierStats, totalSubs, thisMonthSubs, lastMonthSubs] = await Promise.all([
    // توزيع الـ tiers
    SubscriptionModel.aggregate([
      {
        $group: {
          _id: "$planName",
          count: { $sum: 1 },
        },
      },
    ]),

    // إجمالي الـ subscriptions
    SubscriptionModel.countDocuments(),

    // الشهر ده
    SubscriptionModel.countDocuments({
      createdAt: { $gte: startOfMonth },
    }),

    // الشهر اللي فات
    SubscriptionModel.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
  ]);

  const tiers = tierStats.map((tier) => ({
    name: tier._id,
    count: tier.count,
    percentage: parseFloat(((tier.count / totalSubs) * 100).toFixed(1)),
  }));

  return {
    total: totalSubs,
    growth: calcGrowth(thisMonthSubs, lastMonthSubs),
    tiers,
  };
};