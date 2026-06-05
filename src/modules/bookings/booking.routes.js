import { Router } from "express";

import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} from "./booking.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();

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

export default router;