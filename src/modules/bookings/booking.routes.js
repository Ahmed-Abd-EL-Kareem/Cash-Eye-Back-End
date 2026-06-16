import { Router } from "express";
<<<<<<< HEAD
import * as bookingController from "./booking.controller.js";
=======

import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from "./booking.controller.js";

>>>>>>> 1c3d0d59e09f38e49e52123c1567f7768790a4b8
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();

<<<<<<< HEAD
router.use(protect);

// User routes — /admin/* before /:id to avoid Express param collision
router.get("/admin/all", restrictTo("admin"), bookingController.adminGetAllBookings);
router.patch("/admin/:id/status", restrictTo("admin"), bookingController.adminUpdateStatus);

router.post("/", bookingController.createBooking);
router.get("/", bookingController.getMyBookings);
router.get("/:id", bookingController.getBookingById);
router.patch("/:id/cancel", bookingController.cancelBooking);
=======
// All routes require authentication
router.use(protect);

// Create booking + Get bookings
router
  .route("/")
  .post(createBooking)
  .get(getAllBookings);

// Get single booking + Delete booking
router
  .route("/:id")
  .get(getBookingById)
  .delete(deleteBooking);

// Admin only: update booking status
router.patch(
  "/:id/status",
  restrictTo("admin"),
  updateBookingStatus
);
>>>>>>> 1c3d0d59e09f38e49e52123c1567f7768790a4b8

export default router;