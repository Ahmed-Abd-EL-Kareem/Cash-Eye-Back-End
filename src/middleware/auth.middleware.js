import jwt from "jsonwebtoken";
import UserModel from "../modules/users/user.model.js";
import AppError from "../utils/appError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const protect = catchAsync(async (req, res, next) => {
  let token = req.cookies?.token
  const authHeader = req.headers.authorization
  if (!token && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim()
  }
  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized'
    })
  }
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired token'
    })
  }
  const user = await UserModel.findById(decoded.id);
  if (!user) {

    return res.status(401).json({
      status: 'fail',
      message: 'Unauthorized'
    })
  }
  req.user = user
  next()
});

