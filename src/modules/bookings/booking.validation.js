import Joi from "joi";
import mongoose from "mongoose";
import ApiError from "../../utils/apiError.js";

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const roomSelectionSchema = Joi.object({
  room: Joi.string().custom(objectId).required().messages({
    "any.required": "room ID is required",
    "any.invalid": "room must be a valid ObjectId",
  }),
  quantity: Joi.number().integer().min(1).max(10).required().messages({
    "number.base": "quantity must be a number",
    "number.min": "quantity must be at least 1",
    "number.max": "quantity cannot exceed 10",
    "any.required": "quantity is required",
  }),
  guests: Joi.object({
    adults: Joi.number().integer().min(1).required().messages({
      "number.base": "adults must be a number",
      "number.min": "at least 1 adult is required",
      "any.required": "adults is required",
    }),
    children: Joi.number().integer().min(0).default(0).messages({
      "number.base": "children must be a number",
      "number.min": "children cannot be negative",
    }),
  }).required(),
});

const createHoldSchema = Joi.object({
  hotel: Joi.string().custom(objectId).required().messages({
    "any.required": "hotel ID is required",
    "any.invalid": "hotel must be a valid ObjectId",
  }),
  checkIn: Joi.date().iso().greater("now").required().messages({
    "date.base": "checkIn must be a valid date",
    "date.format": "checkIn must be in ISO format",
    "date.greater": "checkIn must be a future date",
    "any.required": "checkIn is required",
  }),
  checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required().messages({
    "date.base": "checkOut must be a valid date",
    "date.format": "checkOut must be in ISO format",
    "date.greater": "checkOut must be after checkIn",
    "any.required": "checkOut is required",
  }),
  rooms: Joi.array().items(roomSelectionSchema).min(1).required().messages({
    "array.base": "rooms must be an array",
    "array.min": "at least one room selection is required",
    "any.required": "rooms is required",
  }),
  trip: Joi.string().custom(objectId).optional().messages({
    "any.invalid": "trip must be a valid ObjectId",
  }),
  specialRequests: Joi.string().max(1000).optional().messages({
    "string.max": "specialRequests cannot exceed 1000 characters",
  }),
});

const availabilityQuerySchema = Joi.object({
  checkIn: Joi.date().iso().greater("now").required().messages({
    "date.base": "checkIn must be a valid date",
    "date.format": "checkIn must be in ISO format",
    "date.greater": "checkIn must be a future date",
    "any.required": "checkIn is required",
  }),
  checkOut: Joi.date().iso().greater(Joi.ref("checkIn")).required().messages({
    "date.base": "checkOut must be a valid date",
    "date.format": "checkOut must be in ISO format",
    "date.greater": "checkOut must be after checkIn",
    "any.required": "checkOut is required",
  }),
  room: Joi.string().custom(objectId).optional().messages({
    "any.invalid": "room must be a valid ObjectId",
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    "number.base": "quantity must be a number",
    "number.min": "quantity must be at least 1",
  }),
});

const createCheckoutSessionSchema = Joi.object({
  bookingId: Joi.string().custom(objectId).required().messages({
    "any.required": "bookingId is required",
    "any.invalid": "bookingId must be a valid ObjectId",
  }),
  currency: Joi.string().valid("EGP", "USD", "egp", "usd").optional().messages({
    "any.only": "currency must be EGP or USD",
  }),
});

const getHoldStatusSchema = Joi.object({
  holdId: Joi.string().custom(objectId).required().messages({
    "any.required": "holdId is required",
    "any.invalid": "holdId must be a valid ObjectId",
  }),
});

export const validateCreateHold = (req, res, next) => {
  const { error } = createHoldSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(new ApiError(message, 400));
  }
  next();
};

export const validateAvailabilityQuery = (req, res, next) => {
  const { error } = availabilityQuerySchema.validate(req.query, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(new ApiError(message, 400));
  }
  next();
};

export const validateCreateCheckoutSession = (req, res, next) => {
  const { error } = createCheckoutSessionSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(new ApiError(message, 400));
  }
  next();
};

export const validateGetHoldStatus = (req, res, next) => {
  const { error } = getHoldStatusSchema.validate(req.params, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(new ApiError(message, 400));
  }
  next();
};