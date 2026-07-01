// import mongoose from "mongoose";

// // ─── Day sub-schema ───────────────────────────────────────────────────────────
// // Embedded because days are always read together with the trip
// // and never queried independently.
// const daySchema = new mongoose.Schema(
//   {
//     day: { type: Number, required: true },
//     title: { type: String, default: null },
//     activities: { type: [String], default: [] },
//     meals: { type: [String], default: [] },
//     accommodation: { type: String, default: null },
//     tips: { type: String, default: null },
//     estimatedCost: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// // ─── Trip schema ──────────────────────────────────────────────────────────────
// const tripSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // AI-generated or manually saved
//     title: { type: String, required: true, trim: true },
//     destination: { type: String, required: true, trim: true },
//     duration: { type: Number, required: true, min: 1 },

//     budget: {
//       type: String,
//       enum: ["budget", "mid-range", "luxury"],
//       default: "mid-range",
//     },

//     travelers: { type: Number, default: 1, min: 1 },
//     interests: { type: [String], default: [] },

//     // Itinerary from AI
//     days: { type: [daySchema], default: [] },
//     summary: { type: String, default: null },

//     estimatedTotalCost: { type: Number, default: 0 },
//     currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

//     // Language the trip was generated in
//     language: { type: String, enum: ["en", "ar"], default: "en" },

//     status: {
//       type: String,
//       enum: ["draft", "saved", "archived"],
//       default: "draft",
//     },

//     isAIGenerated: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// tripSchema.index({ user: 1, createdAt: -1 });
// tripSchema.index({ destination: 1, status: 1 });

// const TripModel = mongoose.model("Trip", tripSchema);
// export default TripModel;
// ? //////////////////////////////////
// import mongoose from "mongoose";

// // ─── Day sub-schema ───────────────────────────────────────────────────────────
// // Embedded because days are always read together with the trip
// // and never queried independently.
// const daySchema = new mongoose.Schema(
//   {
//     day: { type: Number, required: true },
//     title: { type: String, default: null },
//     activities: { type: [String], default: [] },
//     meals: { type: [String], default: [] },
//     accommodation: { type: String, default: null },
//     tips: { type: String, default: null },
//     estimatedCost: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// // ─── Trip schema ──────────────────────────────────────────────────────────────
// const tripSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // AI-generated or manually saved
//     title: { type: String, required: true, trim: true },
//     destination: { type: String, required: true, trim: true },
//     imageUrl: {
//       type: String,
//       default: null,
//       trim: true,
//       default:"https://i.pinimg.com/1200x/21/93/01/219301815003836b4f46a5401a0b50d2.jpg",
//     },
//     duration: { type: Number, required: true, min: 1 },

//     budget: {
//       type: String,
//       enum: ["budget", "mid-range", "luxury"],
//       default: "mid-range",
//     },

//     travelers: { type: Number, default: 1, min: 1 },
//     interests: {
//       type: [{
//         type: String,
//         lowercase: true
//       }], default: [] },

//     // Itinerary from AI
//     days: { type: [daySchema], default: [] },
//     summary: { type: String, default: null },

//     estimatedTotalCost: { type: Number, default: 0 },
//     currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

//     // Language the trip was generated in
//     language: { type: String, enum: ["en", "ar"], default: "en" },

//     status: {
//       type: String,
//       enum: ["draft", "saved", "archived"],
//       default: "draft",
//     },

//     isAIGenerated: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// tripSchema.index({ user: 1, createdAt: -1 });
// tripSchema.index({ destination: 1, status: 1 });

// const TripModel = mongoose.model("Trip", tripSchema);
// export default TripModel;

import mongoose from "mongoose";

// ─── Localized string sub-schema ──────────────────────────────────────────────
// Mirrors the Hotel model's { en, ar } pattern for every AI-generated
// display field. Kept as its own schema so it's easy to reuse and to
// require both languages consistently.
const localizedStringSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    ar: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Same as above, but optional — some fields (accommodation/tips) can be
// empty for a given day without breaking validation.
const localizedStringOptionalSchema = new mongoose.Schema(
  {
    en: { type: String, default: "", trim: true },
    ar: { type: String, default: "", trim: true },
  },
  { _id: false }
);

// Localized string ARRAY (activities / meals) — each entry is bilingual,
// so "08:00 — Visit the Egyptian Museum" and its Arabic equivalent stay
// paired together instead of being two parallel arrays that can drift
// out of sync in length/order.
const localizedListItemSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true },
    ar: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// ─── Day sub-schema ───────────────────────────────────────────────────────────
// Embedded because days are always read together with the trip
// and never queried independently.
const daySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: localizedStringOptionalSchema, default: () => ({ en: "", ar: "" }) },
    activities: { type: [localizedListItemSchema], default: [] },
    meals: { type: [localizedListItemSchema], default: [] },
    accommodation: { type: localizedStringOptionalSchema, default: () => ({ en: "", ar: "" }) },
    tips: { type: localizedStringOptionalSchema, default: () => ({ en: "", ar: "" }) },
    estimatedCost: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Trip schema ──────────────────────────────────────────────────────────────
const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // AI-generated or manually saved — bilingual display fields
    title: { type: localizedStringSchema, required: true },
    destination: { type: localizedStringSchema, required: true },

    imageUrl: {
      type: String,
      default: "https://i.pinimg.com/1200x/21/93/01/219301815003836b4f46a5401a0b50d2.jpg",
      trim: true,
    },
    duration: { type: Number, required: true, min: 1 },

    budget: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      default: "mid-range",
    },

    travelers: { type: Number, default: 1, min: 1 },
    interests: {
      type: [{
        type: String,
        lowercase: true
      }], default: []
    },

    // Itinerary from AI
    days: { type: [daySchema], default: [] },
    summary: { type: localizedStringSchema, required: true },

    estimatedTotalCost: { type: Number, default: 0 },
    currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

    // Language the user requested / the trip's primary display language.
    // Both `en` and `ar` content is always generated and stored — this
    // field is just a UI hint for which one to show by default.
    language: { type: String, enum: ["en", "ar"], default: "en" },

    status: {
      type: String,
      enum: ["draft", "saved", "archived"],
      default: "draft",
    },

    isAIGenerated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index on both languages so search(["title", "destination"]) in
// trip.service.js keeps working against localized subfields.
tripSchema.index({ "title.en": "text", "title.ar": "text", "destination.en": "text", "destination.ar": "text" });
tripSchema.index({ user: 1, createdAt: -1 });
tripSchema.index({ "destination.en": 1, status: 1 });

const TripModel = mongoose.model("Trip", tripSchema);
export default TripModel;
