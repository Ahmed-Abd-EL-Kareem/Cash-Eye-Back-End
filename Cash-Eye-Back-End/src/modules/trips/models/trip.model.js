import mongoose from "mongoose";
import { t } from "../i18n/index.js";

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// i18n String Sub-Schema
// ─────────────────────────────────────────────

const I18nStringSchema = new Schema(
  {
    ar: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Sub-Schemas
// ─────────────────────────────────────────────

const LocationSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address: String,
    city: String,
    country: String,
  },
  { _id: false }
);

const ActivitySchema = new Schema(
  {
    time: { type: String, required: true },
    attractionId: { type: Schema.Types.ObjectId, ref: "Attraction" },
    title: { type: I18nStringSchema, required: true },
    description: I18nStringSchema,
    notes: I18nStringSchema,
    duration: Number,
    estimatedCost: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    location: LocationSchema,
    bookingStatus: {
      type: String,
      enum: ["not_required", "pending", "booked", "failed"],
      default: "not_required",
    },
    weatherDependency: { type: Boolean, default: false },
    transportation: {
      mode: {
        type: String,
        enum: ["walking", "car", "bus", "metro", "train", "flight", "boat"],
      },
      durationMinutes: Number,
      distanceKm: Number,
      cost: {
        amount: Number,
        currency: { type: String, default: "USD" },
      },
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TripDaySchema = new Schema(
  {
    day: { type: Number, required: true, min: 1 },
    date: Date,
    title: { type: I18nStringSchema, required: true },
    description: I18nStringSchema,
    cityId: { type: Schema.Types.ObjectId, ref: "Destination" },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel" },
    activities: [ActivitySchema],
    dailyCost: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    notes: I18nStringSchema,
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const AIMetadataSchema = new Schema(
  {
    provider: { type: String, default: "openai" },
    model: String,
    promptVersion: String,
    rawResponse: Schema.Types.Mixed,
    tokens: {
      prompt: Number,
      completion: Number,
      total: Number,
    },
    generationTime: Number,
    generatedAt: { type: Date, default: Date.now },
    sessionId: String,
  },
  { _id: false }
);

const BudgetSchema = new Schema(
  {
    total: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    breakdown: {
      accommodation: { type: Number, default: 0 },
      transportation: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const PermissionsSchema = new Schema(
  {
    visibility: {
      type: String,
      enum: ["private", "public", "collaborative"],
      default: "private",
    },
    shareId: { type: String, unique: true, sparse: true },
    collaborators: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Main Trip Schema
// ─────────────────────────────────────────────

const TripSchema = new Schema(
  {
    // ── Core ──
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: I18nStringSchema, required: true },
    description: { type: I18nStringSchema },
    coverImage: String,

    // ── References ──
    destinationIds: [{ type: Schema.Types.ObjectId, ref: "Destination" }],
    hotelIds: [{ type: Schema.Types.ObjectId, ref: "Hotel" }],

    // ── Dates ──
    startDate: { type: Date },
    endDate: { type: Date },
    durationDays: { type: Number, min: 1 },

    // ── Travelers ──
    travelersCount: { type: Number, default: 1, min: 1, max: 500 },
    travelType: {
      type: String,
      enum: ["solo", "couple", "family", "group", "business"],
      default: "solo",
    },

    // ── Budget ──
    budget: BudgetSchema,

    // ── State Machine ──
    status: {
      type: String,
      enum: ["draft", "generated", "customized", "booked", "active", "completed", "archived", "cancelled"],
      default: "draft",
      index: true,
    },
    statusHistory: [
      {
        from: String,
        to: String,
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    // ── Itinerary ──
    itinerary: [TripDaySchema],

    // ── Source ──
    source: {
      type: String,
      enum: ["ai", "manual", "template", "imported"],
      default: "manual",
    },

    // ── AI Metadata ──
    aiMetadata: AIMetadataSchema,

    // ── Versioning ──
    currentVersionId: { type: Schema.Types.ObjectId, ref: "TripVersion" },
    version: { type: Number, default: 1 },

    // ── Permissions / Sharing ──
    permissions: PermissionsSchema,

    // ── Template ──
    isTemplate: { type: Boolean, default: false },
    templateId: { type: Schema.Types.ObjectId, ref: "Trip" },
    templateTags: [String],

    // ── Soft Delete & Archiving ──
    deletedAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null },

    // ── Favorites ──
    isFavorite: { type: Boolean, default: false },
    favoritedAt: Date,

    // ── Geospatial centroid (for map queries) ──
    centroid: LocationSchema,

    // ── Tags ──
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────

TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ userId: 1, deletedAt: 1 });
TripSchema.index({ userId: 1, startDate: -1 });
TripSchema.index({ destinationIds: 1 });
TripSchema.index({ "permissions.shareId": 1 });
TripSchema.index({ "permissions.visibility": 1 });
TripSchema.index({ tags: 1 });
TripSchema.index({ isTemplate: 1, templateTags: 1 });
TripSchema.index({ centroid: "2dsphere" });

// ─────────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────────

TripSchema.virtual("isActive").get(function () {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
});

TripSchema.virtual("isPast").get(function () {
  return this.endDate < new Date();
});

TripSchema.virtual("daysUntilTrip").get(function () {
  const diff = this.startDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

TripSchema.virtual("totalActivities").get(function () {
  return this.itinerary.reduce((sum, day) => sum + (day.activities?.length || 0), 0);
});

// ─────────────────────────────────────────────
// Pre-save Hooks
// ─────────────────────────────────────────────

TripSchema.pre("save", function (next) {
  // Auto-calculate duration
  if (this.startDate && this.endDate) {
    const diff = this.endDate - this.startDate;
    this.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  // Auto-calculate total budget from breakdown
  if (this.budget?.breakdown) {
    const { accommodation, transportation, activities, food, other } = this.budget.breakdown;
    this.budget.total =
      (accommodation || 0) + (transportation || 0) + (activities || 0) + (food || 0) + (other || 0);
  }

  next();
});

// ─────────────────────────────────────────────
// Static Methods
// ─────────────────────────────────────────────

TripSchema.statics.findActiveForUser = function (userId) {
  return this.find({
    userId,
    deletedAt: null,
    status: { $nin: ["archived", "cancelled"] },
  }).sort({ startDate: -1 });
};

TripSchema.statics.findNearby = function (coordinates, maxDistanceKm = 50) {
  return this.find({
    centroid: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
    "permissions.visibility": "public",
    deletedAt: null,
  });
};

TripSchema.statics.findTemplates = function (tags = []) {
  const query = { isTemplate: true, deletedAt: null };
  if (tags.length) query.templateTags = { $in: tags };
  return this.find(query)
    .select("title description templateTags coverImage travelType durationDays budget")
    .lean();
};

// ─────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────
TripSchema.methods.canTransitionTo = function (newStatus) {
  const transitions = {
    draft: ["generated", "customized", "archived", "cancelled"],
    generated: ["customized", "booked", "archived", "cancelled"],
    customized: ["booked", "archived", "cancelled"],
    booked: ["active", "cancelled"],
    active: ["completed", "cancelled"],
    completed: ["archived"],
    archived: [],
    cancelled: [],
  };
  return (transitions[this.status] || []).includes(newStatus);
};

TripSchema.methods.transitionTo = function (newStatus, userId, reason = "") {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(t("invalid_transition", "en", { from: this.status, to: newStatus }));
  }
  this.statusHistory.push({
    from: this.status,
    to: newStatus,
    changedBy: userId,
    reason,
  });
  this.status = newStatus;
  return this;
};

TripSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.status = "archived";
  return this;
};

TripSchema.methods.archive = function () {
  this.archivedAt = new Date();
  this.status = "archived";
  return this;
};

/**
 * Helper: get a localized string field value.
 * Usage: trip.getLocalized("title", "ar")
 */
TripSchema.methods.getLocalized = function (field, lang = "en") {
  const val = this[field];
  if (!val) return "";
  return val[lang] || val["en"] || val["ar"] || "";
};

export default mongoose.model("Trip", TripSchema);
