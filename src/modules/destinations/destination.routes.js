import { Router } from "express";

import * as destinationController from "./destination.controller.js";

import {
  validateObjectId,
  validateCreateDestination,
  validateUpdateDestination,
} from "./destination.validation.js";

import { protect } from "../../middleware/auth.middleware.js";

import { restrictTo } from "../../middleware/role.middleware.js";

const router = Router();



router.get(
  "/",
  destinationController.getDestinations
);


router.get(
  "/nearby",
  destinationController.getNearbyDestinations
);

router.get(
  "/:id",
  validateObjectId,
  destinationController.getDestination
);


router.use(
  protect,
  restrictTo("admin")
);

router.post(
  "/",
  validateCreateDestination,
  destinationController.createDestination
);

router.patch(
  "/:id",
  validateObjectId,
  validateUpdateDestination,
  destinationController.updateDestination
);

router.delete(
  "/:id",
  validateObjectId,
  destinationController.deleteDestination
);

export default router;