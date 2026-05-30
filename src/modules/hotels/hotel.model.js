// import mongoose from "mongoose";
// import { HOTEL_CATEGORIES } from "../../utils/constants.js";

// const hotelSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true },
//     city: { type: String, required: true, trim: true },
//     description: { type: String, required: true },
//     pricePerNight: { type: Number, required: true },
//     currency: { type: String, enum: ["USD", "EGP"], default: "EGP" },
//     rating: { type: Number, min: 0, max: 5, default: 0 },
//     amenities: [{ type: String }],
//     category: { type: String, enum: HOTEL_CATEGORIES, default: "standard" },
//     location: {
//       address: String,
//       lat: Number,
//       lng: Number,
//     },
//     images: [{ type: String }],
//     destinationSlug: { type: String },
//   },
//   { timestamps: true }
// );

// const HotelModel = mongoose.model("Hotel", hotelSchema);
// export default HotelModel;
//////////hala
import mongoose from "mongoose";

// ─── Room Schema ─────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["single", "double", "suite", "family"],
      required: true,
    },

    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

// ─── Main Hotel Schema ───────────────────────────────────────
const hotelSchema = new mongoose.Schema(
  {
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

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      en: String,
      ar: String,
    },

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

    stars: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    amenities: {
      type: [String],
      default: [],
    },

    rooms: {
      type: [roomSchema],
      default: [],
    },

    averagePricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["EGP", "USD"],
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
        default: [0, 0],
      },
    },

    images: {
      type: [String],
      default: [],
    },

    coverImage: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Auto Slug ───────────────────────────────────────────────
hotelSchema.pre("save", function () {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }
});

// ─── Indexes ─────────────────────────────────────────────────
hotelSchema.index({ location: "2dsphere" });

hotelSchema.index({
  "name.en": "text",
  "name.ar": "text",
  "description.en": "text",
  "description.ar": "text",
});

hotelSchema.index({
  city: 1,
  stars: 1,
  isActive: 1,
});

const HotelModel = mongoose.model("Hotel", hotelSchema);

export default HotelModel;