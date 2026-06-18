// import { chatWithRahal } from "../../integrations/ai/chat.ai.js";
// import { parseHotelSearchQuery } from "../../integrations/ai/aiHotelSearch.js";
// import { processBookingMessage } from "../../integrations/ai/aiBookingConversation.js";
// import { getHotelRecommendations } from "../../integrations/ai/aiRecommendations.js";
// import { toHotelQuery, transformSearchResults } from "../../integrations/ai/hotelSearchTransformer.js";
// import ApiError from "../../utils/apiError.js";
// import * as hotelService from "../hotels/hotel.service.js";

// export const chat = async (messages) => {
//   if (!Array.isArray(messages) || messages.length === 0) {
//     throw new ApiError("messages must be a non-empty array", 400);
//   }
//   return chatWithRahal(messages);
// };

// export const searchHotels = async (query, context = {}) => {
//   try {
//     const interpretedFilters = await parseHotelSearchQuery(query, context);
//     const hotelQuery = toHotelQuery(interpretedFilters);
//     const { hotels: hotelsResult } = await hotelService.getAllHotels({
//       ...hotelQuery,
//       page: 1,
//       limit: Math.min(context.limit || 20, 50),
//     });

//     const aiResult = {
//       interpretedFilters,
//       hotels: hotelsResult,
//       suggestions: [],
//     };

//     return transformSearchResults(aiResult, hotelsResult);
//   } catch (error) {
//     throw new ApiError(`Failed to process hotel search: ${error.message}`, 500);
//   }
// };

// export const bookingConversation = async (message, sessionId, context = {}) => {
//   try {
//     // console.log(sessionId);
    
//     return await processBookingMessage(sessionId, message, context);
//   } catch (error) {
//     throw new ApiError(`Failed to process booking conversation: ${error.message}`, 500);
//   }
// };

// export const getRecommendations = async (userId, context = {}) => {
//   try {
//     return await getHotelRecommendations(userId, context);
//   } catch (error) {
//     if (error instanceof ApiError) throw error;
//     throw new ApiError(`Failed to get recommendations: ${error.message}`, 500);
//   }
// };
// ai.service.js
// Drop-in replacement for the old ai.service.js.
// All four endpoints now go through the single LangGraph multi-agent.
// Controllers require ZERO changes.

import { chatWithRahal, searchHotels, getHotelRecommendations } from "../../integrations/langchain/chat.ai.js";
import { processBookingMessage } from "../../integrations/langchain/aiBookingConversation.js";
import { generateTripPlan } from "../../integrations/langchain/tripPlanner.ai.js";
import ApiError from "../../utils/apiError.js";

// ─── Chat ─────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/chat
// Body: { messages: [{ role, content }] }
export const chat = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError("messages must be a non-empty array", 400);
  }
  return chatWithRahal(messages);
};

// ─── Hotel Search ─────────────────────────────────────────────────────────────
// POST /api/v1/ai/hotels/search
// Body: { query, context }
export const searchHotelsService = async (query, context = {}) => {
  try {
    return await searchHotels(query, context);
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

// ─── Recommendations ──────────────────────────────────────────────────────────
// GET /api/v1/ai/hotels/recommendations
export const getRecommendations = async (userId, context = {}) => {
  try {
    return await getHotelRecommendations(userId, context);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to get recommendations: ${error.message}`, 500);
  }
};