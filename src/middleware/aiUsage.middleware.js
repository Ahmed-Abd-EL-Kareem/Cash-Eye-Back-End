// aiUsage.middleware.js
// Checks quota BEFORE any AI route runs; increments usage AFTER a successful response.
//
// Quota types:
//   requestsToday      — all AI routes (chat, search, booking, recommendations)
//   tripsThisMonth     — trip generation only (isTripGeneration=true)
//   tokensUsedThisMonth— accumulated from actual LLM token usage returned by agents
//
// Usage in routes:
//   router.post("/chat",     checkAIQuota(false), aiController.chat);
//   router.post("/generate", checkAIQuota(true),  tripController.generateTrip);
//
// Usage in controllers after AI call:
//   await recordAIUsage(req.subscription, { isTripGeneration: false, tokensUsed: result.tokensUsed });

import SubscriptionModel from "../modules/subscriptions/subscription.model.js";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

/**
 * Record actual AI usage after a successful response.
 * Call this in every controller after the AI service returns.
 *
 * @param {object} subscription   - req.subscription set by checkAIQuota
 * @param {object} options
 * @param {boolean} options.isTripGeneration - true for POST /trips/generate
 * @param {number}  options.tokensUsed       - actual tokens consumed by the LLM
 */
export const recordAIUsage = async (
  subscription,
  { isTripGeneration = false, tokensUsed = 0 } = {}
) => {
  subscription.usage.requestsToday += 1;
  subscription.usage.lastRequestDate = new Date();

  // ── Token accounting ─────────────────────────────────────────────────────
  if (tokensUsed > 0) {
    subscription.usage.tokensUsedThisMonth =
      (subscription.usage.tokensUsedThisMonth || 0) + tokensUsed;
  }

  // ── Trip quota accounting ─────────────────────────────────────────────────
  if (isTripGeneration) {
    subscription.usage.tripsThisMonth =
      (subscription.usage.tripsThisMonth || 0) + 1;
  }

  await subscription.save();

  logger.info(
    `[AIUsage] recorded — requests_today=${subscription.usage.requestsToday}` +
    ` tokens_month=${subscription.usage.tokensUsedThisMonth}` +
    (isTripGeneration ? ` trips_month=${subscription.usage.tripsThisMonth}` : "")
  );
};

/**
 * Middleware: checks quota limits BEFORE the route handler runs.
 * Attaches subscription to req.subscription for use in recordAIUsage.
 *
 * @param {boolean} isTripGeneration - pass true for trip generation routes
 */
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

    const { requestsPerDay, tripsPerMonth, tokensPerMonth } = subscription.plan.limits;

    // ── Check monthly token quota (all AI features) ───────────────────────
    if (
      tokensPerMonth != null &&
      subscription.usage.tokensUsedThisMonth >= tokensPerMonth
    ) {
      return next(
        new ApiError(
          `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Please upgrade your plan.`,
          429
        )
      );
    }

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
        subscription.plan.limits.tripsPerMonth ??
        (subscription.planName === "free" ? 3 : Infinity);

      if (tripsLimit !== Infinity && tripsThisMonth >= tripsLimit) {
        return next(
          new ApiError(
            `Monthly trip limit reached (${tripsLimit} trips/month on the free plan). Upgrade to Traveler for unlimited trips.`,
            429
          )
        );
      }
    }

    req.subscription = subscription;
    req.isTripGeneration = isTripGeneration;

    logger.info(
      `[AIUsage] user=${req.user._id}` +
      ` requests_today=${subscription.usage.requestsToday}/${requestsPerDay}` +
      ` tokens_month=${subscription.usage.tokensUsedThisMonth}/${tokensPerMonth ?? "∞"}` +
      (isTripGeneration
        ? ` trips_month=${subscription.usage.tripsThisMonth || 0}/${tripsPerMonth ?? "∞"}`
        : "")
    );

    next();
  });