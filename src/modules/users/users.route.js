import express from "express";
const router = express.Router();
import * as UserController from "./user.controller.js";


router.route("/").get(UserController.getUsers).post(UserController.createUsers)
router.route("/:id").get(UserController.getUser).patch(UserController.updateUser).delete(UserController.deleteUser)

export default router