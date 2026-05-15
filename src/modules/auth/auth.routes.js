import express from "express";
import * as AuthController from "./auth.controller.js";
import passport from "../../config/passport.js";
const router = express.Router();



router.post("/signup", AuthController.register);
router.post("/forgot-password", AuthController.forgotPass);
router.post("/reset-password", AuthController.resetPass);
router.post("/login", AuthController.loginUser);
// Google Login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google Callback
router.get(
  "/google/callback",

  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),

  AuthController.googleAuthCallback
);


export default router