import ApiError from "../../utils/apiError.js";
import mongoose from "mongoose";

export const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError("Invalid destination ID", 400));
  }
  next();
};
 
export const validateCreateDestination = (req, res, next) => {
  const { name, city, description, averageBudgetPerDay } = req.body;
  const errors = [];
 
  if (!name?.en || typeof name.en !== "string" || !name.en.trim())
    errors.push("name.en is required");
  if (!name?.ar || typeof name.ar !== "string" || !name.ar.trim())
    errors.push("name.ar is required");
  if (!city || typeof city !== "string" || !city.trim())
    errors.push("city is required");
  if (!description?.en || typeof description.en !== "string" || !description.en.trim())
    errors.push("description.en is required");
  if (!description?.ar || typeof description.ar !== "string" || !description.ar.trim())
    errors.push("description.ar is required");
  if (averageBudgetPerDay === undefined || isNaN(Number(averageBudgetPerDay)) || Number(averageBudgetPerDay) < 0)
    errors.push("averageBudgetPerDay must be a non-negative number");
 
  if (errors.length) {
    return next(new ApiError(errors.join(", "), 400));
  }
 
  next();
};
 
export const validateUpdateDestination = (req, res, next) => {
  const { name, description, averageBudgetPerDay } = req.body;
  const errors = [];
 
  if (name) {
    if (name.en !== undefined && (typeof name.en !== "string" || !name.en.trim()))
      errors.push("name.en must be a non-empty string");
    if (name.ar !== undefined && (typeof name.ar !== "string" || !name.ar.trim()))
      errors.push("name.ar must be a non-empty string");
  }
 
  if (description) {
    if (description.en !== undefined && (typeof description.en !== "string" || !description.en.trim()))
      errors.push("description.en must be a non-empty string");
    if (description.ar !== undefined && (typeof description.ar !== "string" || !description.ar.trim()))
      errors.push("description.ar must be a non-empty string");
  }
 
  if (averageBudgetPerDay !== undefined && (isNaN(Number(averageBudgetPerDay)) || Number(averageBudgetPerDay) < 0))
    errors.push("averageBudgetPerDay must be a non-negative number");
 
  if (errors.length) {
    return next(new ApiError(errors.join(", "), 400));
  }
 
  next();
};