import asyncHandler from "../../utils/asyncHandler.js";
import * as aiUsageService from "./aiUsage.service.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * POST /api/v1/ai-usage
 * Create a new AI usage log entry (internal use by AI services)
 */
export const createUsage = asyncHandler(async (req, res) => {
  const usage = await aiUsageService.createUsage(req.body);
  createdResponse(res, {
    message: "AI usage log created successfully",
    data: usage,
  });
});

/**
 * GET /api/v1/ai-usage/usage/me
 * Get current user's AI usage for today
 */
export const getMyUsage = asyncHandler(async (req, res) => {
  const usage = await aiUsageService.getMyUsageToday(req.user._id);
  successResponse(res, {
    message: "Your AI usage fetched successfully",
    data: usage,
  });
});

/**
 * GET /api/v1/ai-usage/usage/me/range
 * Get current user's AI usage for a date range
 */
export const getMyUsageRange = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    throw new ApiError("from and to query parameters are required (YYYY-MM-DD)", 400);
  }
  const usage = await aiUsageService.getMyUsageRange({ userId: req.user._id, from, to });
  successResponse(res, {
    message: "Your AI usage range fetched successfully",
    data: usage,
  });
});

/**
 * GET /api/v1/ai-usage/usage/summary
 * Admin: Get AI usage summary (by user, by feature, daily trend)
 */
export const getUsageSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    throw new ApiError("from and to query parameters are required (YYYY-MM-DD)", 400);
  }

  const [byUser, byFeature, dailyTrend] = await Promise.all([
    aiUsageService.getUsageByUserAggregated({ from, to }),
    aiUsageService.getUsageByFeatureAggregated({ from, to }),
    aiUsageService.getDailyUsageTrendAggregated({ from, to }),
  ]);

  successResponse(res, {
    message: "AI usage summary fetched successfully",
    data: { byUser, byFeature, dailyTrend },
  });
});

/**
 * GET /api/v1/ai-usage
 * Admin: List AI usage logs with filtering and pagination
 */
export const listUsage = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    feature,
    userId,
    status,
    from,
    to,
  } = req.query;

  const cappedLimit = Math.min(Number(limit), 100);

  const result = await aiUsageService.listUsage({
    page: Number(page),
    limit: cappedLimit,
    feature,
    userId,
    status,
    from,
    to,
  });

  successResponse(res, {
    message: "AI usage logs fetched successfully",
    data: result,
  });
});

/**
 * GET /api/v1/ai-usage/stats
 * Admin: Get AI usage statistics aggregated by feature
 */
export const getUsageStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const stats = await aiUsageService.getUsageStats({ from, to });
  successResponse(res, {
    message: "AI usage stats fetched successfully",
    data: stats,
  });
});

/**
 * GET /api/v1/ai-usage/dashboard
 * Admin: Retrieve overall AI usage metrics and dashboard indicators
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await aiUsageService.getDashboardStatistics();
  successResponse(res, {
    message: "AI usage dashboard stats fetched successfully",
    data: stats,
  });
});

/**
 * GET /api/v1/ai-usage/logs
 * Admin: Get paginated AI logs with filters
 */
export const getLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    userId,
    feature,
    status,
    from,
    to,
  } = req.query;

  const cappedLimit = Math.min(Number(limit), 100);

  const result = await aiUsageService.getLogs({
    page: Number(page),
    limit: cappedLimit,
    userId,
    feature,
    status,
    from,
    to,
  });

  successResponse(res, {
    message: "AI logs fetched successfully",
    data: result,
  });
});

/**
 * GET /api/v1/ai-usage/logs/:logId
 * Admin: Get a single AI log by ID
 */
export const getLogById = asyncHandler(async (req, res) => {
  const { logId } = req.params;
  const log = await aiUsageService.getLogById(logId);

  if (!log) {
    throw new ApiError("AI log not found", 404);
  }

  successResponse(res, {
    message: "AI log fetched successfully",
    data: log,
  });
});

/**
 * GET /api/v1/ai-usage/recent
 * Admin: Retrieve the list of most recent AI logs
 */
export const getRecentLogs = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
  const logs = await aiUsageService.getRecentAiLogs(limit);
  successResponse(res, {
    message: "Recent AI usage logs fetched successfully",
    length: logs.length,
    data: logs,
  });
});

/**
 * GET /api/v1/ai-usage/models
 * Admin: Retrieve stats on the most frequently used models
 */
export const getMostUsedModels = asyncHandler(async (req, res) => {
  const models = await aiUsageService.getMostUsedModels();
  successResponse(res, {
    message: "Most used models fetched successfully",
    length: models.length,
    data: models,
  });
});

/**
 * GET /api/v1/ai-usage/top-users
 * Admin: Retrieve the list of users who have requested the most AI generations
 */
export const getTopUsers = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 5;
  const users = await aiUsageService.getTopUsers(limit);
  successResponse(res, {
    message: "Top users fetched successfully",
    length: users.length,
    data: users,
  });
});

/**
 * GET /api/v1/ai-usage/top-destinations
 * Admin: Retrieve the list of destination names most generated by AI
 */
export const getTopDestinations = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 10;
  const destinations = await aiUsageService.getTopDestinations(limit);
  successResponse(res, {
    message: "Top destinations fetched successfully",
    length: destinations.length,
    data: destinations,
  });
});

/**
 * GET /api/v1/ai-usage/:id
 * Admin: Retrieve a single AI usage log by ID (legacy)
 */
export const getUsageById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const usage = await aiUsageService.getUsageById(id);

  if (!usage) {
    throw new ApiError("AI usage log not found", 404);
  }

  successResponse(res, {
    message: "AI usage log fetched successfully",
    data: usage,
  });
});