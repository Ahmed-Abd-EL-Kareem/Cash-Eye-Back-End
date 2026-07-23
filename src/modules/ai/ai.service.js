import { chatWithRahal, searchHotels, getHotelRecommendations } from "../../integrations/langchain/chat.ai.js";
import { 
  processBookingMessage, 
  getBookingConversation as getBookingConv, 
  deleteBookingConversation as deleteBookingConv, 
  listBookingConversations as listBookingConvs 
} from "../../integrations/langchain/aiBookingConversation.js";
import { 
  sendChatMessage, 
  getChatConversation as getChatConv, 
  listChatConversations as listChatConvs, 
  deleteChatConversation as deleteChatConv,
  renameChatConversation as renameChatConv
} from "../../integrations/langchain/chatConversation.service.js";
import { generateTripPlan } from "../../integrations/langchain/tripPlanner.ai.js";
import ApiError from "../../utils/apiError.js";
import { getDashboardStatistics as getDashboardStats } from "../aiUsage/aiUsage.service.js";
import * as hotelService from "../hotels/hotel.service.js";

// ─── Chat ─────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/chat
// Body: { message: "string", sessionId: "string (optional)" }
export const chat = async (message, sessionId, context = {}) => {
  if (!message) {
    throw new ApiError("message is required", 400);
  }
  return sendChatMessage({ ...context, sessionId, message });
};

// GET /api/v1/ai/chat/:sessionId
export const getChatConversation = async (sessionId, userId) => {
  try {
    return await getChatConv(sessionId, userId);
  } catch (error) {
    throw new ApiError(`Failed to get chat conversation: ${error.message}`, 500);
  }
};

// GET /api/v1/ai/chat
export const listChatConversations = async (userId, limit = 20) => {
  try {
    return await listChatConvs(userId, limit);
  } catch (error) {
    throw new ApiError(`Failed to list chat conversations: ${error.message}`, 500);
  }
};

// DELETE /api/v1/ai/chat/:sessionId
export const deleteChatConversation = async (sessionId, userId) => {
  try {
    return await deleteChatConv(sessionId, userId);
  } catch (error) {
    throw new ApiError(`Failed to delete chat conversation: ${error.message}`, 500);
  }
};

// PATCH /api/v1/ai/chat/:sessionId
export const renameChatConversation = async (sessionId, userId, title) => {
  try {
    return await renameChatConv(sessionId, userId, title);
  } catch (error) {
    throw new ApiError(`Failed to rename chat conversation: ${error.message}`, 500);
  }
};

// ─── Hotel Search ─────────────────────────────────────────────────────────────
// POST /api/v1/ai/hotels/search
// Body: { query, context }
export const searchHotelsService = async (query, context = {}) => {
  try {
    const { reply, tokensUsed, hotelIds } = await searchHotels(query, context);
    const hotels = await hotelService.getHotelsByIds(hotelIds);

    return { reply, hotels, tokensUsed };
  } catch (error) {
    throw new ApiError(`Failed to process hotel search: ${error.message}`, 500);
  }
};

// ─── Booking Conversation ─────────────────────────────────────────────────────
// POST /api/v1/ai/bookings/conversation
// Body: { message, sessionId, context }
export const bookingConversation = async (message, sessionId, context = {}) => {
  try {
    return await processBookingMessage(sessionId, message, context);
  } catch (error) {
    throw new ApiError(`Failed to process booking conversation: ${error.message}`, 500);
  }
};

// GET /api/v1/ai/bookings/conversation/:sessionId
export const getBookingConversation = async (sessionId, userId) => {
  try {
    return await getBookingConv(sessionId, userId);
  } catch (error) {
    throw new ApiError(`Failed to get booking conversation: ${error.message}`, 500);
  }
};

// DELETE /api/v1/ai/bookings/conversation/:sessionId
export const deleteBookingConversation = async (sessionId, userId) => {
  try {
    return await deleteBookingConv(sessionId, userId);
  } catch (error) {
    throw new ApiError(`Failed to delete booking conversation: ${error.message}`, 500);
  }
};

// GET /api/v1/ai/bookings/conversations
export const listBookingConversations = async (userId, limit = 20) => {
  try {
    return await listBookingConvs(userId, limit);
  } catch (error) {
    throw new ApiError(`Failed to list booking conversations: ${error.message}`, 500);
  }
};

// ─── Recommendations ──────────────────────────────────────────────────────────
// GET /api/v1/ai/hotels/recommendations
export const getRecommendations = async (userId, context = {}) => {
  try {
    const { reply, tokensUsed, hotelIds } = await getHotelRecommendations(userId, context);
    const hotels = await hotelService.getHotelsByIds(hotelIds);

    return { reply, hotels, tokensUsed };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to get recommendations: ${error.message}`, 500);
  }
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export const getAiStats = async () => {
  const stats = await getDashboardStats();

  return {
    aiRequests: stats.totalRequests ?? 0,
    aiRequestsGrowth: stats.requestsGrowth ?? 0,
  };
};