import SubscriptionModel from "../modules/subscriptions/subscription.model.js";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkSubscription = asyncHandler(async (req, res, next) => {
  const subscription = await SubscriptionModel.findOne({
    user: req.user._id,
  }).populate("plan", "limits name displayName");

  if (!subscription) {
    return next(
      new ApiError(
        "No active subscription found. Please subscribe to continue.",
        403
      )
    );
  }

  subscription.checkAndResetMonthly();
  subscription.checkAndResetDaily();
  await subscription.save();

  const { tokensPerMonth, requestsPerDay } = subscription.plan.limits;

  if (subscription.usage.requestsToday >= requestsPerDay) {
    return next(
      new ApiError(
        `Daily request limit reached (${requestsPerDay}/day). Please upgrade your plan.`,
        429
      )
    );
  }

  if (subscription.usage.tokensUsedThisMonth >= tokensPerMonth) {
    return next(
      new ApiError(
        `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Please upgrade your plan.`,
        429
      )
    );
  }

  req.subscription = subscription;
  req.planLimits = subscription.plan.limits;

  next();
});

export const requirePlan = (...allowedPlans) =>
  asyncHandler(async (req, res, next) => {
    const subscription = await SubscriptionModel.findOne({
      user: req.user._id,
    });

    if (!subscription || !allowedPlans.includes(subscription.planName)) {
      return next(
        new ApiError(
          `This feature requires a ${allowedPlans.join(" or ")} plan. Please upgrade.`,
          403
        )
      );
    }

    next();
  });
