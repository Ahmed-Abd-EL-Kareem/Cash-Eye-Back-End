import { Router } from "express";

import * as hotelController from "./hotel.controller.js";

import {
  validateObjectId,
  validateCreateHotel,
} from "./hotel.validation.js";
import { seedHotels } from "../../seed/hotels.seed.js";

const router = Router();

router.get("/seed", seedHotels)
// Public
router.get("/", hotelController.getHotels);

router.get(
  "/nearby",
  hotelController.getNearbyHotels
);

router.get(
  "/slug/:slug",
  hotelController.getHotelBySlug
);

router.get(
  "/:id",
  validateObjectId,
  hotelController.getHotel
);

// Admin
router.post(
  "/",
  validateCreateHotel,
  hotelController.createHotel
);

router.patch(
  "/:id",
  validateObjectId,
  hotelController.updateHotel
);

router.delete(
  "/:id",
  validateObjectId,
  hotelController.deleteHotel
);

export default router;