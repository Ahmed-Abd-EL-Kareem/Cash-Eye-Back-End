import bcrypt from "bcrypt";
import path from "path";
import ejs from "ejs";
import jwt from "jsonwebtoken";
import UserModel from "../users/user.model.js";
import PlanModel from "../plans/plan.model.js";
import SubscriptionModel from "../subscriptions/subscription.model.js";
import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import generateToken from "../../utils/generateToken.js";
import sendCookie from "../../utils/sendCookie.js";
import { generateRandomNumber } from "../../utils/generateOTP.js";
import { sendForgetEmail, sendWelcomeEmail } from "../../utils/email.js";

// ================= SIGNUP =================

const signup = catchAsync(async (req, res, next) => {

  const {
    name,
    email,
    password,
  } = req.body;

  // check if user exists
  const userExist = await UserModel.findOne({
    email,
  });

  if (userExist) {
    return next(
      new AppError(
        "User already exists",
        409
      )
    );
  }

  // get free plan
  const freePlan = await PlanModel.findOne({
    name: "free",
  });

  if (!freePlan) {
    return next(
      new AppError(
        "Free plan not found",
        500
      )
    );
  }

  // create user
  const user = await UserModel.create({
    name,
    email,
    password,
  });

  // create subscription
  const subscription =
    await SubscriptionModel.create({

      user: user._id,

      plan: freePlan._id,

      planName: freePlan.name,

      status: "free",

      startDate: new Date(),

      endDate: null,

      usage: {
        tokensUsedThisMonth: 0,
        requestsToday: 0,
        lastRequestDate: null,
        lastResetDate: new Date(),
      },

      history: [
        {
          fromPlan: null,
          toPlan: freePlan.name,
          reason:
            "Initial free subscription",
        },
      ],
    });

  // attach subscription to user
  user.subscription = subscription._id;

  await user.save();

  // generate token
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN,
    }
  );

  // cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    maxAge:
      7 * 24 * 60 * 60 * 1000,
  });

  // remove password
  user.password = undefined;

  // welcome email
  const templatePath = path.join(
    process.cwd(),
    "src/views/welcome.ejs"
  );

  const html = await ejs.renderFile(
    templatePath,
    {
      name: user.name,
      dashboardUrl:
        process.env.DASHBOARD_URL,
      year: new Date().getFullYear(),
    }
  );

  await sendWelcomeEmail({
    to: email,
    subject:
      "Welcome to AI Financial Advisor",
    html,
  });

  // response
  res.status(201).json({
    success: true,
    message: "Signup successful",
    token,
    user,
    subscription,
  });

});

// ================= LOGIN =================

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // generate token
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );

  // cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user,
  });
});

// ================= FORGOT PASSWORD =================

const forgotPassword = catchAsync(async (req, res, next) => {

  const { email } = req.body;

  const user = await UserModel.findOne({
    email,
  });

  if (!user) {
    return next(
      new AppError(
        "User not found",
        404
      )
    );
  }

  const OTP = generateRandomNumber();

  const hashedOTP = await bcrypt.hash(
    OTP.toString(),
    10
  );

  user.otp = hashedOTP;

  user.resetOTPExpiration =
    Date.now() + 15 * 60 * 1000;

  await user.save();

  const templatePath = path.join(
    process.cwd(),
    "src/views/reset-password.ejs"
  );

  const html = await ejs.renderFile(
    templatePath,
    {
      otp: OTP,
      year: new Date().getFullYear(),
    }
  );

  try {

    await sendForgetEmail({
      email: user.email,
      subject: "Reset Password",
      message: html,
    });

    res.status(200).json({
      success: true,
      message:
        "Reset code sent to your email",
    });

  } catch (error) {

    user.otp = undefined;

    user.resetOTPExpiration =
      undefined;

    await user.save();

    return next(
      new AppError(
        "Error sending email",
        500
      )
    );
  }

});

// ================= RESET PASSWORD =================

const resetPassword = catchAsync(async (req, res, next) => {

  const {
    email,
    otp,
    newPassword,
  } = req.body;

  if (
    !email ||
    !otp ||
    !newPassword
  ) {
    return next(
      new AppError(
        "Missing email, OTP or password",
        400
      )
    );
  }

  const user = await UserModel.findOne({
    email,
  });

  if (
    !user ||
    user.resetOTPExpiration <
    Date.now()
  ) {
    return next(
      new AppError(
        "OTP expired or user not found",
        400
      )
    );
  }

  const isValid = await bcrypt.compare(
    otp,
    user.otp
  );

  if (!isValid) {
    return next(
      new AppError(
        "Invalid OTP",
        400
      )
    );
  }

  user.password = newPassword;

  user.otp = undefined;

  user.resetOTPExpiration =
    undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message:
      "Password successfully reset",
  });

});

// ================= GOOGLE CALLBACK =================

const googleCallback = catchAsync(async (req, res) => {
  const user = req.user;

  const token = generateToken(user._id);

  sendCookie(res, token);
  console.log(process.env.CLIENT_URL);

  res.redirect(process.env.CLIENT_URL);
});

export {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleCallback,
};
