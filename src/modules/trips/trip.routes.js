import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";

const router = Router();

router.use(protect);

// String routes BEFORE /:id
router.get("/admin/all", restrictTo("admin"), tripController.adminGetAllTrips);
router.post("/generate", checkAIQuota(true), tripController.generateTrip);
// router.post("/generate", tripController.generateTrip);

router.get("/", tripController.getMyTrips);
router.get("/:id", tripController.getTripById);
router.patch("/:id", tripController.updateTrip);
router.delete("/:id", tripController.deleteTrip);

export default router;