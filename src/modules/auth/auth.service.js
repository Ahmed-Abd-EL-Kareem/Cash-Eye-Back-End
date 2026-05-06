import bcrypt from "bcrypt";
import path from "path";
import ejs from "ejs";
import UserModel from "../users/user.model.js"
import AppError from "../../utils/appError.js"
import { catchAsync } from '../../utils/catchAsync.js'
import { generateRandomNumber } from "../../utils/generateOTP.js";
import { sendEmail } from "../../utils/email.js";


export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const OTP = generateRandomNumber();
  const hashedOTP = await bcrypt.hash(OTP.toString(), 10);
  user.OTP = hashedOTP;
  user.resetOTPExpiration = Date.now() + 15 * 60 * 1000;
  await user.save();

  const templatePath = path.join(process.cwd(), "views/emails/reset-password.ejs");

  const html = await ejs.renderFile(templatePath, {
    otp: OTP,
    year: new Date().getFullYear(),
  });


  try {
    await sendEmail({ email: user.email, subject: "reset password", message: html });
    res.status(200).json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.log(error)
    user.OTP = undefined;
    user.resetOTPExpiration = undefined;
    await user.save();
    res.status(500).json({ message: "Error sending email. Try again later." });
  }
});
export const resetPassword = catchAsync(async (req, res) => {
  const { newPassword, email, otp } = req.body;

  if (!otp || !newPassword || !email) {
    return res.status(400).json({ message: "Missing email, OTP, or new password" });
  }

  const user = await UserModel.findOne({ email });

  if (!user || user.resetOTPExpiration < Date.now()) {
    return res.status(400).json({ message: "OTP expired or user not found" });
  }

  const isValid = await bcrypt.compare(otp, user.OTP);

  if (!isValid) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.password = newPassword;
  user.OTP = undefined;
  user.resetOTPExpiration = undefined;
  await user.save();

  res.status(200).json({ message: "Password successfully reset" });
});