import express from "express";
<<<<<<< HEAD
import UserController from '../modules/users/user.controller.js'
import { forgotPassword, resetPassword } from "../modules/auth/auth.service.js";

const router = express.Router();
router.route("/users").get(UserController.getAllUsers).post(UserController.createUser)
router.route("/users/:id").get(UserController.getUserById).patch(UserController.updateUserById).delete(UserController.deleteUserById)
//! Auth routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

=======
import usersRouter from "../modules/users/users.route.js"
import authRouter from "../modules/auth/auth.routes.js"
import subscriptionRouter from "../modules/subscriptions/subscription.routes.js";
const router = express.Router();

// ? User Router
router.use("/users", usersRouter)

//! Auth routes
router.use('/auth', authRouter)

//? Subscriptions 
router.use("/subscriptions", subscriptionRouter);
>>>>>>> 63d9c01 (Add Subscription & SignUp)
export default router