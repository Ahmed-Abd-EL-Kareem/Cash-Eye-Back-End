// import UserModel from "../users/User.model.js";
import UserModel from "../../Users/model/User.model.js"; // fixed path (actual file: src/Users/model/User.model.js)
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import sendEmail from "../../utils/sendEmail.js";

export const signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // check if user exists
  const userExist = await UserModel.findOne({ email });
  if (userExist) {
    return next(new AppError("User already exists", 400));
  }

  // create user
  const user = await UserModel.create({
    name,
    email,
    password,
  });

  // generate token
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // true في production
    sameSite: "lax",
  });

  // remove password from response
  user.password = undefined;

  // send welcome email
  await sendEmail({
    to: email,
    subject: "Welcome ",
    text: `Welcome ${name} to CashEye AI `,
  });

  res.status(201).json({
    message: "Signup successful",
    user,
  });
});