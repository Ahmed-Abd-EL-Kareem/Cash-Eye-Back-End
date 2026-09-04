import { randomUUID } from "crypto";
import { chatWithRahal } from "./chat.ai.js";
import { normalizeContentText } from "./llm.client.js";
import { ChatConversation } from "../../modules/ai/chatConversation.model.js";
import logger from "../../config/logger.js";

/**
 * Generate a title from the first user message
 * @param {string} message 
 * @returns {string}
 */
function deriveTitle(message) {
  if (!message) return "New chat";
  const cleaned = message.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47).trim() + "...";
}

/**
 * Send a chat message and persist the conversation
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string|null} params.sessionId - Session ID (null for new conversation)
 * @param {string} params.message - User message
 * @returns {Promise<Object>} Conversation with updated messages
 */
export const sendChatMessage = async ({ userId, sessionId, message }) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  let conversation;
  if (sessionId) {
    conversation = await ChatConversation.findOne({ sessionId, user: userId });
  }

  if (!conversation) {
    const newSessionId = sessionId || randomUUID();
    conversation = new ChatConversation({
      sessionId: newSessionId,
      user: userId,
      title: deriveTitle(message),
      messages: [],
    });
  }

  // Add user message
  conversation.messages.push({ role: "user", content: message });

  // Prepare history for the AI (last 10 messages for context)
  const history = conversation.messages.slice(-10);

  // Call the AI
  const { reply, tokensUsed } = await chatWithRahal([
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ]);

  // Add assistant message (guarantee string type to prevent Mongoose CastError)
  const assistantReply = normalizeContentText(
    reply,
    "I am here to assist you with your travels in Egypt. How can I help you today?"
  );

  conversation.messages.push({
    role: "assistant",
    content: assistantReply,
    tokensUsed: tokensUsed || 0,
  });

  // Trim messages to prevent unbounded growth - keep last 50 messages
  if (conversation.messages.length > 50) {
    conversation.messages = conversation.messages.slice(-50);
  }

  await conversation.save();
  logger.info(`[Chat] Session ${conversation.sessionId} updated — ${tokensUsed} tokens`);

  return conversation;
};

/**
 * Get a conversation by sessionId for a user
 * @param {string} sessionId 
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export const getChatConversation = async (sessionId, userId) => {
  const conversation = await ChatConversation.findOne({ sessionId, user: userId });
  return conversation;
};

/**
 * List all conversations for a user
 * @param {string} userId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const listChatConversations = async (userId, limit = 20) => {
  const conversations = await ChatConversation.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("sessionId title updatedAt messages")
    .lean();

  return conversations.map((conv) => ({
    sessionId: conv.sessionId,
    title: conv.title,
    updatedAt: conv.updatedAt,
    lastMessage: conv.messages.length
      ? {
          role: conv.messages[conv.messages.length - 1].role,
          content:
            conv.messages[conv.messages.length - 1].content.slice(0, 100) +
            (conv.messages[conv.messages.length - 1].content.length > 100
              ? "..."
              : ""),
        }
      : null,
    messageCount: conv.messages.length,
  }));
};

/**
 * Delete a conversation
 * @param {string} sessionId 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export const deleteChatConversation = async (sessionId, userId) => {
  const result = await ChatConversation.deleteOne({ sessionId, user: userId });
  return result.deletedCount > 0;
};

/**
 * Rename a conversation
 * @param {string} sessionId 
 * @param {string} userId 
 * @param {string} title 
 * @returns {Promise<Object|null>}
 */
export const renameChatConversation = async (sessionId, userId, title) => {
  const conversation = await ChatConversation.findOneAndUpdate(
    { sessionId, user: userId },
    { title: title.trim().slice(0, 100) },
    { returnDocument: "after" }
  );
  return conversation;
};