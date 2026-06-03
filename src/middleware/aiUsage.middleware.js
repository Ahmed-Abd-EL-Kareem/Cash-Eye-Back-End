// AI Usage Middleware
// Checks quota BEFORE any AI route runs and increments usage counters.
// Two quota types:
//   requestsToday    — applies to ALL AI routes (chat + trip generation)
//   tripsThisMonth   — applies only to trip generation (isTripGeneration=true)
//
// Usage in routes:
//   router.post("/chat",     checkAIQuota(false), aiController.chat);
//   router.post("/generate", checkAIQuota(true),  tripController.generateTrip);

import SubscriptionModel from "../modules/subscriptions/subscription.model.js";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

// Free plan trip limit per month
const FREE_TRIPS_PER_MONTH = 3;

export const checkAIQuota = (isTripGeneration = false) =>
  asyncHandler(async (req, res, next) => {
    const subscription = await SubscriptionModel.findOne({
      user: req.user._id,
    }).populate("plan", "limits name");

    if (!subscription) {
      return next(
        new ApiError(
          "No active subscription found. Please subscribe to continue.",
          403
        )
      );
    }

    // Reset counters if a new day/month has started
    subscription.checkAndResetMonthly();
    subscription.checkAndResetDaily();
    if (typeof subscription.checkAndResetTrips === "function") {
      subscription.checkAndResetTrips();
    }

    const { requestsPerDay } = subscription.plan.limits;

    // ── Check daily request quota (all AI features) ───────────────────────
    if (subscription.usage.requestsToday >= requestsPerDay) {
      return next(
        new ApiError(
          `Daily AI request limit reached (${requestsPerDay}/day). Upgrade to Traveler plan for more.`,
          429
        )
      );
    }

    // ── Check monthly trip quota (trip generation only) ───────────────────
    if (isTripGeneration) {
      const tripsThisMonth = subscription.usage.tripsThisMonth || 0;
      const tripsLimit =
        subscription.planName === "free" ? FREE_TRIPS_PER_MONTH : Infinity;

      if (tripsThisMonth >= tripsLimit) {
        return next(
          new ApiError(
            `Monthly trip limit reached (${tripsLimit} trips/month on the free plan). Upgrade to Traveler for unlimited trips.`,
            429
          )
        );
      }

      // Increment trip counter
      subscription.usage.tripsThisMonth =
        (subscription.usage.tripsThisMonth || 0) + 1;
    }

    // ── Increment daily request counter ───────────────────────────────────
    subscription.usage.requestsToday += 1;
    subscription.usage.lastRequestDate = new Date();
    await subscription.save();

    // Attach subscription to request for downstream use
    req.subscription = subscription;

    logger.info(
      `[AIUsage] user=${req.user._id} requests_today=${subscription.usage.requestsToday}/${requestsPerDay}` +
      (isTripGeneration
        ? ` trips_month=${subscription.usage.tripsThisMonth}`
        : "")
    );

    next();
  });