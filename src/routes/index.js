import express from "express";
import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/user.routes.js";
import subscriptionRouter from "../modules/subscriptions/subscription.routes.js";
import destinationRouter from "../modules/destinations/destination.routes.js";
import hotelRouter from "../modules/hotels/hotel.routes.js";
import bookingRouter from "../modules/bookings/booking.routes.js";
import tripRouter from "../modules/trips/trip.routes.js";
import aiRouter from "../modules/ai/ai.routes.js";
import bookingPaymentRoutes from "../modules/payments/booking/bookingPayment.routes.js";
import aiUsageRouter from "../modules/aiUsage/aiUsage.routes.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/destinations", destinationRouter);
router.use("/hotels", hotelRouter);
router.use("/bookings", bookingRouter);
router.use("/trips", tripRouter);
router.use("/ai", aiRouter);
router.use("/payments", bookingPaymentRoutes);
router.use("/ai-usage", aiUsageRouter);

export default router;