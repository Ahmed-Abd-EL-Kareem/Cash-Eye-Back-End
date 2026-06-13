import {
  signup,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  googleCallback,
} from "./auth.service.js";

export const register = (req, res, next) => signup(req, res, next);

export const loginUser = (req, res, next) => login(req, res, next);

export const forgotPass = (req, res, next) => forgotPassword(req, res, next);

export const verifyOtp = (req, res, next) => verifyOTP(req, res, next);

export const resetPass = (req, res, next) => resetPassword(req, res, next);

export const googleAuthCallback = (req, res, next) => googleCallback(req, res, next);
