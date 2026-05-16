import SubscriptionModel from "../subscriptions/subscription.model.js";
import PlanModel from "../subscriptions/plan.model.js";
import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";

export const checkSubscription = catchAsync(async (req, res, next) => {
  const subscription = await SubscriptionModel.findOne({
    user: req.user._id,
  }).populate("plan", "limits name");

  if (!subscription) {
    return next(new AppError("No subscription found. Please subscribe.", 403));
  }

  subscription.checkAndResetMonthly();
  subscription.checkAndResetDaily();
  await subscription.save();

  const { tokensPerMonth, requestsPerDay } = subscription.plan.limits;

  if (subscription.usage.requestsToday >= requestsPerDay) {
    return next(
      new AppError(
        `Daily request limit reached (${requestsPerDay}/day). Upgrade your plan.`,
        429
      )
    );
  }

  if (subscription.usage.tokensUsedThisMonth >= tokensPerMonth) {
    return next(
      new AppError(
        `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Upgrade your plan.`,
        429
      )
    );
  }

  req.subscription = subscription;
  req.planLimits = subscription.plan.limits;

  next();
});

export const requirePlan = (...allowedPlans) =>
  catchAsync(async (req, res, next) => {
    const subscription = await SubscriptionModel.findOne({ user: req.user._id });

    if (!subscription || !allowedPlans.includes(subscription.planName)) {
      return next(
        new AppError(
          `This feature requires a ${allowedPlans.join(" or ")} plan. Please upgrade.`,
          403
        )
      );
    }

    next();
  });
