import {
  incrementUsage,
  getUsageToday,
  getUserUsageRange,
  getUsageByUser,
  getUsageByFeature,
  getDailyUsageTrend,
  getDashboardStats,
  createLog,
  findLogs,
  findLogById,
  getRecentLogs,
  getLogStats,
} from "./aiUsage.repository.js";
import AIUsageModel from "./aiUsage.model.js";
import ApiError from "../../utils/apiError.js";

/**
 * Check if user has exceeded their AI usage limit for a feature today
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.feature
 * @param {number} params.tokensRequested
 * @returns {Promise<{ allowed: boolean; usage: Object; limit: number; remaining: number }>}
 */
export const checkUsageLimit = async ({ userId, feature, tokensRequested = 0 }) => {
  const usage = await getUsageToday({ userId, feature });
  const limit = getLimitForFeature(feature);
  const currentUsage = usage?.tokensUsed || 0;
  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage + tokensRequested <= limit;

  return {
    allowed,
    usage: usage || { tokensUsed: 0, requestCount: 0, cost: 0 },
    limit,
    remaining,
    tokensRequested,
  };
};

/**
 * Get the token limit for a feature based on user's plan
 * TODO: Integrate with user subscription plan
 * @param {string} feature
 * @returns {number}
 */
export const getLimitForFeature = (feature) => {
  const limits = {
    chat: 50000,
    bookingConversation: 100000,
    hotelAiSearch: 30000,
    recommendations: 20000,
    tripPlanner: 50000,
  };
  return limits[feature] || 10000;
};

/**
 * Record AI usage (increment counter) and create detailed log entry
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export const recordAiUsage = async ({
  userId,
  feature,
  sessionId,
  tripId,
  prompt,
  response,
  model,
  promptTokens,
  completionTokens,
  totalTokens,
  cost,
  latencyMs,
  status = "success",
  errorMessage = null,
}) => {
  const [usage, log] = await Promise.all([
    incrementUsage({
      userId,
      feature,
      tokensUsed: totalTokens,
      cost,
    }),
    createLog({
      user: userId,
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
    }),
  ]);

  return { usage, log };
};

/**
 * Get current user's AI usage for today across all features
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getMyUsageToday = async (userId) => {
  const date = new Date().toISOString().split("T")[0];
  return AIUsageModel.find({ user: userId, date }).lean();
};

/**
 * Get current user's AI usage for a date range
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.from - YYYY-MM-DD
 * @param {string} params.to - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export const getMyUsageRange = async ({ userId, from, to }) => {
  return getUserUsageRange({ userId, from, to });
};

/**
 * Get aggregated usage by user for admin dashboard
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getUsageByUserAggregated = async ({ from, to }) => {
  return getUsageByUser({ from, to });
};

/**
 * Get aggregated usage by feature for admin dashboard
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getUsageByFeatureAggregated = async ({ from, to }) => {
  return getUsageByFeature({ from, to });
};

/**
 * Get daily usage trend for admin dashboard
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getDailyUsageTrendAggregated = async ({ from, to }) => {
  return getDailyUsageTrend({ from, to });
};

/**
 * Get dashboard statistics
 * @returns {Promise<Object>}
 */
export const getDashboardStatistics = async () => {
  return getDashboardStats();
};

/**
 * Get paginated AI logs with filters
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export const getLogs = async (params) => {
  return findLogs(params);
};

/**
 * Get single log by ID
 * @param {string} logId
 * @returns {Promise<Object|null>}
 */
export const getLogById = async (logId) => {
  return findLogById(logId);
};

/**
 * Get recent logs for dashboard
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getRecentAiLogs = async (limit = 10) => {
  return getRecentLogs(limit);
};

/**
 * Get log statistics
 * @returns {Promise<Object>}
 */
export const getLogStatistics = async () => {
  return getLogStats();
};