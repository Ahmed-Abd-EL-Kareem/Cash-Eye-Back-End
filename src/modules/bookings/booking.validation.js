
import mongoose from "mongoose";
import ApiError from "../../utils/apiError.js";
import { BOOKING_STATUSES } from "../../utils/constants.js";

export const validateObjectId = (
  req,
  res,
  next
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      req.params.id
    )
  ) {
    return next(
      new ApiError(
        "Invalid booking ID",
        400
      )
    );
  }

  next();
};

export const validateCreateBooking = (
  req,
  res,
  next
) => {
  const {
    hotelId,
    tripId,
    checkIn,
    checkOut,
    rooms,
    guests,
  } = req.body;

  const errors = [];

  if (!hotelId)
    errors.push("hotelId is required");

  if (!tripId)
    errors.push("tripId is required");

  if (!checkIn)
    errors.push("checkIn is required");

  if (!checkOut)
    errors.push("checkOut is required");

  if (
    rooms === undefined ||
    isNaN(Number(rooms)) ||
    Number(rooms) < 1
  ) {
    errors.push(
      "rooms must be a positive number"
    );
  }

  if (
    guests === undefined ||
    isNaN(Number(guests)) ||
    Number(guests) < 1
  ) {
    errors.push(
      "guests must be a positive number"
    );
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (
    checkIn &&
    isNaN(checkInDate.getTime())
  ) {
    errors.push("Invalid checkIn date");
  }

  if (
    checkOut &&
    isNaN(checkOutDate.getTime())
  ) {
    errors.push("Invalid checkOut date");
  }

  if (
    checkIn &&
    checkOut &&
    checkOutDate <= checkInDate
  ) {
    errors.push(
      "checkOut must be after checkIn"
    );
  }

  if (errors.length) {
    return next(
      new ApiError(
        errors.join(", "),
        400
      )
    );
  }

  next();
};

export const validateUpdateBookingStatus = (
  req,
  res,
  next
) => {
  const { status } = req.body;

  if (!status) {
    return next(
      new ApiError(
        "status is required",
        400
      )
    );
  }

  if (
    !BOOKING_STATUSES.includes(status)
  ) {
    return next(
      new ApiError(
        `status must be one of: ${BOOKING_STATUSES.join(
          ", "
        )}`,
        400
      )
    );
  }

  next();
};