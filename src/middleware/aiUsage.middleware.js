// aiUsage.middleware.js
// Middleware for AI usage quota checking and logging

import AIUsageModel from "../modules/aiUsage/aiUsage.model.js";
import AILogModel from "../modules/aiUsage/aiLog.model.js";
import SubscriptionModel from "../modules/subscriptions/subscription.model.js";
import logger from "../config/logger.js";
import ApiError from "../utils/apiError.js";

/**
 * Check if user has exceeded their AI usage quota
 * Attaches subscription info to req for downstream use
 *
 * @param {boolean} isTripGeneration - Pass true for trip generation routes
 * @returns {Function} Express middleware
 */
export const checkAIQuota = (isTripGeneration = false) => async (req, res, next) => {
  try {
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

    // Reset counters if new day/month
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
        new ApiError(
          `Monthly token limit reached (${tokensPerMonth.toLocaleString()} tokens). Please upgrade your plan.`,
          429
        )
      );
    }

    // Check daily request quota (all AI features)
    if (subscription.usage.requestsToday >= requestsPerDay) {
      return next(
        new ApiError(
          `Daily AI request limit reached (${requestsPerDay}/day). Upgrade for more.`,
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
  } catch (error) {
    logger.error("[AIUsage] Quota check failed:", error);
    next(error);
  }
};

/**
 * Record AI usage after a successful AI call
 * This should be called in the controller AFTER the AI service returns
 *
 * @param {Object} params
 * @param {string} params.feature - Feature name
 * @param {string} params.sessionId - Session ID (optional)
 * @param {string} params.tripId - Trip ID (optional)
 * @param {string} params.prompt - Prompt text
 * @param {string} params.response - Response text
 * @param {string} params.model - Model name
 * @param {number} params.promptTokens - Prompt tokens
 * @param {number} params.completionTokens - Completion tokens
 * @param {number} params.totalTokens - Total tokens
 * @param {number} params.cost - Cost in USD
 * @param {number} params.latencyMs - Latency in ms
 * @param {string} params.status - "success" or "error"
 * @param {string} params.errorMessage - Error message if failed
 */
export const recordAIUsage = async (req, params) => {
  const {
    feature,
    sessionId = null,
    tripId = null,
    prompt = "",
    response = "",
    model = "gpt-4o-mini",
    promptTokens = 0,
    completionTokens = 0,
    totalTokens = promptTokens + completionTokens,
    cost = 0,
    latencyMs = 0,
    status = "success",
    errorMessage = null,
  } = params;

  const date = new Date().toISOString().split("T")[0];

  try {
    // Increment daily usage counter (upsert)
    await AIUsageModel.findOneAndUpdate(
      { user: req.user._id, feature, date },
      {
        $inc: { tokensUsed: totalTokens, requestCount: 1, cost },
        $setOnInsert: { user: req.user._id, feature, date },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Update subscription usage
    const subscription = await SubscriptionModel.findOne({ user: req.user._id });
    if (subscription) {
      subscription.usage.requestsToday += 1;
      subscription.usage.lastRequestDate = new Date();
      subscription.usage.tokensUsedThisMonth =
        (subscription.usage.tokensUsedThisMonth || 0) + totalTokens;
      if (tripId) {
        subscription.usage.tripsThisMonth =
          (subscription.usage.tripsThisMonth || 0) + 1;
      }
      await subscription.save();
    }

    // Create detailed log entry (fire-and-forget to avoid blocking response)
    AILogModel.create({
      user: req.user._id,
      feature,
      sessionId,
      trip: tripId,
      prompt,
      response,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      latencyMs,
      status,
      errorMessage,
    }).catch((err) => {
      logger.error(`[AIUsage] Failed to create log for feature "${feature}":`, err);
    });

    logger.info(
      `[AIUsage] recorded — user=${req.user._id} feature=${feature}` +
        ` tokens=${totalTokens} cost=${cost} latency=${latencyMs}ms status=${status}`
    );
  } catch (error) {
    logger.error("[AIUsage] Failed to record usage:", error);
    // Don't throw - logging failure shouldn't break the response
  }
};

/**
 * Middleware factory for logging AI usage after response
 * Use this in routes where you want automatic logging
 * 
 * @param {string} feature - Feature name
 * @returns {Function} Express middleware
 */
export const aiUsageMiddleware = (feature) => async (req, res, next) => {
  const start = Date.now();

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to capture response
  res.json = function (body) {
    const latencyMs = Date.now() - start;
    const status = res.statusCode < 400 ? "success" : "error";

    // Extract tokens from response body
    const tokensUsed = body?.data?.tokensUsed || 0;
    const sessionId = body?.data?.sessionId || req.body?.sessionId || null;
    const model = req.body?.model || "gpt-4o-mini";
    const errorMessage = status === "error" ? (body?.message || body?.error || "Unknown error") : undefined;

    // Fire-and-forget logging
    AILogModel.create({
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

    return originalJson(body);
  };

  next();
};

export default { checkAIQuota, recordAIUsage, aiUsageMiddleware };