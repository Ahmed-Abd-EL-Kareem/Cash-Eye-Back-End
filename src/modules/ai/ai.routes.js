import { Router } from "express";
import { chatController, recommendHotelsController } from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { checkSubscription } from "../../middleware/subscription.middleware.js";

const router = Router();

// ─── AI Routes ────────────────────────────────────────────
router.post("/chat", protect, checkSubscription, chatController);
router.post("/recommend-hotels", protect, checkSubscription, recommendHotelsController);

export default router;