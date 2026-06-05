import express from "express";
import * as subscriptionController from "./subscription.controller.js";
import * as subscriptionPaymentController from "../payments/subscription/subscriptionPayment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = express.Router();

// Public routes
router.get("/plans", subscriptionController.getPlans);
// Webhook route for Stripe (no authentication - signature verified separately)
router.post("/webhook", subscriptionPaymentController.handleSubscriptionWebhook);

router.use(protect);
// Protected routes
router.get("/my", subscriptionController.getMySubscription);
router.patch("/change-plan", subscriptionController.changePlan);
// Payment routes for subscriptions (require authentication)
router.post("/pay/upgrade", subscriptionPaymentController.upgradeSubscription);
router.get("/pay/status/:subscriptionId", subscriptionPaymentController.getSubscriptionPaymentStatus);

router.use(restrictTo("admin"));
// Admin protected routes
router.get("/admin/all", subscriptionController.adminGetAllSubscriptions);
router.get("/admin/stats", subscriptionController.adminGetPlanStats);
router.patch("/admin/user/:userId/plan", subscriptionController.adminChangePlan);

export default router;
