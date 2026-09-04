import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      set: (val) => {
        if (typeof val === "string") return val;
        if (Array.isArray(val)) {
          const text = val
            .map((p) => {
              if (typeof p === "string") return p;
              if (p && typeof p === "object") return p.text || p.content || "";
              return "";
            })
            .filter(Boolean)
            .join("\n");
          return text || "No response content";
        }
        if (val && typeof val === "object") {
          return val.text || val.content || JSON.stringify(val);
        }
        return String(val || "");
      },
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New chat",
    },
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

chatConversationSchema.index({ user: 1, updatedAt: -1 });

export const ChatConversation = mongoose.model(
  "ChatConversation",
  chatConversationSchema
);