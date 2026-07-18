import ApiError from "../../utils/apiError.js";
import mongoose from "mongoose";

export const validateObjectId = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return next(new ApiError(`Invalid ${paramName}`, 400));
  }
  next();
};

export const validateCreateHotel = (
  req,
  res,
  next
) => {
  const {
    name,
    city,
    description,
    averagePricePerNight,
    stars,
  } = req.body;

  const errors = [];

  if (!name?.en?.trim())
    errors.push("name.en is required");

  if (!name?.ar?.trim())
    errors.push("name.ar is required");

  if (!city?.trim())
    errors.push("city is required");

  if (!description?.en?.trim())
    errors.push("description.en is required");

  if (!description?.ar?.trim())
    errors.push("description.ar is required");

  if (
    averagePricePerNight === undefined ||
    isNaN(Number(averagePricePerNight))
  ) {
    errors.push(
      "averagePricePerNight must be a number"
    );
  }

  if (
    stars === undefined ||
    isNaN(Number(stars))
  ) {
    errors.push("stars must be a number");
  }

  if (errors.length) {
    return next(
      new ApiError(errors.join(", "), 400)
    );
  }

  next();
};