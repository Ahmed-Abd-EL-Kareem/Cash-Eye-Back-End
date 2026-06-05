import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as aiService from "./ai.service.js";
import { successResponse } from "../../utils/apiResponse.js";

// POST /api/v1/ai/chat
// Body: { messages: [{ role: "user"|"assistant", content: "string" }] }
//
//
// The client keeps the conversation array and sends the full history
// on every request. The server is stateless — no session storage needed.
//
// Example:
// { "messages": [{ "role": "user", "content": "Best things to do in Luxor?" }] }
export const chat = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!messages) {
    throw new ApiError(
      "messages array is required. Body: { messages: [{ role, content }] }",
      400
    );
  }

  const result = await aiService.chat(messages);

  successResponse(res, {
    message: "Chat response generated",
    data: {
      reply: result.reply,
      tokensUsed: result.tokensUsed,
    },
  });
});

// POST /api/v1/ai/hotels/search
// Body: { query: "string", context: { tripId, checkIn, checkOut, guests, rooms } }
export const searchHotels = asyncHandler(async (req, res) => {
  const { query, context } = req.body;

  if (!query) {
    throw new ApiError("query is required", 400);
  }

  const result = await aiService.searchHotels(query, context || {});

  successResponse(res, {
    message: "Hotel search completed",
    data: result.data ?? result,
  });
});

// POST /api/v1/ai/bookings/conversation
// Body: { message: "string", sessionId: "string (optional)", context: { tripId, currentStep } }
export const bookingConversation = asyncHandler(async (req, res) => {
  const { message, sessionId, context } = req.body;

  if (!message) {
    throw new ApiError("message is required", 400);
  }

  const result = await aiService.bookingConversation(message, sessionId, context || {});

  successResponse(res, {
    message: "Booking conversation processed",
    data: result,
  });
});

// GET /api/v1/ai/hotels/recommendations
// Query: ?tripId=string&limit=number&context=JSON string
export const getRecommendations = asyncHandler(async (req, res) => {
  const { tripId, limit, context } = req.query;

  // Parse context if it's a JSON string
  let parsedContext = {};
  if (context) {
    try {
      parsedContext = JSON.parse(context);
    } catch (e) {
      // If parsing fails, use empty context
      parsedContext = {};
    }
  }

  // Add tripId to context if provided
  if (tripId) {
    parsedContext.tripId = tripId;
  }

  // Add limit to context if provided
  if (limit) {
    parsedContext.limit = parseInt(limit, 10);
  }

  const result = await aiService.getRecommendations(req.user._id, parsedContext);

  successResponse(res, {
    message: "Recommendations generated",
    data: result,
  });
});