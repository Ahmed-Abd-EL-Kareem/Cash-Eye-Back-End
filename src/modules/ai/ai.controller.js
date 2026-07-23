import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as aiService from "./ai.service.js";
import { successResponse } from "../../utils/apiResponse.js";
import { recordAIUsage } from "../../middleware/aiUsage.middleware.js";

// POST /api/v1/ai/chat
// Body: { message: "string", sessionId: "string (optional)" }
export const chat = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    throw new ApiError("message is required", 400);
  }

  const result = await aiService.chat(message, sessionId, { userId: req.user._id });

  // Get tokens from the assistant's last message
  const assistantMessage = result.messages
    ? [...result.messages].reverse().find((m) => m.role === "assistant")
    : null;

  await recordAIUsage(req, {
    feature: "chat",
    tokensUsed: assistantMessage?.tokensUsed || 0,
  });

  successResponse(res, {
    message: "Chat response generated",
    data: result,
  });
});

// GET /api/v1/ai/chat/:sessionId
export const getChatConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400);
  }

  const result = await aiService.getChatConversation(sessionId, req.user._id);

  if (!result) {
    throw new ApiError("Conversation not found", 404);
  }

  successResponse(res, {
    message: "Conversation fetched",
    data: result,
  });
});

// GET /api/v1/ai/chat
export const listChatConversations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await aiService.listChatConversations(req.user._id, limit);

  successResponse(res, {
    message: "Conversations fetched",
    data: result,
  });
});

// DELETE /api/v1/ai/chat/:sessionId
export const deleteChatConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400);
  }

  const deleted = await aiService.deleteChatConversation(sessionId, req.user._id);

  if (!deleted) {
    throw new ApiError("Conversation not found", 404);
  }

  successResponse(res, {
    message: "Conversation deleted",
    data: null,
  });
});

// PATCH /api/v1/ai/chat/:sessionId
export const renameChatConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { title } = req.body;

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400);
  }
  if (!title || !title.trim()) {
    throw new ApiError("title is required", 400);
  }

  const result = await aiService.renameChatConversation(sessionId, req.user._id, title);

  if (!result) {
    throw new ApiError("Conversation not found", 404);
  }

  successResponse(res, {
    message: "Conversation renamed",
    data: result,
  });
});

// POST /api/v1/ai/hotels/search
// Body: { query: "string", context: { tripId, checkIn, checkOut, guests, rooms } }
export const searchHotels = asyncHandler(async (req, res) => {
  const { query, context } = req.body;

  if (!query) {
    throw new ApiError("query is required", 400);
  }

  const result = await aiService.searchHotelsService(query, context || {});

  await recordAIUsage(req, {
    feature: "hotelAiSearch",
    tokensUsed: result.tokensUsed || 0,
  });

  successResponse(res, {
    message: "Hotel search completed",
    data: result,
  });
});

// POST /api/v1/ai/bookings/conversation
// Body: { message: "string", sessionId: "string (optional)", context: {} }
export const bookingConversation = asyncHandler(async (req, res) => {
  const { message, sessionId, context } = req.body;

  if (!message) {
    throw new ApiError("message is required", 400);
  }

  const enrichedContext = {
    ...(context || {}),
    userId: req.user._id,
  };

  const result = await aiService.bookingConversation(message, sessionId, enrichedContext);

  await recordAIUsage(req, {
    feature: "bookingConversation",
    tokensUsed: result.tokensUsed || 0,
  });

  successResponse(res, {
    message: "Booking conversation processed",
    data: result,
  });
});

// GET /api/v1/ai/bookings/conversation/:sessionId
export const getBookingConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400);
  }

  const result = await aiService.getBookingConversation(sessionId, req.user._id);

  if (!result) {
    throw new ApiError("Conversation not found", 404);
  }

  successResponse(res, {
    message: "Conversation fetched",
    data: result,
  });
});

// DELETE /api/v1/ai/bookings/conversation/:sessionId
export const deleteBookingConversation = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError("sessionId is required", 400);
  }

  const deleted = await aiService.deleteBookingConversation(sessionId, req.user._id);

  if (!deleted) {
    throw new ApiError("Conversation not found", 404);
  }

  successResponse(res, {
    message: "Conversation deleted",
    data: null,
  });
});

// GET /api/v1/ai/bookings/conversations
export const listBookingConversations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await aiService.listBookingConversations(req.user._id, limit);

  successResponse(res, {
    message: "Conversations fetched",
    data: result,
  });
});

// GET /api/v1/ai/hotels/recommendations
// Query: ?tripId=string&limit=number&context=JSON string
export const getRecommendations = asyncHandler(async (req, res) => {
  const { tripId, limit, context } = req.query;

  let parsedContext = {};
  if (context) {
    try { parsedContext = JSON.parse(context); } catch { parsedContext = {}; }
  }
  if (tripId) parsedContext.tripId = tripId;
  if (limit) parsedContext.limit = parseInt(limit, 10);

  const result = await aiService.getRecommendations(req.user._id, parsedContext);

  await recordAIUsage(req, {
    feature: "recommendations",
    tokensUsed: result.tokensUsed || 0,
  });

  successResponse(res, {
    message: "Recommendations generated",
    data: result,
  });
});

// GET /api/v1/ai/stats
export const getAiStats = asyncHandler(async (req, res) => {
  const data = await aiService.getAiStats();
  successResponse(res, {
    message: "AI stats fetched successfully",
    data,
  });
});