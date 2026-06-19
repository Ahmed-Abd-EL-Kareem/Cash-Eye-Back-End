import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();

router.use(protect);
router.get("/stats", restrictTo("admin"), aiController.getAiStats);


router.post("/chat", checkAIQuota(false), aiController.chat);
router.post("/hotels/search", checkAIQuota(false), aiController.searchHotels);
router.post("/bookings/conversation", checkAIQuota(false), aiController.bookingConversation);
router.get("/hotels/recommendations", checkAIQuota(false), aiController.getRecommendations);

export default router;