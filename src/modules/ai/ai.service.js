import { chatWithRahal } from "../../ai/chat.ai.js";
import ApiError from "../../utils/apiError.js";

// Chat is the only AI action here.
// Trip generation lives in trip.service.js because it creates a Trip
// document and updates the user — it belongs to the trips domain.
export const chat = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError("messages must be a non-empty array", 400);
  }
  return chatWithRahal(messages);
};