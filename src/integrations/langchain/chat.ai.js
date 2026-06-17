// chat.ai.js
// ─────────────────────────────────────────────────────────────────────────────
// Multi-Agent #1 — Chat · Hotel Search · Recommendations
//
// One LangGraph with a Supervisor that routes to three sub-agents:
//
//   User message
//        │
//        ▼
//   [SUPERVISOR] ──► [CHAT AGENT]          — general travel Q&A with RAG
//                ──► [HOTEL SEARCH AGENT]  — tool-calling: search + score
//                ──► [RECOMMENDATIONS]     — tool-calling: trip ctx + search + score
//
// Exported API (drop-in replacements):
//   chatWithRahal(messages)
//   searchHotels(query, context)
//   getHotelRecommendations(userId, context)
// ─────────────────────────────────────────────────────────────────────────────

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

import { chatLLM, structuredLLM } from "./llm.client.js";
import { retrieveContext } from "./rag.retriever.js";
import {
  ragTool,
  searchHotelsTool,
  scoreHotelsTool,
  getTripContextTool,
} from "./agent.tools.js";
import {
  CHAT_SUPERVISOR_SYSTEM,
  CHAT_SYSTEM,
  HOTEL_SEARCH_SYSTEM,
  RECOMMENDATIONS_SYSTEM,
} from "./agent.prompts.js";
import logger from "../../config/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildRagBlock = (ctx) =>
  ctx ? `\n## Knowledge Base Context:\n${ctx}\n` : "";

const safeJsonParse = (raw, fallback = {}) => {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { /* */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch { /* */ } }
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(raw.slice(s, e + 1)); } catch { /* */ } }
  return fallback;
};

// ─── State ────────────────────────────────────────────────────────────────────
const State = Annotation.Root({
  messages:    Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  userMessage: Annotation({ reducer: (_, b) => b, default: () => "" }),
  userId:      Annotation({ reducer: (_, b) => b, default: () => null }),
  context:     Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),
  nextAgent:   Annotation({ reducer: (_, b) => b, default: () => "chat" }),
  agentUsed:   Annotation({ reducer: (_, b) => b, default: () => null }),
  reply:       Annotation({ reducer: (_, b) => b, default: () => null }),
  tokensUsed:  Annotation({ reducer: (_, b) => b, default: () => 0 }),
});

// ─────────────────────────────────────────────────────────────────────────────
// NODE: SUPERVISOR
// Routes between chat / hotel_search / recommendations
// ─────────────────────────────────────────────────────────────────────────────
async function supervisorNode(state) {
  // If caller already set nextAgent (direct API call), skip LLM routing
  if (state.nextAgent && state.nextAgent !== "chat") {
    logger.info(`[Supervisor] Direct route → ${state.nextAgent}`);
    return {};
  }

  logger.info(`[Supervisor] Classifying: "${state.userMessage.slice(0, 80)}"`);

  const response = await structuredLLM.invoke([
    new SystemMessage(CHAT_SUPERVISOR_SYSTEM),
    new HumanMessage(state.userMessage),
  ]);

  const parsed = safeJsonParse(response.content, { agent: "chat" });
  const nextAgent = parsed.agent || "chat";
  logger.info(`[Supervisor] → ${nextAgent}`);
  return { nextAgent };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE: CHAT AGENT
// General travel Q&A with RAG + conversation history
// ─────────────────────────────────────────────────────────────────────────────
async function chatNode(state) {
  logger.info("[Chat Agent] Responding to message");

  const ragContext = await retrieveContext(state.userMessage, 3);
  const systemContent = CHAT_SYSTEM.replace("{ragContext}", buildRagBlock(ragContext));

  const history = (state.messages || []).slice(-10).map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const response = await chatLLM.invoke([
    new SystemMessage(systemContent),
    ...history,
    new HumanMessage(state.userMessage),
  ]);

  const tokensUsed = response.usage_metadata?.total_tokens || 0;
  logger.info(`[Chat Agent] Done — ${tokensUsed} tokens`);

  return { agentUsed: "chat", reply: response.content, tokensUsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE: HOTEL SEARCH AGENT
// Tool-calling loop: RAG → search_hotels → score_hotels → reply
// ─────────────────────────────────────────────────────────────────────────────
const hotelSearchTools   = [ragTool, searchHotelsTool, scoreHotelsTool];
const hotelSearchToolNode = new ToolNode(hotelSearchTools);
const hotelSearchLLM     = structuredLLM.bindTools(hotelSearchTools);

async function hotelSearchNode(state) {
  logger.info("[Hotel Search Agent] Processing search");

  const ragContext = await retrieveContext(`Egypt hotel ${state.userMessage}`, 3);
  const systemContent = HOTEL_SEARCH_SYSTEM.replace("{ragContext}", buildRagBlock(ragContext));

  let messages = [
    new SystemMessage(systemContent),
    new HumanMessage(state.userMessage),
  ];

  for (let i = 0; i < 4; i++) {
    const response = await hotelSearchLLM.invoke(messages);
    messages.push(response);

    if (!response.tool_calls?.length) {
      const tokensUsed = response.usage_metadata?.total_tokens || 0;
      logger.info(`[Hotel Search Agent] Done — ${tokensUsed} tokens`);
      return { agentUsed: "hotel_search", reply: response.content, tokensUsed };
    }

    const toolResult = await hotelSearchToolNode.invoke({ messages });
    messages.push(...toolResult.messages);
  }

  const last = messages[messages.length - 1];
  return {
    agentUsed: "hotel_search",
    reply: last?.content || "Hotel search completed.",
    tokensUsed: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE: RECOMMENDATIONS AGENT
// Tool-calling loop: RAG → (trip ctx) → search_hotels → score_hotels → reply
// ─────────────────────────────────────────────────────────────────────────────
const recommendationTools    = [ragTool, getTripContextTool, searchHotelsTool, scoreHotelsTool];
const recommendationToolNode  = new ToolNode(recommendationTools);
const recommendationLLM      = chatLLM.bindTools(recommendationTools);

async function recommendationsNode(state) {
  logger.info("[Recommendations Agent] Processing request");

  const {
    tripId,
    destination,
    budget = "mid-range",
    interests = [],
    travelers = 1,
    limit = 10,
  } = state.context;

  const ragQuery = `${destination || "Egypt"} hotels ${interests.join(" ")} ${budget} recommendations`;
  const ragContext = await retrieveContext(ragQuery, 5);
  const systemContent = RECOMMENDATIONS_SYSTEM.replace("{ragContext}", buildRagBlock(ragContext));

  const userPrompt = [
    "Find hotel recommendations for:",
    tripId ? `- Trip ID: ${tripId}\n- User ID: ${state.userId}` : null,
    `- Destination: ${destination || "Egypt"}`,
    `- Budget: ${budget}`,
    `- Interests: ${interests.join(", ") || "general travel"}`,
    `- Travelers: ${travelers}`,
    `- Limit: ${limit} recommendations`,
  ]
    .filter(Boolean)
    .join("\n");

  let messages = [
    new SystemMessage(systemContent),
    new HumanMessage(userPrompt),
  ];

  for (let i = 0; i < 5; i++) {
    const response = await recommendationLLM.invoke(messages);
    messages.push(response);

    if (!response.tool_calls?.length) {
      const tokensUsed = response.usage_metadata?.total_tokens || 0;
      logger.info(`[Recommendations Agent] Done — ${tokensUsed} tokens`);
      return { agentUsed: "recommendations", reply: response.content, tokensUsed };
    }

    const toolResult = await recommendationToolNode.invoke({ messages });
    messages.push(...toolResult.messages);
  }

  const last = messages[messages.length - 1];
  return {
    agentUsed: "recommendations",
    reply: last?.content || "Recommendations generated.",
    tokensUsed: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD GRAPH
// ─────────────────────────────────────────────────────────────────────────────
const graph = new StateGraph(State)
  .addNode("supervisor",       supervisorNode)
  .addNode("chat",             chatNode)
  .addNode("hotel_search",     hotelSearchNode)
  .addNode("recommendations",  recommendationsNode)

  .addEdge("__start__", "supervisor")

  .addConditionalEdges("supervisor", (s) => s.nextAgent || "chat", {
    chat:            "chat",
    hotel_search:    "hotel_search",
    recommendations: "recommendations",
  })

  .addEdge("chat",            END)
  .addEdge("hotel_search",    END)
  .addEdge("recommendations", END);

const chatMultiAgent = graph.compile();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * General Egypt travel chat (replaces old chatWithRahal)
 * @param {Array<{role:string, content:string}>} messages
 */
export const chatWithRahal = async (messages) => {
  if (!Array.isArray(messages) || !messages.length)
    throw new Error("messages must be a non-empty array");

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) throw new Error("No user message found");

  const result = await chatMultiAgent.invoke({
    userMessage: lastUser.content,
    messages:    messages.slice(0, -1),
    context:     {},
    nextAgent:   "chat",
  });

  return { reply: result.reply, tokensUsed: result.tokensUsed };
};

/**
 * AI hotel search (replaces old parseHotelSearchQuery + transformSearchResults)
 * @param {string} query
 * @param {object} context
 */
export const searchHotels = async (query, context = {}) => {
  const result = await chatMultiAgent.invoke({
    userMessage: query,
    messages:    [],
    context,
    nextAgent:   "hotel_search",
  });
  return { reply: result.reply, tokensUsed: result.tokensUsed };
};

/**
 * Personalised hotel recommendations (replaces old getHotelRecommendations)
 * @param {string} userId
 * @param {object} context  { tripId, destination, budget, interests, travelers, limit }
 */
export const getHotelRecommendations = async (userId, context = {}) => {
  const result = await chatMultiAgent.invoke({
    userMessage: "Recommend hotels for me",
    userId,
    messages:    [],
    context,
    nextAgent:   "recommendations",
  });
  return { reply: result.reply, tokensUsed: result.tokensUsed };
};
