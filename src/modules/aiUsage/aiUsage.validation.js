import Joi from "joi";
import ApiError from "../../utils/apiError.js";

const objectIdSchema = Joi.string().hex().length(24).messages({
  "string.hex": "{#label} must be a valid hex string",
  "string.length": "{#label} must be exactly 24 characters long",
});

const featureSchema = Joi.string().valid(
  "chat",
  "bookingConversation",
  "hotelAiSearch",
  "recommendations",
  "tripPlanner"
);

const statusSchema = Joi.string().valid("success", "error");

/**
 * Validate the request body for creating an AIUsage record
 */
export const validateCreateAIUsage = (req, res, next) => {
  const schema = Joi.object({
    user: objectIdSchema.required().messages({
      "any.required": "user is required",
    }),
    trip: objectIdSchema.allow(null).optional(),
    model: Joi.string().required().messages({
      "any.required": "model is required",
    }),
    promptTokens: Joi.number().min(0).default(0),
    completionTokens: Joi.number().min(0).default(0),
    totalTokens: Joi.number().min(0).default(0),
    cost: Joi.number().min(0),
    responseTime: Joi.number().min(0).required().messages({
      "any.required": "responseTime is required",
    }),
    success: Joi.boolean().default(true),
    errorMessage: Joi.string().allow(null, "").default(null),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(errorMessages, 400));
  }

  req.body = value;
  next();
};

/**
 * Validate query parameters for listing AI usage
 */
export const validateListUsage = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    feature: featureSchema,
    userId: objectIdSchema,
    status: statusSchema,
    from: Joi.date().iso().messages({
      "date.format": "from must be a valid ISO date",
    }),
    to: Joi.date().iso().messages({
      "date.format": "to must be a valid ISO date",
    }),
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(errorMessages, 400));
  }

  req.query = value;
  next();
};

/**
 * Validate query parameters for getting AI usage stats
 */
export const validateUsageStats = (req, res, next) => {
  const schema = Joi.object({
    from: Joi.date().iso().messages({
      "date.format": "from must be a valid ISO date",
    }),
    to: Joi.date().iso().messages({
      "date.format": "to must be a valid ISO date",
    }),
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(errorMessages, 400));
  }

  req.query = value;
  next();
};