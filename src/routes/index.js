import express from "express";
import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/user.routes.js";
import subscriptionRouter from "../modules/subscriptions/subscription.routes.js";
import destinationRouter from "../modules/destinations/destination.routes.js";
const router = express.Router();

router.use("/users", usersRouter);
router.use("/auth", authRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/destinations", destinationRouter);

export default router;
