import Joi from "joi";
import ApiError from "../utils/apiError.js";

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - Source to validate: 'body', 'query', 'params'
 * @returns {Function} Express middleware
 */
export const validate = (schema, source = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(errorMessages, 400));
  }

  req[source] = value;
  next();
};

/**
 * Validate request body
 * @param {Joi.Schema} schema
 * @returns {Function}
 */
export const validateBody = (schema) => validate(schema, "body");

/**
 * Validate query parameters
 * @param {Joi.Schema} schema
 * @returns {Function}
 */
export const validateQuery = (schema) => validate(schema, "query");

/**
 * Validate route parameters
 * @param {Joi.Schema} schema
 * @returns {Function}
 */
export const validateParams = (schema) => validate(schema, "params");

/**
 * Validate multiple sources
 * @param {Object} schemas - { body?, query?, params? }
 * @returns {Function}
 */
export const validateAll = (schemas) => (req, res, next) => {
  const sources = ["body", "query", "params"];
  for (const source of sources) {
    if (schemas[source]) {
      const { error, value } = schemas[source].validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        const errorMessages = error.details.map((d) => d.message).join(", ");
        return next(new ApiError(errorMessages, 400));
      }
      req[source] = value;
    }
  }
  next();
};

export default { validate, validateBody, validateQuery, validateParams, validateAll };