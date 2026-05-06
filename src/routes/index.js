import express from "express";
import UserController from '../modules/users/user.controller.js'

const router = express.Router();
router.route("/users").get(UserController.getAllUsers).post(UserController.createUser)
router.route("/users/:id").get(UserController.getUserById).patch(UserController.updateUserById).delete(UserController.deleteUserById)

export default router