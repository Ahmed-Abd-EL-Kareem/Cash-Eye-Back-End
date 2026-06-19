import { Router } from "express";
import * as hotelController from "./hotel.controller.js";
import {
  validateObjectId,
  validateCreateHotel,
} from "./hotel.validation.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();

// Public
router.get("/", hotelController.getHotels);
router.get("/nearby", hotelController.getNearbyHotels);
router.get("/slug/:slug", hotelController.getHotelBySlug);
router.get("/top", hotelController.getTopHotels);
router.get("/meta", hotelController.getHotelMeta); // ← اتنقل هنا قبل /:id

router.get("/:id", validateObjectId, hotelController.getHotel);

// Admin
router.use(protect, restrictTo("admin"));
router.get("/admin/stats", hotelController.getHotelStats);
router.post("/", validateCreateHotel, hotelController.createHotel);
router.patch("/:id", validateObjectId, hotelController.updateHotel);
router.delete("/:id", validateObjectId, hotelController.deleteHotel);

export default router;