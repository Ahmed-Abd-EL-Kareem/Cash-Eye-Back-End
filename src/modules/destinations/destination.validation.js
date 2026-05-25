import ApiError from "../../utils/apiError.js";
import mongoose from "mongoose";

export const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError("Invalid destination ID", 400));
  }

  next();
};

const validateLocation = (location, errors) => {
  if (!location) {
    errors.push("location is required");
    return;
  }

  if (location.type !== "Point") {
    errors.push("location.type must be Point");
  }

  if (
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    errors.push(
      "location.coordinates must contain [lng, lat]"
    );

    return;
  }

  const [lng, lat] = location.coordinates;

  if (
    typeof lng !== "number" ||
    typeof lat !== "number"
  ) {
    errors.push(
      "location.coordinates values must be numbers"
    );
  }

  // OPTIONAL RANGE VALIDATION
  if (lng < -180 || lng > 180) {
    errors.push("longitude must be between -180 and 180");
  }

  if (lat < -90 || lat > 90) {
    errors.push("latitude must be between -90 and 90");
  }
};

export const validateCreateDestination = (
  req,
  res,
  next
) => {
  const {
    name,
    city,
    description,
    averageBudgetPerDay,
    location,
  } = req.body;

  const errors = [];

  
  if (
    !name?.en ||
    typeof name.en !== "string" ||
    !name.en.trim()
  ) {
    errors.push("name.en is required");
  }

  if (
    !name?.ar ||
    typeof name.ar !== "string" ||
    !name.ar.trim()
  ) {
    errors.push("name.ar is required");
  }

  
  if (
    !city ||
    typeof city !== "string" ||
    !city.trim()
  ) {
    errors.push("city is required");
  }

  
  if (
    !description?.en ||
    typeof description.en !== "string" ||
    !description.en.trim()
  ) {
    errors.push("description.en is required");
  }

  if (
    !description?.ar ||
    typeof description.ar !== "string" ||
    !description.ar.trim()
  ) {
    errors.push("description.ar is required");
  }

  
  if (
    averageBudgetPerDay === undefined ||
    isNaN(Number(averageBudgetPerDay)) ||
    Number(averageBudgetPerDay) < 0
  ) {
    errors.push(
      "averageBudgetPerDay must be a non-negative number"
    );
  }

  
  validateLocation(location, errors);

  if (errors.length) {
    return next(new ApiError(errors.join(", "), 400));
  }

  next();
};

export const validateUpdateDestination = (
  req,
  res,
  next
) => {
  const {
    name,
    description,
    averageBudgetPerDay,
    location,
  } = req.body;

  const errors = [];

  
  if (name) {
    if (
      name.en !== undefined &&
      (typeof name.en !== "string" ||
        !name.en.trim())
    ) {
      errors.push("name.en must be a non-empty string");
    }

    if (
      name.ar !== undefined &&
      (typeof name.ar !== "string" ||
        !name.ar.trim())
    ) {
      errors.push("name.ar must be a non-empty string");
    }
  }


  if (description) {
    if (
      description.en !== undefined &&
      (typeof description.en !== "string" ||
        !description.en.trim())
    ) {
      errors.push(
        "description.en must be a non-empty string"
      );
    }

    if (
      description.ar !== undefined &&
      (typeof description.ar !== "string" ||
        !description.ar.trim())
    ) {
      errors.push(
        "description.ar must be a non-empty string"
      );
    }
  }

 
  if (
    averageBudgetPerDay !== undefined &&
    (isNaN(Number(averageBudgetPerDay)) ||
      Number(averageBudgetPerDay) < 0)
  ) {
    errors.push(
      "averageBudgetPerDay must be a non-negative number"
    );
  }

 
  if (location) {
    validateLocation(location, errors);
  }

  if (errors.length) {
    return next(new ApiError(errors.join(", "), 400));
  }

  next();
};