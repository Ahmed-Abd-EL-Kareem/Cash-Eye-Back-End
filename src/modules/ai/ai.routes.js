import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";

const router = Router();

router.use(protect);

router.post("/chat", checkAIQuota(false), aiController.chat);
router.post("/hotels/search", checkAIQuota(false), aiController.searchHotels);
router.post("/bookings/conversation", checkAIQuota(false), aiController.bookingConversation);
router.get("/hotels/recommendations", checkAIQuota(false), aiController.getRecommendations);

export default router;