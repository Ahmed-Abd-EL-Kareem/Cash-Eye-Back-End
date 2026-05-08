import bcrypt from "bcrypt";
import path from "path";
import ejs from "ejs";
import UserModel from "../users/user.model.js"
import AppError from "../../utils/appError.js"
import { catchAsync } from '../../utils/catchAsync.js'
import { generateRandomNumber } from "../../utils/generateOTP.js";
<<<<<<< HEAD
import { sendEmail } from "../../utils/email.js";


export const forgotPassword = catchAsync(async (req, res) => {
=======
import { sendForgetEmail, sendWelcomeEmail } from "../../utils/email.js";
import jwt from "jsonwebtoken";
import PlanModel from "../plans/plan.model.js";
import SubscriptionModel from "../subscriptions/subscription.model.js";

// ! signup
const signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // check if user already exists
  const userExist = await UserModel.findOne({ email });

  if (userExist) {
    return next(new AppError("User already exists", 409));
  }

  // get free plan
  const freePlan = await PlanModel.findOne({ name: "free" });

  if (!freePlan) {
    return next(new AppError("Free plan not found", 500));
  }

  // create user
  const user = await UserModel.create({
    name,
    email,
    password,
  });

  // create subscription
  const subscription = await SubscriptionModel.create({
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
        reason: "Initial free subscription",
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
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

  // set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // remove password from response
  user.password = undefined;

  // send welcome email
  const templatePath = path.join(
    process.cwd(),
    "src/views/welcome.ejs"
  );

  const html = await ejs.renderFile(templatePath, {
    name: user.name,
    dashboardUrl: process.env.DASHBOARD_URL,
    year: new Date().getFullYear(),
  });

  await sendWelcomeEmail({
    to: email,
    subject: "Welcome to AI Financial Advisor",
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

// ! forgot password
const forgotPassword = catchAsync(async (req, res, next) => {
>>>>>>> 63d9c01 (Add Subscription & SignUp)
  const { email } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const OTP = generateRandomNumber();
  const hashedOTP = await bcrypt.hash(OTP.toString(), 10);
<<<<<<< HEAD
  user.OTP = hashedOTP;
  user.resetOTPExpiration = Date.now() + 15 * 60 * 1000;
  await user.save();

  const templatePath = path.join(process.cwd(), "views/emails/reset-password.ejs");
=======
  user.otp = hashedOTP;
  user.resetOTPExpiration = Date.now() + 15 * 60 * 1000;
  await user.save();

  const templatePath = path.join(process.cwd(), "src/views/reset-password.ejs");
>>>>>>> 63d9c01 (Add Subscription & SignUp)

  const html = await ejs.renderFile(templatePath, {
    otp: OTP,
    year: new Date().getFullYear(),
  });


  try {
<<<<<<< HEAD
    await sendEmail({ email: user.email, subject: "reset password", message: html });
    res.status(200).json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.log(error)
    user.OTP = undefined;
=======
    await sendForgetEmail({ email: user.email, subject: "reset password", message: html });
    res.status(200).json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.log(error)
    user.otp = undefined;
>>>>>>> 63d9c01 (Add Subscription & SignUp)
    user.resetOTPExpiration = undefined;
    await user.save();
    res.status(500).json({ message: "Error sending email. Try again later." });
  }
});
<<<<<<< HEAD
export const resetPassword = catchAsync(async (req, res) => {
=======

// ? reset password
const resetPassword = catchAsync(async (req, res, next) => {
>>>>>>> 63d9c01 (Add Subscription & SignUp)
  const { newPassword, email, otp } = req.body;

  if (!otp || !newPassword || !email) {
    return res.status(400).json({ message: "Missing email, OTP, or new password" });
  }

  const user = await UserModel.findOne({ email });

  if (!user || user.resetOTPExpiration < Date.now()) {
    return res.status(400).json({ message: "OTP expired or user not found" });
  }

<<<<<<< HEAD
  const isValid = await bcrypt.compare(otp, user.OTP);
=======
  const isValid = await bcrypt.compare(otp, user.otp);
>>>>>>> 63d9c01 (Add Subscription & SignUp)

  if (!isValid) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.password = newPassword;
<<<<<<< HEAD
  user.OTP = undefined;
=======
  user.otp = undefined;
>>>>>>> 63d9c01 (Add Subscription & SignUp)
  user.resetOTPExpiration = undefined;
  await user.save();

  res.status(200).json({ message: "Password successfully reset" });
<<<<<<< HEAD
});
=======
});



export { signup, forgotPassword, resetPassword }
>>>>>>> 63d9c01 (Add Subscription & SignUp)
