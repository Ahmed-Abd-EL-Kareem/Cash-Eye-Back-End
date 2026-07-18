import { Router } from "express";

import * as hotelController from "./hotel.controller.js";

import { validateObjectId, validateCreateHotel } from "./hotel.validation.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { validateAvailabilityQuery } from "../bookings/booking.validation.js";

const router = Router();

// Public
router.get("/", hotelController.getHotels);

router.get("/nearby", hotelController.getNearbyHotels);

router.get("/slug/:slug", hotelController.getHotelBySlug);

// Availability endpoints (public - no auth)
router.get(
  "/:hotelId/availability",
  validateObjectId("hotelId"),
  validateAvailabilityQuery,
  hotelController.getHotelAvailability
);
router.get(
  "/:hotelId/rooms/:roomId/availability",
  validateObjectId("hotelId"),
  validateObjectId("roomId"),
  validateAvailabilityQuery,
  hotelController.getRoomAvailability
);

// Admin
router.use(protect, restrictTo("admin"));
router.get("/admin/stats", hotelController.getHotelStats);
router.get("/top", hotelController.getTopHotels);

router.get("/:id", validateObjectId("id"), hotelController.getHotel);
router.get("/meta", hotelController.getHotelMeta);

router.post("/", validateCreateHotel, hotelController.createHotel);

router.patch("/:id", validateObjectId("id"), hotelController.updateHotel);

router.delete("/:id", validateObjectId("id"), hotelController.deleteHotel);

export default router;
