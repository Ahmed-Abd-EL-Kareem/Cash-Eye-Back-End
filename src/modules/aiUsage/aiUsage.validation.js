import Joi from "joi";

export const createUsage = Joi.object({
  user: Joi.string().hex().length(24).required(),
  feature: Joi.string()
    .valid("chat", "bookingConversation", "hotelAiSearch", "recommendations", "tripPlanner")
    .required(),
  sessionId: Joi.string().optional().allow(""),
  trip: Joi.string().hex().length(24).optional().allow(null),
  model: Joi.string().required(),
  promptTokens: Joi.number().integer().min(0).default(0),
  completionTokens: Joi.number().integer().min(0).default(0),
  totalTokens: Joi.number().integer().min(0).required(),
  cost: Joi.number().min(0).default(0),
  latencyMs: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid("success", "error").default("success"),
  errorMessage: Joi.string().optional().allow(""),
});

export const listUsage = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  feature: Joi.string()
    .valid("chat", "bookingConversation", "hotelAiSearch", "recommendations", "tripPlanner")
    .optional(),
  userId: Joi.string().hex().length(24).optional(),
  status: Joi.string().valid("success", "error").optional(),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getLogs = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  userId: Joi.string().hex().length(24).optional(),
  feature: Joi.string()
    .valid("chat", "bookingConversation", "hotelAiSearch", "recommendations", "tripPlanner")
    .optional(),
  status: Joi.string().valid("success", "error").optional(),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const dateRange = Joi.object({
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

export const dateRangeOptional = Joi.object({
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const logId = Joi.object({
  logId: Joi.string().hex().length(24).required(),
});