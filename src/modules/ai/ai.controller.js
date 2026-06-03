import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as aiService from "./ai.service.js";
import { successResponse } from "../../utils/apiResponse.js";

// POST /api/v1/ai/chat
// Body: { messages: [{ role: "user"|"assistant", content: "string" }] }
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