import { chatWithRahal } from "../../integrations/ai/chat.ai.js";
import ApiError from "../../utils/apiError.js";
import { AIHotelSearch } from "./helpers/aiHotelSearch.js";
import { AIBookingConversation } from "./helpers/aiBookingConversation.js";
import { AIRecommendations } from "./helpers/aiRecommendations.js";
import { HotelSearchTransformer } from "./helpers/hotelSearchTransformer.js";
import * as hotelService from "../hotels/hotel.service.js";

export const chat = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError("messages must be a non-empty array", 400);
  }
  return chatWithRahal(messages);
};

export const searchHotels = async (query, context = {}) => {
  try {
    const interpretedFilters = AIHotelSearch.parseQuery(query, context);
    const hotelQuery = HotelSearchTransformer.toHotelQuery(interpretedFilters);
    const { hotels: hotelsResult } = await hotelService.getAllHotels({
      ...hotelQuery,
      page: 1,
      limit: Math.min(context.limit || 20, 50),
    });

    const aiResult = {
      interpretedFilters,
      hotels: hotelsResult,
      suggestions: [],
    };

    return HotelSearchTransformer.transformSearchResults(aiResult, hotelsResult);
  } catch (error) {
    throw new ApiError(`Failed to process hotel search: ${error.message}`, 500);
  }
};

export const bookingConversation = async (message, sessionId, context = {}) => {
  try {
    return AIBookingConversation.processMessage(sessionId, message, context);
  } catch (error) {
    throw new ApiError(`Failed to process booking conversation: ${error.message}`, 500);
  }
};

export const getRecommendations = async (userId, context = {}) => {
  try {
    return await AIRecommendations.getRecommendations(userId, context);
  } catch (error) {
    throw new ApiError(`Failed to get recommendations: ${error.message}`, 500);
  }
};
