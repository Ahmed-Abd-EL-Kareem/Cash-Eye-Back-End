import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as subscriptionService from "./subscription.service.js";
import PlanModel from "./plan/plan.model.js";

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
