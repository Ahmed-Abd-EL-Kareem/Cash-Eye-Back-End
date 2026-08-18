// import express from "express";
// import * as subscriptionController from "./subscription.controller.js";
// import * as subscriptionPaymentController from "../payments/subscription/subscriptionPayment.controller.js";
// import { protect } from "../../middleware/auth.middleware.js";
// import { restrictTo } from "../../middleware/role.middleware.js";

// const router = express.Router();

// // Public routes
// router.get("/plans", subscriptionController.getPlans);
// // Webhook route for Stripe (no authentication - signature verified separately)
// router.post("/webhook", subscriptionPaymentController.handleSubscriptionWebhook);

// router.use(protect);
// // Protected routes
// router.get("/my", subscriptionController.getMySubscription);

// // PATCH /change-plan — manual plan switch WITHOUT Stripe payment.
// // Use ONLY for downgrading to "free" or admin/testing. Do NOT use to upgrade to "pro"
// // (that requires payment via POST /pay/upgrade + Stripe webhook).
// router.patch("/change-plan", subscriptionController.changePlan);

// // Payment routes — upgrade goes through Stripe Checkout; plan updates via webhook.
// router.post("/pay/upgrade", subscriptionPaymentController.upgradeSubscription);
// // router.post("/pay/verify", subscriptionPaymentController.verifySubscriptionPayment);
// // router.get("/pay/verify", subscriptionPaymentController.verifySubscriptionPayment);
// router.get("/pay/status/:subscriptionId", subscriptionPaymentController.getSubscriptionPaymentStatus);

// router.use(restrictTo("admin"));
// // Admin protected routes
// router.get("/admin/all", subscriptionController.adminGetAllSubscriptions);
// router.get("/admin/stats", subscriptionController.adminGetPlanStats);
// router.patch("/admin/user/:userId/plan", subscriptionController.adminChangePlan);

// export default router;
// ? /////////////////////////////////
import express from "express";
import * as subscriptionController from "./subscription.controller.js";
import * as subscriptionPaymentController from "../payments/subscription/subscriptionPayment.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { restrictTo } from "../../middleware/role.middleware.js";

const router = express.Router();

// ── Public routes ──────────────────────────────────────────────────────────────
router.get("/plans", subscriptionController.getPlans);

// ── Webhook (no auth — Stripe signature verified separately) ───────────────────
router.post("/webhook", subscriptionPaymentController.handleSubscriptionWebhook);

router.use(protect);

// ── Protected routes ───────────────────────────────────────────────────────────
router.get("/my", subscriptionController.getMySubscription);
// router.patch("/change-plan", subscriptionController.changePlan);
router.patch("/cancel", subscriptionController.cancelSubscription); // ← 

// ── Payment routes ─────────────────────────────────────────────────────────────
router.post("/pay/upgrade", subscriptionPaymentController.upgradeSubscription);
router.post("/pay/intent", subscriptionPaymentController.createSubscriptionPaymentIntent);
router.post("/intent", subscriptionPaymentController.createSubscriptionPaymentIntent);
router.get("/pay/status/:subscriptionId", subscriptionPaymentController.getSubscriptionPaymentStatus);

router.use(restrictTo("admin"));

// ── Admin routes ───────────────────────────────────────────────────────────────
router.get("/admin/all", subscriptionController.adminGetAllSubscriptions);
router.get("/admin/stats", subscriptionController.adminGetPlanStats);
router.get("/admin/dashboard-stats", subscriptionController.getSubscriptionStats);
router.get("/admin/churn", subscriptionController.adminGetChurnStats);               // ← 
router.get("/admin/expiring", subscriptionController.adminGetExpiringSubscriptions); // ← 
router.patch("/admin/user/:userId/plan", subscriptionController.adminChangePlan);
router.patch("/admin/user/:userId/cancel", subscriptionController.adminCancelSubscription); // ← 

// ── Admin: Plan CRUD ───────────────────────────────────────────────────────────
router.post("/admin/plans", subscriptionController.createPlan);
router.patch("/admin/plans/:planId", subscriptionController.updatePlan);
router.post("/admin/create", subscriptionController.adminCreateSubscription);

export default router;