import asyncHandler from "../../utils/asyncHandler.js";
import { chat, recommendHotels } from "./ai.service.js";

// ─── 1. Chatbot ───────────────────────────────────────────
export const chatController = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      status: "error",
      message: "Message is required",
    });
  }

  const { reply, tokensUsed } = await chat(message);

  // ─── حدّث الـ tokens الفعلية ──────────────────────────
  if (req.subscription) {
    req.subscription.usage.tokensUsedThisMonth += tokensUsed;
    await req.subscription.save();
  }

  res.status(200).json({
    status: "success",
    data: { reply },
  });
});

// ─── 2. Hotel Recommendation ──────────────────────────────
export const recommendHotelsController = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      status: "error",
      message: "Message is required",
    });
  }

  const { reply, tokensUsed } = await recommendHotels(message);

  // ─── حدّث الـ tokens الفعلية ──────────────────────────
  if (req.subscription) {
    req.subscription.usage.tokensUsedThisMonth += tokensUsed;
    await req.subscription.save();
  }

  res.status(200).json({
    status: "success",
    data: { reply },
  });
});