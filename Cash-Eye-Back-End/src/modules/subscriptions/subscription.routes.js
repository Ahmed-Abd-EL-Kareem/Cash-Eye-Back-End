import express from "express";
import * as subscriptionController from "./subscription.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = express.Router();

router.get("/plans", subscriptionController.getPlans);

router.use(protect);
router.get("/my", subscriptionController.getMySubscription);
router.patch("/change-plan", subscriptionController.changePlan);

router.use(restrictTo("admin"));
router.get("/admin/all", subscriptionController.adminGetAllSubscriptions);
router.get("/admin/stats", subscriptionController.adminGetPlanStats);
router.patch("/admin/user/:userId/plan", subscriptionController.adminChangePlan);

export default router;
