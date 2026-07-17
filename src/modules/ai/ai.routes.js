import { Router } from "express";
import * as aiController from "./ai.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";
import { aiUsageMiddleware } from "../../middleware/aiUsage.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
const router = Router();

router.use(protect);

router.post("/chat", checkAIQuota(false), aiUsageMiddleware("chat"), aiController.chat);
router.get("/chat", aiController.listChatConversations);
router.get("/chat/:sessionId", aiController.getChatConversation);
router.patch("/chat/:sessionId", aiController.renameChatConversation);
router.delete("/chat/:sessionId", aiController.deleteChatConversation);

router.post("/hotels/search", checkAIQuota(false), aiUsageMiddleware("hotelAiSearch"), aiController.searchHotels);
router.post("/bookings/conversation", checkAIQuota(false), aiUsageMiddleware("bookingConversation"), aiController.bookingConversation);
router.get("/hotels/recommendations", checkAIQuota(false), aiUsageMiddleware("recommendations"), aiController.getRecommendations);

// Booking conversation history endpoints (no quota check needed for read operations)
router.get("/bookings/conversation/:sessionId", aiController.getBookingConversation);
router.delete("/bookings/conversation/:sessionId", aiController.deleteBookingConversation);
router.get("/bookings/conversations", aiController.listBookingConversations);

router.get("/stats", restrictTo("admin"), aiController.getAiStats);
export default router;