// import { asyncHandler } from "../../utils/asyncHandler.js";
// import ApiError from "../../utils/apiError.js";
// import * as subscriptionService from "./subscription.service.js";
// import PlanModel from "./plan/plan.model.js";

// export const getPlans = asyncHandler(async (req, res) => {
//   const plans = await PlanModel.find({ isActive: true }).sort("sortOrder");
//   res.status(200).json({ status: "success", length: plans.length, data: plans });
// });

// export const getMySubscription = asyncHandler(async (req, res) => {
//   const sub = await subscriptionService.getMySubscription(req.user._id);
//   res.status(200).json({ status: "success", data: sub });
// });

// export const changePlan = asyncHandler(async (req, res) => {
//   const { planName } = req.body;
//   if (!planName) throw new ApiError("planName is required", 400);

//   const sub = await subscriptionService.changePlan(req.user._id, planName);
//   res.status(200).json({ status: "success", data: sub });
// });

// export const adminGetAllSubscriptions = asyncHandler(async (req, res) => {
//   const result = await subscriptionService.getAllSubscriptions(req.query);
//   res.status(200).json({ status: "success", ...result });
// });

// export const adminChangePlan = asyncHandler(async (req, res) => {
//   const { planName } = req.body;
//   if (!planName) throw new ApiError("planName is required", 400);

//   const sub = await subscriptionService.adminChangePlan(req.params.userId, planName);
//   res.status(200).json({ status: "success", data: sub });
// });

// export const adminGetPlanStats = asyncHandler(async (req, res) => {
//   const stats = await PlanModel.aggregate([
//     {
//       $lookup: {
//         from: "subscriptions",
//         localField: "_id",
//         foreignField: "plan",
//         as: "subscribers",
//       },
//     },
//     {
//       $project: {
//         name: 1,
//         displayName: 1,
//         "price.monthly": 1,
//         subscriberCount: { $size: "$subscribers" },
//         activeCount: {
//           $size: {
//             $filter: {
//               input: "$subscribers",
//               as: "s",
//               cond: { $eq: ["$$s.status", "active"] },
//             },
//           },
//         },
//       },
//     },
//   ]);

//   res.status(200).json({ status: "success", data: stats });
// });
// ? ////////////////////////////////////
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as subscriptionService from "./subscription.service.js";
import PlanModel from "./plan/plan.model.js";
import UserModel from "../users/user.model.js";
export const getPlans = asyncHandler(async (req, res) => {
  const plans = await PlanModel.find({ isActive: true }).sort("sortOrder");
  res.status(200).json({ status: "success", length: plans.length, data: plans });
});

export const getMySubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.getMySubscription(req.user._id);
  res.status(200).json({ status: "success", data: sub });
});

export const changePlan = asyncHandler(async (req, res) => {
  const { planName } = req.body;
  if (!planName) throw new ApiError("planName is required", 400);
  const sub = await subscriptionService.changePlan(req.user._id, planName);
  res.status(200).json({ status: "success", data: sub });
});

export const adminGetAllSubscriptions = asyncHandler(async (req, res) => {
  const result = await subscriptionService.getAllSubscriptions(req.query);
  res.status(200).json({ status: "success", ...result });
});

export const adminChangePlan = asyncHandler(async (req, res) => {
  const { planName } = req.body;
  if (!planName) throw new ApiError("planName is required", 400);
  const sub = await subscriptionService.adminChangePlan(req.params.userId, planName);
  res.status(200).json({ status: "success", data: sub });
});

export const adminGetPlanStats = asyncHandler(async (req, res) => {
  const stats = await PlanModel.aggregate([
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "plan",
        as: "subscribers",
      },
    },
    {
      $project: {
        name: 1,
        displayName: 1,
        "price.monthly": 1,
        subscriberCount: { $size: "$subscribers" },
        activeCount: {
          $size: {
            $filter: {
              input: "$subscribers",
              as: "s",
              cond: { $eq: ["$$s.status", "active"] },
            },
          },
        },
      },
    },
  ]);
  res.status(200).json({ status: "success", data: stats });
});

// ─── Admin: Create Plan ────────────────────────────────────────────────────────

export const createPlan = asyncHandler(async (req, res) => {
  const { name, displayName, description, price, features, limits, sortOrder } = req.body;

  if (!name) throw new ApiError("name is required", 400);
  if (!displayName) throw new ApiError("displayName is required", 400);
  if (!price?.monthly && price?.monthly !== 0) throw new ApiError("price.monthly is required", 400);

  const existing = await PlanModel.findOne({ name });
  if (existing) throw new ApiError("A plan with this name already exists", 400);

  const plan = await PlanModel.create({
    name,
    displayName,
    description,
    price: { monthly: price.monthly, yearly: price.yearly ?? 0 },
    features: features ?? [],
    limits: limits ?? {},
    sortOrder: sortOrder ?? 0,
    isActive: true,
  });

  res.status(201).json({ status: "success", data: plan });
});

// ─── Admin: Update Plan ────────────────────────────────────────────────────────

export const updatePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  // Prevent changing the plan name (used as identifier in subscriptions)
  delete req.body.name;

  const plan = await PlanModel.findByIdAndUpdate(
    planId,
    req.body,
    { new: true, runValidators: true }
  );

  if (!plan) throw new ApiError("Plan not found", 404);

  res.status(200).json({ status: "success", data: plan });
});

export const adminCreateSubscription = asyncHandler(async (req, res) => {
  const { email, planName } = req.body;

  if (!email) throw new ApiError("email is required", 400);
  if (!planName) throw new ApiError("planName is required", 400);

  const user = await UserModel.findOne({ email });
  if (!user) throw new ApiError("No user found with this email", 404);

  const sub = await subscriptionService.adminCreateSubscription(user._id, planName);
  res.status(201).json({ status: "success", data: sub });
});
// ─── Admin: Cancel Any User's Subscription ────────────────────────────────────

export const adminCancelSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.adminCancelSubscription(req.params.userId);
  res.status(200).json({ status: "success", data: sub });
});

// ─── Admin: Get Expiring Subscriptions ────────────────────────────────────────

export const adminGetExpiringSubscriptions = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const subs = await subscriptionService.getExpiringSubscriptions(days);
  res.status(200).json({ status: "success", length: subs.length, data: subs });
});

// ─── Admin: Get Churn Stats ────────────────────────────────────────────────────

export const adminGetChurnStats = asyncHandler(async (req, res) => {
  const stats = await subscriptionService.getChurnStats();
  res.status(200).json({ status: "success", data: stats });
});

// ─── User: Cancel Own Subscription ───────────────────────────────────────────

export const cancelSubscription = asyncHandler(async (req, res) => {
  const sub = await subscriptionService.cancelSubscription(req.user._id);
  res.status(200).json({ status: "success", data: sub });
});
export const getSubscriptionStats = asyncHandler(async (req, res) => {
  const stats = await subscriptionService.getSubscriptionStats();
  res.status(200).json({ status: "success", data: stats });
});