import { Router } from "express";
import * as aiUsageController from "./aiUsage.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as aiUsageValidation from "./aiUsage.validation.js";

const router = Router();

// Admin-only routes (require admin role)
router.use(protect, restrictTo("admin"));

// Dashboard stats
router.get("/dashboard", aiUsageController.getDashboardStats);

// Usage summary (aggregated) - admin
router.get(
  "/usage/summary",
  validate(aiUsageValidation.dateRange),
  aiUsageController.getUsageSummary
);

// Admin: List AI usage logs with filters
router.get(
  "/",
  validate(aiUsageValidation.listUsage),
  aiUsageController.listUsage
);

// Admin: Get usage stats aggregated by feature
router.get(
  "/stats",
  validate(aiUsageValidation.dateRangeOptional),
  aiUsageController.getUsageStats
);

// Admin: Get recent logs
router.get("/recent", aiUsageController.getRecentLogs);

// Admin: Get most used models
router.get("/models", aiUsageController.getMostUsedModels);

// Admin: Get top users
router.get("/top-users", aiUsageController.getTopUsers);

// Admin: Get top destinations
router.get("/top-destinations", aiUsageController.getTopDestinations);

// Admin: Get paginated AI logs
router.get(
  "/logs",
  validate(aiUsageValidation.getLogs),
  aiUsageController.getLogs
);

// Admin: Get single log by ID
router.get("/logs/:logId", aiUsageController.getLogById);

// Legacy route - get usage by ID
router.get("/:id", aiUsageController.getUsageById);

// User-facing routes (authenticated user)
router.use(protect);

// Get current user's AI usage for today
router.get("/usage/me", aiUsageController.getMyUsage);

// Get current user's AI usage for a date range
router.get("/usage/me/range", validate(aiUsageValidation.dateRange), aiUsageController.getMyUsageRange);

export default router;