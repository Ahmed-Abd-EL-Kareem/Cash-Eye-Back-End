import mongoose from "mongoose";

const attractionSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    type: { type: String }, 
    entryFee: { type: Number, default: 0 },
  },
  { _id: false }
);
 
const destinationSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
 
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    
    description: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
 
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
  default: "EGP" 
},

    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
 
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
 
destinationSchema.pre("save", function () {
  if (!this.slug && this.name?.en) {
    this.slug = this.name.en.toLowerCase().replace(/\s+/g, "-");
  }

});

const Destination = mongoose.model("Destination", destinationSchema);
 
export default Destination;


// import mongoose from "mongoose";

// const destinationSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, trim: true },
//     slug: { type: String, required: true, unique: true, lowercase: true },
//     description: { type: String, required: true },
//     language: { type: String, enum: ["en", "ar"], default: "en" },
//     attractions: [{ type: String }],
//     bestMonths: [{ type: String }],
//     averageBudgetPerDay: { type: Number, required: true },
//     currency: { type: String, enum: ["USD", "EGP"], default: "EGP" },
//     coordinates: {
//       lat: Number,
//       lng: Number,
//     },
//     images: [{ type: String }],
//   },
//   { timestamps: true }
// );

// const DestinationModel = mongoose.model("Destination", destinationSchema);
// export default DestinationModel;