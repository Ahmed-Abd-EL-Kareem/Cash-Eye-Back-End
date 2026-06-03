import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";

const router = Router();

router.use(protect);

// POST /api/v1/ai/chat
// checkAIQuota(false) — deducts from requestsToday only (not tripsThisMonth)
router.post("/chat", checkAIQuota(false), aiController.chat);

export default router;