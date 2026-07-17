import mongoose from "mongoose";

// ─── Room Schema ─────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ["single", "double", "twin", "triple", "suite", "family"],
      required: true,
    },
    maxAdults: {
      type: Number,
      required: true,
      min: 1,
    },
    maxChildren: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    maxOccupancy: {
      type: Number,
      required: true,
    },
    totalUnits: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true },
);

roomSchema.pre("save", function (next) {
  this.maxOccupancy = this.maxAdults + this.maxChildren;
  next();
});

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
    region: {
      type: String,
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
  },
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
