import AIUsageModel from "./aiUsage.model.js";
import AILogModel from "./aiLog.model.js";
import TripModel from "../trips/trip.model.js";

/**
 * Increment or create daily usage counter
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.feature
 * @param {number} params.tokensUsed
 * @param {number} params.cost
 * @returns {Promise<Object>}
 */
export const incrementUsage = async ({ userId, feature, tokensUsed, cost = 0 }) => {
  const date = new Date().toISOString().split("T")[0];

  return AIUsageModel.findOneAndUpdate(
    { user: userId, feature, date },
    {
      $inc: { tokensUsed, requestCount: 1, cost },
      $setOnInsert: { user: userId, feature, date },
    },
    { upsert: true, new: true }
  );
};

/**
 * Get today's usage for a user and feature
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.feature
 * @returns {Promise<Object|null>}
 */
export const getUsageToday = async ({ userId, feature }) => {
  const date = new Date().toISOString().split("T")[0];
  return AIUsageModel.findOne({ user: userId, feature, date }).lean();
};

/**
 * Get usage for a user across all features for a date range
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.from - YYYY-MM-DD
 * @param {string} params.to - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export const getUserUsageRange = async ({ userId, from, to }) => {
  return AIUsageModel.find({
    user: userId,
    date: { $gte: from, $lte: to },
  }).sort({ date: -1 }).lean();
};

/**
 * Get aggregated usage by user for a date range
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getUsageByUser = async ({ from, to }) => {
  return AIUsageModel.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$user",
        totalTokens: { $sum: "$tokensUsed" },
        totalRequests: { $sum: "$requestCount" },
        totalCost: { $sum: "$cost" },
      },
    },
    { $sort: { totalTokens: -1 } },
  ]);
};

/**
 * Get aggregated usage by feature for a date range
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getUsageByFeature = async ({ from, to }) => {
  return AIUsageModel.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$feature",
        totalTokens: { $sum: "$tokensUsed" },
        totalRequests: { $sum: "$requestCount" },
        totalCost: { $sum: "$cost" },
      },
    },
  ]);
};

/**
 * Get daily usage trend for a date range
 * @param {Object} params
 * @param {string} params.from
 * @param {string} params.to
 * @returns {Promise<Array>}
 */
export const getDailyUsageTrend = async ({ from, to }) => {
  return AIUsageModel.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$date",
        totalTokens: { $sum: "$tokensUsed" },
        totalRequests: { $sum: "$requestCount" },
        totalCost: { $sum: "$cost" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/**
 * Get dashboard statistics
 * @returns {Promise<Object>}
 */
export const getDashboardStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalAITrips, totalRequests, requestsToday, stats] = await Promise.all([
    TripModel.countDocuments({ isAIGenerated: true }),
    AIUsageModel.countDocuments(),
    AIUsageModel.countDocuments({ createdAt: { $gte: startOfToday } }),
    AIUsageModel.aggregate([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$tokensUsed" },
          totalCost: { $sum: "$cost" },
        },
      },
    ]),
  ]);

  const aggregateStats = stats[0] || { totalTokens: 0, totalCost: 0 };

  return {
    totalAITrips,
    totalRequests,
    totalTokens: aggregateStats.totalTokens,
    totalCost: Number(aggregateStats.totalCost.toFixed(6)),
    requestsToday,
  };
};

/**
 * Create a detailed AI log entry
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createLog = async (data) => {
  return AILogModel.create(data);
};

/**
 * Find AI logs with filtering and pagination
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export const findLogs = async ({
  page = 1,
  limit = 20,
  userId,
  feature,
  status,
  from,
  to,
}) => {
  const filter = {};
  if (userId) filter.user = userId;
  if (feature) filter.feature = feature;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [logs, total] = await Promise.all([
    AILogModel.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AILogModel.countDocuments(filter),
  ]);

  return { logs, total, page: pageNum, limit: limitNum };
};

/**
 * Find a single log by ID
 * @param {string} logId
 * @returns {Promise<Object|null>}
 */
export const findLogById = async (logId) => {
  return AILogModel.findById(logId).populate("user", "name email").lean();
};

/**
 * Get recent AI logs (for dashboard)
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getRecentLogs = async (limit = 10) => {
  return AILogModel.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get log statistics
 * @returns {Promise<Object>}
 */
export const getLogStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalLogs, logsToday, stats] = await Promise.all([
    AILogModel.countDocuments(),
    AILogModel.countDocuments({ createdAt: { $gte: startOfToday } }),
    AILogModel.aggregate([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          averageLatency: { $avg: "$latencyMs" },
          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          errorCount: {
            $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const aggregateStats = stats[0] || {
    totalTokens: 0,
    averageLatency: 0,
    successCount: 0,
    errorCount: 0,
  };

  const successRate =
    totalLogs > 0
      ? Number(((aggregateStats.successCount / totalLogs) * 100).toFixed(2))
      : 100;

  return {
    totalLogs,
    logsToday,
    totalTokens: aggregateStats.totalTokens,
    averageLatency: Number(aggregateStats.averageLatency?.toFixed(2) || 0),
    successRate,
  };
};