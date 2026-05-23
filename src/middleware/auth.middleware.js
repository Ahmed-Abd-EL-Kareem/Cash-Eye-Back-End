import jwt from "jsonwebtoken";
import UserModel from "../modules/users/user.model.js";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;
  const authHeader = req.headers.authorization;

  if (
    !token &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return next(new ApiError("You are not logged in. Please log in.", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new ApiError("Invalid or expired token. Please log in again.", 401));
  }

  const user = await UserModel.findById(decoded.id).select("+password");
  if (!user) {
    return next(new ApiError("The user belonging to this token no longer exists.", 401));
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new ApiError("Password was recently changed. Please log in again.", 401));
  }

  user.password = undefined;
  req.user = user;
  next();
});
