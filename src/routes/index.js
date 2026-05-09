import express from "express";
import UserController from '../modules/users/user.controller.js'
// import { forgotPassword, resetPassword } from "../modules/auth/auth.service.js";

////////Hala/////////
import passport from "../config/passport.js";

import AuthController
from "../modules/auth/auth.controller.js";

const router = express.Router();
router.route("/users").get(UserController.getAllUsers).post(UserController.createUser)
router.route("/users/:id").get(UserController.getUserById).patch(UserController.updateUserById).delete(UserController.deleteUserById)
//! Auth routes
// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password", resetPassword);
//////////login route//////////


router.post(
  "/login",
  AuthController.login.bind(AuthController)
);

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

  AuthController.googleCallback.bind(AuthController)
);

export default router;