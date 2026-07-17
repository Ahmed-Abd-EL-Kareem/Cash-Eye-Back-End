// aiUsage.middleware.js
// Middleware that logs AI usage to the AIUsage collection.
// Wraps res.json to capture the response (success or error) after the handler runs.
// Usage: router.post("/chat", protect, aiUsageMiddleware("chat"), controller.chat);

import AIUsageModel from "../modules/aiUsage/aiUsage.model.js";
import SubscriptionModel from "../modules/subscriptions/subscription.model.js";
import logger from "../config/logger.js";

/**
 * Record actual AI usage after a successful response.
 * Call this in controllers after the AI service returns.
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

  // Token accounting
  if (tokensUsed > 0) {
    subscription.usage.tokensUsedThisMonth =
      (subscription.usage.tokensUsedThisMonth || 0) + tokensUsed;
  }

  // Trip quota accounting
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
  async (req, res, next) => {
    const subscription = await SubscriptionModel.findOne({
      user: req.user._id,
    }).populate("plan", "limits name");

    if (!subscription) {
      return next(
        new (await import("../utils/apiError.js")).default(
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

    // Check monthly token quota (all AI features)
    if (
      tokensPerMonth != null &&
      subscription.usage.tokensUsedThisMonth >= tokensPerMonth
    ) {
      return next(
        new (await import("../utils/apiError.js")).default(
          `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Please upgrade your plan.`,
          429
        )
      );
    }

    // Check daily request quota (all AI features)
    if (subscription.usage.requestsToday >= requestsPerDay) {
      return next(
        new (await import("../utils/apiError.js")).default(
          `Daily AI request limit reached (${requestsPerDay}/day). Upgrade to Traveler plan for more.`,
          429
        )
      );
    }

    // Check monthly trip quota (trip generation only)
    if (isTripGeneration) {
      const tripsThisMonth = subscription.usage.tripsThisMonth || 0;
      const tripsLimit =
        subscription.plan.limits.tripsPerMonth ??
        (subscription.planName === "free" ? 3 : Infinity);

      if (tripsLimit !== Infinity && tripsThisMonth >= tripsLimit) {
        return next(
          new (await import("../utils/apiError.js")).default(
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
  };

/**
 * Middleware factory that creates an AI usage logger for a specific feature.
 * Logs to the AIUsage collection after the response is sent.
 *
 * @param {string} feature - One of: "chat", "bookingConversation", "hotelAiSearch", "recommendations", "tripPlanner"
 * @returns {Function} Express middleware
 */
export const aiUsageMiddleware = (feature) => {
  return async (req, res, next) => {
    const start = Date.now();

    // Store original json method to call after logging
    const originalJson = res.json.bind(res);

    // Override res.json to log usage after the handler completes
    res.json = (body) => {
      // Calculate latency
      const latencyMs = Date.now() - start;

      // Determine status from HTTP status code
      const status = res.statusCode < 400 ? "success" : "error";

      // Extract tokens and sessionId from response body
      const tokensUsed = body?.data?.tokensUsed || 0;
      const sessionId = body?.data?.sessionId || req.body?.sessionId || null;
      const model = req.body?.model || "gpt-4o-mini"; // Default, can be overridden by controllers

      // Error message if failed
      const errorMessage = status === "error" ? (body?.message || body?.error || "Unknown error") : undefined;

      // Fire-and-forget logging to avoid blocking response
      AIUsageModel.create({
        user: req.user?._id,
        feature,
        sessionId,
        model,
        totalTokens: tokensUsed,
        latencyMs,
        status,
        errorMessage,
      }).catch((err) => {
        logger.error(`[AIUsage] Failed to log usage for feature "${feature}":`, err);
      });

      // Call original json
      return originalJson(body);
    };

    next();
  };
};