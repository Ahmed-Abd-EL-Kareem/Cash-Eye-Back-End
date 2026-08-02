import path from "path";
import ejs from "ejs";
import bcrypt from "bcrypt";
import UserModel from "../users/user.model.js";
import ApiError from "../../utils/apiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import generateToken from "../../utils/jwt.js";
import sendCookie, { clearCookie } from "../../utils/sendCookie.js";
import { generateRandomNumber } from "../../utils/generateOTP.js";
import { sendForgetEmail, sendWelcomeEmail } from "../../utils/email.js";

export const signup = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  const userExists = await UserModel.findOne({ email });
  if (userExists) {
    return next(new ApiError("An account with this email already exists.", 409));
  }

  const user = await UserModel.createWithSubscription({ name, email, password });

  const token = generateToken(user._id);
  sendCookie(res, token);

  try {
    const templatePath = path.join(process.cwd(), "src/views/welcome.ejs");
    const html = await ejs.renderFile(templatePath, {
      name: user.name,
      dashboardUrl: process.env.DASHBOARD_URL,
      year: new Date().getFullYear(),
    });
    await sendWelcomeEmail({
      to: email,
      subject: "Welcome to Rahal — Smart Travel Planner",
      html,
    });
  } catch (emailErr) {
    console.error("Welcome email failed:", emailErr.message);
  }

  user.password = undefined;

  res.status(201).json({
    status: "success",
    message: "Signup successful",
    token,
    data: { user },
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError("Please provide email and password.", 400));
  }

  const user = await UserModel.findOne({ email }).select("+password");
  if (!user || !user.password) {
    return next(new ApiError("Incorrect email or password.", 401));
  }

  const isMatch = await user.correctPassword(password);
  if (!isMatch) return next(new ApiError("Incorrect email or password.", 401));

  const token = generateToken(user._id);
  sendCookie(res, token);
  user.password = undefined;

  res.status(200).json({
    status: "success",
    message: "Login successful",
    token,
    data: { user },
  });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new ApiError("Please provide your email.", 400));

  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If that email is registered, a reset code has been sent.",
    });
  }

  const OTP = generateRandomNumber();
  user.otp = await bcrypt.hash(OTP.toString(), 10);
  user.resetOTPExpiration = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const templatePath = path.join(process.cwd(), "src/views/reset-password.ejs");
  const html = await ejs.renderFile(templatePath, {
    otp: OTP,
    year: new Date().getFullYear(),
  });

  try {
    await sendForgetEmail({
      email: user.email,
      subject: "Reset Your Password",
      message: html,
    });
    res.status(200).json({
      status: "success",
      message: "If that email is registered, a reset code has been sent.",
    });
  } catch (err) {
    user.otp = undefined;
    user.resetOTPExpiration = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("Error sending email:", err.message);
    return next(new ApiError("Error sending email. Please try again later.", 500));
  }
});
export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ApiError("Email and OTP are required.", 400));
  }

  const user = await UserModel.findOne({ email });

  if (!user || !user.otp || user.resetOTPExpiration < Date.now()) {
    return next(new ApiError("OTP is invalid or expired.", 400));
  }

  const isValid = await bcrypt.compare(
    otp.toString(),
    user.otp
  );

  if (!isValid) {
    return next(new ApiError("Invalid OTP.", 400));
  }

  user.isOTPVerified = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
  });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return next(
      new ApiError("Email and new password are required.", 400)
    );
  }

  const user = await UserModel.findOne({ email });

  if (!user) {
    return next(new ApiError("User not found.", 404));
  }

  if (!user.isOTPVerified) {
    return next(
      new ApiError("Please verify OTP first.", 400)
    );
  }

  user.password = newPassword;
  user.otp = undefined;
  user.resetOTPExpiration = undefined;
  user.isOTPVerified = false;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
  });
});
export const findOrCreateGoogleUser = async ({ email, googleId, displayName, photoUrl }) => {
  let user = await UserModel.findOne({ email });

  if (!user) {
    user = await UserModel.createWithSubscription({
      name: displayName || "Google User",
      email,
      googleId,
      image: photoUrl || undefined,
      provider: "google",
    });
  } else {
    let changed = false;
    if (!user.googleId) {
      user.googleId = googleId;
      changed = true;
    }
    if (!user.image && photoUrl) {
      user.image = photoUrl;
      changed = true;
    }
    if (changed) await user.save({ validateBeforeSave: false });
  }

  return user;
};

export const googleMobileAuth = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new ApiError("idToken is required", 400));
  }

  const { OAuth2Client } = await import("google-auth-library");
  const client = new OAuth2Client();

  let ticket;
  try {
    const allowedClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_MOBILE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);

    ticket = await client.verifyIdToken({
      idToken,
      audience: allowedClientIds.length ? allowedClientIds : undefined,
    });
  } catch (error) {
    return next(new ApiError("Invalid or expired Google token", 401));
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    return next(new ApiError("Invalid Google token payload", 401));
  }

  const user = await findOrCreateGoogleUser({
    email: payload.email,
    googleId: payload.sub,
    displayName: payload.name,
    photoUrl: payload.picture,
  });

  const token = generateToken(user._id);
  sendCookie(res, token);
  user.password = undefined;

  res.status(200).json({
    status: "success",
    message: "Google sign-in successful",
    token,
    data: { user },
  });
});

export const googleCallback = asyncHandler(async (req, res) => {
  const token = generateToken(req.user._id);
  sendCookie(res, token);
  res.redirect(`${process.env.CLIENT_URL}?token=${token}`);
});

export const logout = asyncHandler(async (req, res) => {
  clearCookie(res);
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

