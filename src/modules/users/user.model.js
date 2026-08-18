import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      // validate: {
      //   validator: (v) => /^[a-zA-Z\s]+$/.test(v),
      //   message: "Name must contain only letters and spaces",
      // },
    },
    image: {
      type: String,
      default: "https://i.pinimg.com/736x/d9/7b/bb/d97bbb08017ac2309307f0822e63d082.jpg",
      validate: {
        validator: (v) => {
          if (!v) return true;
          return validator.isURL(v, { require_protocol: true });
        },
        message: "Invalid image url",
      },
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: "Please provide a valid email",
      },
    },
    password: {
      type: String,
      select: false,
      required: function () {
        return this.provider === "local";
      },
      minlength: [8, "Password must be at least 8 characters"],
      validate: {
        validator: function (v) {
          if (this.provider !== "local" || !v) return true;
          return validator.isStrongPassword(v, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
          });
        },
        message: "Password is not strong enough",
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    passwordChangedAt: Date,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    preferredLanguage: {
      type: String,
      enum: ["en", "ar"],
      default: "en",
    },
    preferredCurrency: {
      type: String,
      enum: ["USD", "EGP"],
      default: "EGP",
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    savedTrips: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
    otp: String,
    resetOTPExpiration: Date,
    isOTPVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
});

userSchema.statics.createWithSubscription = async function (userData) {
  const user = await this.create(userData);

  const Plan = mongoose.model("Plan");
  const Subscription = mongoose.model("Subscription");

  const freePlan = await Plan.findOne({ name: "free" });
  if (!freePlan) throw new Error("Free plan not found — run the plan seeder first");

  const subscription = await Subscription.create({
    user: user._id,
    plan: freePlan._id,
    planName: "free",
    status: "free",
    startDate: new Date(),
    endDate: null,
    usage: {
      tokensUsedThisMonth: 0,
      requestsToday: 0,
      lastRequestDate: null,
      lastResetDate: new Date(),
    },
    history: [{ fromPlan: null, toPlan: "free", reason: "Initial free subscription" }],
  });

  user.subscription = subscription._id;
  await user.save({ validateBeforeSave: false });

  return user;
};

userSchema.methods.correctPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
