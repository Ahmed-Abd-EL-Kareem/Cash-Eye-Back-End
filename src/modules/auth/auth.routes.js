import express from "express";
import passport from "../../config/passport.js";
import * as AuthController from "./auth.controller.js";

const router = express.Router();

router.post("/signup", AuthController.register);
router.post("/forgot-password", AuthController.forgotPass);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/reset-password", AuthController.resetPass);
router.post("/login", AuthController.loginUser);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  AuthController.googleAuthCallback
);

export default router;
