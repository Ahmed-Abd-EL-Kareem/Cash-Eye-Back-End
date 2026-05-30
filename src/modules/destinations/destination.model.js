import mongoose from "mongoose";

// ─── Sub-schema: Attraction ───────────────────────────────────────────────────
const attractionSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, default: null, trim: true },
    },
<<<<<<< HEAD

    type: {
      type: String,
      trim: true,
    },

    entryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
=======
    type: {
      type: String,
      enum: [
        "historical", "museum", "market", "religious",
        "nature", "beach", "cultural", "landmark", "adventure"
      ],
      default: "historical",
    },
    entryFee: { type: Number, default: 0, min: 0 },
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
  },
  { _id: false }
);

<<<<<<< HEAD
=======
// ─── Main schema ──────────────────────────────────────────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
const destinationSchema = new mongoose.Schema(
  {
    // ── Bilingual content (i18n — EN + AR) ──────────────────────────────────
    name: {
      en: {
        type: String,
        required: true,
        trim: true,
      },

      ar: {
        type: String,
        required: true,
        trim: true,
      },
    },

<<<<<<< HEAD
=======
    // ── URL-safe slug — auto-generated from name.en ──────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
    slug: {
      type: String,
      required: true,
      unique: true,        // ← unique index
      lowercase: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

<<<<<<< HEAD
=======
    region: {
      type: String,
      enum: [
        "Upper Egypt", "Lower Egypt", "Sinai",
        "Red Sea", "Western Desert", "Delta", "Mediterranean",
      ],
      default: null,
    },

    category: {
      type: String,
      enum: [
        "historical", "beach", "adventure",
        "cultural", "religious", "nature", "other", "landmark"
      ],
      default: "historical",
    },

>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
    description: {
      en: {
        type: String,
        required: true,
      },

      ar: {
        type: String,
        required: true,
      },
    },
<<<<<<< HEAD

    attractions: {
      type: [attractionSchema],
      default: [],
    },

    bestMonths: {
      type: [String],
      default: [],
    },

    averageBudgetPerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["USD", "EGP"],
      default: "EGP",
    },

   
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number], 
        required: true,

        validate: {
          validator: function (value) {
            return (
              Array.isArray(value) &&
              value.length === 2 &&
              value.every((num) => typeof num === "number")
            );
          },

          message:
            "location.coordinates must contain [lng, lat]",
        },
      },
    },

    images: {
      type: [String],
      default: [],
=======

    attractions: { type: [attractionSchema], default: [] },

    bestMonths: { type: [String], default: [] },

    averageBudgetPerDay: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["EGP", "USD"], default: "EGP" },

    // ── GeoJSON Point — enables $near, $geoWithin, $geoIntersects ───────────
    // WHY GeoJSON instead of { lat, lng }?
    //   Flat lat/lng fields need a 2d index and only support planar math.
    //   GeoJSON + 2dsphere uses spherical math (correct on Earth's surface)
    //   and unlocks MongoDB's full geo query API:
    //     - find destinations within X km of a hotel
    //     - find all attractions inside a bounding box
    //     - sort by distance from user's current location
    //   Migrating from lat/lng to GeoJSON later means rewriting every
    //   document and every query — better to do it right from the start.
    location: {
      type: {
        type: String,
        enum: ["Point"],  // GeoJSON spec requires this field
        default: "Point",
      },
      coordinates: {
        type: [Number],   // [longitude, latitude] — GeoJSON order (lng first)
        default: [0, 0],
      },
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
    },

    // ── Images from gldv2_info.csv (Wikipedia Commons URLs) ─────────────────
    images: { type: [String], default: [] },
    coverImage: { type: String, default: null },

    // ── Soft delete — hides from public API without losing Pinecone vectors ──
    isActive: { type: Boolean, default: true },

    // ── Set true after Pinecone upsert in seeder ─────────────────────────────
    pineconeIndexed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

<<<<<<< HEAD

destinationSchema.index({ location: "2dsphere" });

=======
// ─── Pre-save: auto-generate slug ────────────────────────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
destinationSchema.pre("save", function () {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .trim()
<<<<<<< HEAD
=======
      .replace(/[^a-z0-9\s-]/g, "")
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
      .replace(/\s+/g, "-");
  }
});

<<<<<<< HEAD
const Destination = mongoose.model(
  "Destination",
  destinationSchema
);

export default Destination;
=======
// ─── Indexes ──────────────────────────────────────────────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e

// 2dsphere — required for all GeoJSON geo queries ($near, $geoWithin etc.)
// Must be declared on the GeoJSON field, not on lat/lng floats.
destinationSchema.index({ location: "2dsphere" });

// Text index — powers ?search= across both languages + description
// Only one text index allowed per collection in MongoDB.
destinationSchema.index({
  "name.en": "text",
  "name.ar": "text",
  "description.en": "text",
  "description.ar": "text",
});

// Compound filter index — most common query pattern:
// GET /destinations?city=Cairo&category=historical&isActive=true
destinationSchema.index({ city: 1, category: 1, isActive: 1 });

// Region filter — for "Upper Egypt itinerary" type queries
destinationSchema.index({ region: 1, isActive: 1 });

const DestinationModel = mongoose.model("Destination", destinationSchema);
export default DestinationModel;