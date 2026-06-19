// import { Router } from "express";
// import * as tripController from "./trip.controller.js";
// import { protect } from "../../middleware/auth.middleware.js";
// import { restrictTo } from "../../middleware/role.middleware.js";
// import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";

// const router = Router();

// router.use(protect);

// // String routes BEFORE /:id
// router.get("/admin/all", restrictTo("admin"), tripController.adminGetAllTrips);
// router.post("/generate", checkAIQuota(true), tripController.generateTrip);
// // router.post("/generate", tripController.generateTrip);

// router.get("/", tripController.getMyTrips);
// router.get("/:id", tripController.getTripById);
// router.patch("/:id", tripController.updateTrip);
// router.delete("/:id", tripController.deleteTrip);

// export default router;
// ? ///////////////////////////////////////////
import { Router } from "express";
import * as tripController from "./trip.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";
import { checkAIQuota } from "../../middleware/aiUsage.middleware.js";

const router = Router();

router.use(protect);

// String routes BEFORE /:id
router.get("/admin/all", restrictTo("admin"), tripController.adminGetAllTrips);
router.get(
  "/admin/:id",
  restrictTo("admin"),
  tripController.adminGetTripById
);

router.patch(
  "/admin/:id",
  restrictTo("admin"),
  tripController.adminUpdateTrip
);
router.get("/stats", restrictTo("admin"), tripController.getTripStats);
router.post("/generate", checkAIQuota(true), tripController.generateTrip);
// router.post("/generate", tripController.generateTrip);

router.get("/", tripController.getMyTrips);
router.get("/:id", tripController.getTripById);
router.patch("/:id", tripController.updateTrip);
router.delete("/:id", tripController.deleteTrip);
// POST /api/v1/trips  ← add this line (no AI quota check needed)
router.post("/", tripController.createManualTrip);


export default router;