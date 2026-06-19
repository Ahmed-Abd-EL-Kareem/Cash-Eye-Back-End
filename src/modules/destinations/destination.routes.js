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

// ─── Public routes ─────────────────────────────────────────
router.get("/nearby", destinationController.getNearbyDestinations);
router.get("/slug/:slug", destinationController.getDestinationBySlug);

// ─── Admin-only specific routes (لازم قبل /:id) ────────────
router.get(
  "/admin/stats",
  protect,
  restrictTo("admin"),
  destinationController.getDestinationStats
);
router.get(
  "/trending",
  protect,
  restrictTo("admin"),
  destinationController.getTrendingDestinations
);

// ─── باقي الـ public routes ─────────────────────────────────
router.get("/", destinationController.getDestinations);
router.get("/:id", validateObjectId, destinationController.getDestination);

// ─── Admin only (بعد /:id) ──────────────────────────────────
router.use(protect, restrictTo("admin"));
router.post("/", validateCreateDestination, destinationController.createDestination);
router.patch(
  "/:id",
  validateObjectId,
  validateUpdateDestination,
  destinationController.updateDestination
);
router.delete("/:id", validateObjectId, destinationController.deleteDestination);

export default router;
