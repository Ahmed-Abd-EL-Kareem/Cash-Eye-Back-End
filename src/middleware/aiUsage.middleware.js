import { checkSubscription, requirePlan } from "./subscription.middleware.js";

/**
 * AI routes should use checkAiUsage (limits) and optionally requirePlan("pro").
 */
export const checkAiUsage = checkSubscription;

export { requirePlan };
