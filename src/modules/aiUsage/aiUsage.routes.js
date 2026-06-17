import { Router } from "express";
import * as aiUsageController from "./aiUsage.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { validateCreateAIUsage } from "./aiUsage.validation.js";

const router = Router();

// Protect all routes under /ai-usage - require authentication
router.use(protect);

// Endpoint to log AI usage manually/internally
router.post("/", validateCreateAIUsage, aiUsageController.createUsage);

// Admin-only dashboard & statistics monitoring routes
router.get("/dashboard", restrictTo("admin"), aiUsageController.getDashboardStats);
router.get("/recent", restrictTo("admin"), aiUsageController.getRecentLogs);
router.get("/models", restrictTo("admin"), aiUsageController.getMostUsedModels);
router.get("/top-users", restrictTo("admin"), aiUsageController.getTopUsers);
router.get("/top-destinations", restrictTo("admin"), aiUsageController.getTopDestinations);

export default router;
