import express from "express";
import UserController from '../modules/users/user.controller.js'
// import { forgotPassword, resetPassword } from "../modules/auth/auth.service.js";

////////Hala/////////
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

router.get(
  "/google",
  AuthController.googleLogin.bind(AuthController)
);

router.get(
  "/google/callback",
  AuthController.googleCallback.bind(AuthController)
);

export default router