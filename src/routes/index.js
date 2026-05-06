import express from "express";
import UserController from '../modules/users/user.controller.js'
import { forgotPassword, resetPassword } from "../modules/auth/auth.service.js";

const router = express.Router();
router.route("/users").get(UserController.getAllUsers).post(UserController.createUser)
router.route("/users/:id").get(UserController.getUserById).patch(UserController.updateUserById).delete(UserController.deleteUserById)
//! Auth routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router