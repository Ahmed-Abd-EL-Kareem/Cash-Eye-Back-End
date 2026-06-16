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

// ─── Public routes ────────────────────────────────────────────────────────────

// IMPORTANT: specific string routes (/nearby, /slug/:slug) must come BEFORE
// the wildcard param route (/:id), otherwise Express matches them as ObjectIds
// and returns 400 "Invalid destination ID".
router.get("/nearby", destinationController.getNearbyDestinations);
router.get("/slug/:slug", destinationController.getDestinationBySlug);
router.get("/", destinationController.getDestinations);
router.get("/:id", validateObjectId, destinationController.getDestination);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.use(protect, restrictTo("admin"));
router.post("/", validateCreateDestination, destinationController.createDestination);
router.patch("/:id", validateObjectId, validateUpdateDestination, destinationController.updateDestination);
router.delete("/:id", validateObjectId, destinationController.deleteDestination);

export default router;
