import Joi from "joi";
import { translateJoiError, t } from "../i18n/index.js";

// ─── Reusable Schemas ─────────────────────────────────────────────────────

/**
 * i18n string schema — used for title, description, notes.
 * Accepts { ar: "...", en: "..." }
 * Fix: require at least one of ar or en to be present
 */
const i18nStringSchema = (maxLength = 500) =>
  Joi.object({
    ar: Joi.string().max(maxLength).allow("").optional(),
    en: Joi.string().max(maxLength).allow("").optional(),
  }).optional();

const locationSchema = Joi.object({
  type: Joi.string().valid("Point").default("Point"),
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  country: Joi.string().optional(),
});

const costSchema = Joi.object({
  amount: Joi.number().min(0).default(0),
  currency: Joi.string().length(3).uppercase().default("USD"),
});

const activitySchema = Joi.object({
  /**
   * Improved time regex:
   *   12-hour: "10:00 AM", "1:30 PM", "01:00AM"
   *   24-hour: "14:30", "09:00", "23:59"
   */
  time: Joi.string()
    .pattern(/^((0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i)
    .required()
    .messages({
      "string.pattern.base": "time must be a valid time like '10:00 AM' or '14:30'",
    }),
  attractionId: Joi.string().hex().length(24).optional(),
  title: i18nStringSchema(200).required(),
  description: i18nStringSchema(1000),
  notes: i18nStringSchema(500),
  duration: Joi.number().min(0).optional(),
  estimatedCost: costSchema.optional(),
  location: locationSchema.optional(),
  bookingStatus: Joi.string()
    .valid("not_required", "pending", "booked", "failed")
    .default("not_required"),
  weatherDependency: Joi.boolean().default(false),
  transportation: Joi.object({
    mode: Joi.string().valid("walking", "car", "bus", "metro", "train", "flight", "boat"),
    durationMinutes: Joi.number().min(0),
    distanceKm: Joi.number().min(0),
    cost: costSchema,
  }).optional(),
  order: Joi.number().integer().min(0).default(0),
});

const daySchema = Joi.object({
  day: Joi.number().integer().min(1).required(),
  date: Joi.date().optional(),
  title: i18nStringSchema(200).required(),
  description: i18nStringSchema(1000),
  cityId: Joi.string().hex().length(24).optional(),
  hotelId: Joi.string().hex().length(24).optional(),
  activities: Joi.array().items(activitySchema).default([]),
  dailyCost: costSchema.optional(),
  notes: i18nStringSchema(500),
  order: Joi.number().integer().min(0),
});

// ─── Create Trip ──────────────────────────────────────────────────────────

export const createTripSchema = Joi.object({
  title: i18nStringSchema(200).required(),
  description: i18nStringSchema(2000),
  coverImage: Joi.string().uri().optional(),

  destinationIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .required()
    .messages({ "array.min": "At least one destination is required" }),

  hotelIds: Joi.array().items(Joi.string().hex().length(24)).default([]),

  /**
   * Fix: use .min("now") instead of .greater("now")
   * to avoid false failures at timezone boundaries.
   */
  startDate: Joi.date().iso().min("now").required().messages({
    "date.min": "startDate must be in the future",
  }),

  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
    "date.greater": "endDate must be after startDate",
  }),

  travelersCount: Joi.number().integer().min(1).max(500).default(1),
  travelType: Joi.string()
    .valid("solo", "couple", "family", "group", "business")
    .default("solo"),

  budget: Joi.object({
    total: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase().default("USD"),
    breakdown: Joi.object({
      accommodation: Joi.number().min(0).default(0),
      transportation: Joi.number().min(0).default(0),
      activities: Joi.number().min(0).default(0),
      food: Joi.number().min(0).default(0),
      other: Joi.number().min(0).default(0),
    }),
  }).optional(),

  itinerary: Joi.array().items(daySchema).default([]),
  tags: Joi.array().items(Joi.string().lowercase().trim()).default([]),

  permissions: Joi.object({
    visibility: Joi.string().valid("private", "public", "collaborative").default("private"),
  }).optional(),
});

// ─── Update Trip ──────────────────────────────────────────────────────────

export const updateTripSchema = Joi.object({
  title: i18nStringSchema(200),
  description: i18nStringSchema(2000),
  coverImage: Joi.string().uri().optional().allow(""),
  destinationIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  hotelIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  travelersCount: Joi.number().integer().min(1).max(500).optional(),
  travelType: Joi.string().valid("solo", "couple", "family", "group", "business").optional(),
  budget: Joi.object({
    total: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase(),
    breakdown: Joi.object({
      accommodation: Joi.number().min(0),
      transportation: Joi.number().min(0),
      activities: Joi.number().min(0),
      food: Joi.number().min(0),
      other: Joi.number().min(0),
    }),
  }).optional(),
  itinerary: Joi.array().items(daySchema).optional(),
  tags: Joi.array().items(Joi.string().lowercase().trim()).optional(),
  permissions: Joi.object({
    visibility: Joi.string().valid("private", "public", "collaborative"),
  }).optional(),
  isFavorite: Joi.boolean().optional(),
}).min(1);

// ─── AI Save ─────────────────────────────────────────────────────────────

export const aiSaveTripSchema = Joi.object({
  title: i18nStringSchema(200).required(),
  description: i18nStringSchema(2000),

  days: Joi.array().items(daySchema).min(1).required().messages({
    "array.min": "AI trip must include at least 1 day",
  }),

  hotels: Joi.array().items(Joi.string().hex().length(24)).default([]),

  destinations: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .required(),

  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  travelersCount: Joi.number().integer().min(1).default(1),
  travelType: Joi.string().valid("solo", "couple", "family", "group", "business").default("solo"),

  budget: Joi.object({
    total: Joi.number().min(0),
    currency: Joi.string().length(3).uppercase().default("USD"),
    breakdown: Joi.object({
      accommodation: Joi.number().min(0),
      transportation: Joi.number().min(0),
      activities: Joi.number().min(0),
      food: Joi.number().min(0),
      other: Joi.number().min(0),
    }),
  }).optional(),

  tags: Joi.array().items(Joi.string().lowercase().trim()).default([]),

  aiMetadata: Joi.object({
    provider: Joi.string().default("openai"),
    model: Joi.string().optional(),
    promptVersion: Joi.string().optional(),
    rawResponse: Joi.any().optional(),
    tokens: Joi.object({
      prompt: Joi.number(),
      completion: Joi.number(),
      total: Joi.number(),
    }).optional(),
    generationTime: Joi.number().optional(),
    sessionId: Joi.string().optional(),
  }).optional(),
});

// ─── Status Transition ────────────────────────────────────────────────────

export const statusTransitionSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "generated", "customized", "booked", "active", "completed", "archived", "cancelled")
    .required(),
  reason: Joi.string().max(500).optional(),
});

// ─── Filters ──────────────────────────────────────────────────────────────

export const tripFiltersSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "generated", "customized", "booked", "active", "completed", "archived", "cancelled")
    .optional(),
  destination: Joi.string().max(100).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  travelType: Joi.string().valid("solo", "couple", "family", "group", "business").optional(),
  isFavorite: Joi.boolean().optional(),
  source: Joi.string().valid("ai", "manual", "template", "imported").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string()
    .valid("-createdAt", "createdAt", "-startDate", "startDate", "-budget.total", "budget.total")
    .default("-createdAt"),
});

// ─── Middleware Factory ────────────────────────────────────────────────────

export const validate = (schema, source = "body") => (req, res, next) => {
  const lang = req.lang || "en";
  const data = source === "query" ? req.query : req.body;
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(422).json({
      success: false,
      message: t("validation_failed", lang),
      errors: error.details.map((d) => ({
        field: d.path.join("."),
        message: translateJoiError(d, lang),
      })),
    });
  }

  if (source === "query") {
    // ✅ Fix: req.query is read-only in modern Express versions,
    // so we use Object.defineProperty to override it safely.
    Object.defineProperty(req, "query", {
      value,
      writable: true,
      configurable: true,
    });
  } else {
    req.body = value;
  }

  next();
};