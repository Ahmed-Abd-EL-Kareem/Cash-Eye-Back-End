import { Router } from "express";
import * as bookingController from "./booking.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();

router.use(protect);

// User routes — /admin/* before /:id to avoid Express param collision
router.get("/admin/all", restrictTo("admin"), bookingController.adminGetAllBookings);
router.patch("/admin/:id/status", restrictTo("admin"), bookingController.adminUpdateStatus);

router.post("/", bookingController.createBooking);
router.get("/", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);
router.patch("/:id/cancel", bookingController.cancelBooking);

export default router;
