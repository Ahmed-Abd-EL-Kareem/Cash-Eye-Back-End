import { Router } from "express";
import * as controller from "../controllers/trip.controller.js";
import { authenticate, optionalAuth } from "../middlewares/auth.middleware.js";
import {
  standardLimiter,
  aiSaveLimiter,
  writeLimiter,
} from "../middlewares/rate-limit.middleware.js";
import i18nMiddleware from "../middlewares/i18n.middleware.js";
import {
  validate,
  createTripSchema,
  updateTripSchema,
  aiSaveTripSchema,
  statusTransitionSchema,
  tripFiltersSchema,
} from "../validators/trip.validator.js";

const router = Router();

// ── Apply i18n to ALL routes in this router ──────────────────────────────
router.use(i18nMiddleware);

// ─────────────────────────────────────────────
// Public Routes (no auth)
// ─────────────────────────────────────────────

router.get("/public",      standardLimiter, validate(tripFiltersSchema, "query"), controller.getPublicTrips);
router.get("/public/:shareId", standardLimiter, controller.getPublicTrip);
router.get("/templates",   standardLimiter, controller.getTemplates);
router.get("/nearby",      standardLimiter, controller.getNearbyTrips);

// ─────────────────────────────────────────────
// Protected Routes (JWT required)
// ─────────────────────────────────────────────
router.use(authenticate);

router.get("/stats",       standardLimiter, controller.getUserStats);
router.get("/my",          standardLimiter, validate(tripFiltersSchema, "query"), controller.getUserTrips);
router.post("/",           writeLimiter,    validate(createTripSchema), controller.createTrip);
router.post("/ai-save",    aiSaveLimiter,   validate(aiSaveTripSchema), controller.saveAITrip);

router.get("/:id",         standardLimiter, controller.getTripById);
router.put("/:id",         writeLimiter,    validate(updateTripSchema), controller.updateTrip);
router.delete("/:id",      writeLimiter,    controller.deleteTrip);

router.patch("/:id/status",           writeLimiter,    validate(statusTransitionSchema), controller.changeStatus);
router.post("/:id/duplicate",         writeLimiter,    controller.duplicateTrip);
router.patch("/:id/favorite",         standardLimiter, controller.toggleFavorite);

router.post("/:id/share",             writeLimiter,    controller.generateShareLink);
router.delete("/:id/share",           writeLimiter,    controller.revokeShareLink);
router.post("/:id/collaborators",     writeLimiter,    controller.addCollaborator);

router.get("/:id/versions",                       standardLimiter, controller.getTripVersions);
router.post("/:id/versions/:version/restore",     writeLimiter,    controller.restoreVersion);

export default router;
