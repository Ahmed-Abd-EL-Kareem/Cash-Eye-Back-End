import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import * as subscriptionService from "./subscription.service.js";
import PlanModel from "../plans/plan.model.js";


export const getPlans = catchAsync(async (req, res) => {
  const plans = await PlanModel.find({ isActive: true }).sort("sortOrder");
  res.status(200).json({ status: "success", length: plans.length, data: plans });
});

export const getMySubscription = catchAsync(async (req, res) => {
  const sub = await subscriptionService.getMySubscription(req.user._id);
  res.status(200).json({ status: "success", data: sub });
});

export const changePlan = catchAsync(async (req, res) => {
  const { planName } = req.body;
  if (!planName) throw new AppError("planName is required", 400);

  const sub = await subscriptionService.changePlan(req.user._id, planName);
  res.status(200).json({ status: "success", data: sub });
});

export const adminGetAllSubscriptions = catchAsync(async (req, res) => {
  const result = await subscriptionService.getAllSubscriptions(req.query);
  res.status(200).json({ status: "success", ...result });
});

export const adminChangePlan = catchAsync(async (req, res) => {
  const { planName } = req.body;
  if (!planName) throw new AppError("planName is required", 400);

  const sub = await subscriptionService.adminChangePlan(req.params.userId, planName);
  res.status(200).json({ status: "success", data: sub });
});

export const adminGetPlanStats = catchAsync(async (req, res) => {
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