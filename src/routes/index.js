// import usersRouter from "../modules/users/users.route.js"
import authRouter from "../modules/auth/auth.routes.js"
import subscriptionRouter from "../modules/subscriptions/subscription.routes.js";
import express from "express";
import UserController from '../modules/users/user.controller.js'
import { forgotPassword, resetPassword } from "../modules/auth/auth.service.js";

const router = express.Router();

// ? User Router
router.use("/users", usersRouter)

//! Auth routes
router.use('/auth', authRouter)

//? Subscriptions 
router.use("/subscriptions", subscriptionRouter);

export default router;
export default router
