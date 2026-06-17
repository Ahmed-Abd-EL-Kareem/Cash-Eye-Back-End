// import mongoose from "mongoose";

// const subscriptionSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       unique: true,
//     },
//     plan: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Plan",
//       required: true,
//     },
//     planName: {
//       type: String,
//       enum: ["free", "pro"],
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["active", "canceled", "free", "past_due"],
//       default: "free",
//     },
//     startDate: { type: Date, default: Date.now },
//     endDate: { type: Date, default: null },
//     canceledAt: { type: Date, default: null },

//     // Stripe fields
//     stripeCustomerId: { type: String, unique: true, sparse: true },
//     stripeSubscriptionId: { type: String, unique: true, sparse: true },

//     usage: {
//       tokensUsedThisMonth: { type: Number, default: 0 },
//       requestsToday: { type: Number, default: 0 },
//       tripsThisMonth: { type: Number, default: 0 }, // ← trip generation quota
//       lastRequestDate: { type: Date, default: null },
//       lastResetDate: { type: Date, default: Date.now },
//     },

//     history: [
//       {
//         fromPlan: String,
//         toPlan: String,
//         changedAt: { type: Date, default: Date.now },
//         reason: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// // ─── Reset daily request counter ─────────────────────────────────────────────
// subscriptionSchema.methods.checkAndResetDaily = function () {
//   const today = new Date().toDateString();
//   const lastRequest = this.usage.lastRequestDate
//     ? this.usage.lastRequestDate.toDateString()
//     : null;

//   if (lastRequest !== today) {
//     this.usage.requestsToday = 0;
//     this.usage.lastRequestDate = new Date();
//   }
// };

// // ─── Reset monthly token + trip counters ─────────────────────────────────────
// subscriptionSchema.methods.checkAndResetMonthly = function () {
//   const now = new Date();
//   const lastReset = this.usage.lastResetDate;
//   const monthDiff =
//     (now.getFullYear() - lastReset.getFullYear()) * 12 +
//     (now.getMonth() - lastReset.getMonth());

//   if (monthDiff >= 1) {
//     this.usage.tokensUsedThisMonth = 0;
//     this.usage.lastResetDate = now;
//   }
// };

// // ─── Reset monthly trip counter ───────────────────────────────────────────────
// // Separate from checkAndResetMonthly so the middleware can call it independently
// subscriptionSchema.methods.checkAndResetTrips = function () {
//   const now = new Date();
//   const lastReset = this.usage.lastResetDate;
//   const monthDiff =
//     (now.getFullYear() - lastReset.getFullYear()) * 12 +
//     (now.getMonth() - lastReset.getMonth());

//   if (monthDiff >= 1) {
//     this.usage.tripsThisMonth = 0;
//   }
// };

// const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
// export default SubscriptionModel;\
// ? ///////////////////////////////////
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planName: {
      type: String,
      enum: ["free", "premium", "pro"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "free", "past_due", "trial", "expired"],
      default: "free",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    canceledAt: { type: Date, default: null },

    // Stripe fields
    stripeCustomerId: { type: String, unique: true, sparse: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },

    usage: {
      tokensUsedThisMonth: { type: Number, default: 0 },
      requestsToday: { type: Number, default: 0 },
      tripsThisMonth: { type: Number, default: 0 },
      lastRequestDate: { type: Date, default: null },
      lastResetDate: { type: Date, default: Date.now },
    },

    history: [
      {
        fromPlan: String,
        toPlan: String,
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

// ─── Reset daily request counter ──────────────────────────────────────────────
subscriptionSchema.methods.checkAndResetDaily = function () {
  const today = new Date().toDateString();
  const lastRequest = this.usage.lastRequestDate
    ? this.usage.lastRequestDate.toDateString()
    : null;

  if (lastRequest !== today) {
    this.usage.requestsToday = 0;
    this.usage.lastRequestDate = new Date();
  }
};

// ─── Reset monthly token + trip counters ──────────────────────────────────────
subscriptionSchema.methods.checkAndResetMonthly = function () {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;
  const monthDiff =
    (now.getFullYear() - lastReset.getFullYear()) * 12 +
    (now.getMonth() - lastReset.getMonth());

  if (monthDiff >= 1) {
    this.usage.tokensUsedThisMonth = 0;
    this.usage.lastResetDate = now;
  }
};

// ─── Reset monthly trip counter ───────────────────────────────────────────────
subscriptionSchema.methods.checkAndResetTrips = function () {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;
  const monthDiff =
    (now.getFullYear() - lastReset.getFullYear()) * 12 +
    (now.getMonth() - lastReset.getMonth());

  if (monthDiff >= 1) {
    this.usage.tripsThisMonth = 0;
  }
};

const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
export default SubscriptionModel;