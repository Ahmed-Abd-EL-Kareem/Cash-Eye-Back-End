import mongoose from "mongoose";
import * as bcrypt from "bcrypt";
import validator from "validator";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true.valueOf,

  },
  image: {
    type: String,
    default: "https://i.pinimg.com/736x/d9/7b/bb/d97bbb08017ac2309307f0822e63d082.jpg",
    validate: {
      validator: function (v) {
        if (v === null || v === undefined || v === "") return true;
        return validator.isURL(v, { require_protocol: true });
      },
      message: "Invalid image url",
    },
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return validator.isEmail(v);
      },
      message: "Please provide a valid email"
    }
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    minlength: 8,
    validate: {
      validator: function (v) {
        return validator.isStrongPassword(v, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        });
      },
      message: "Password is not strong enough"
    }
  },
  googleId: { type: String, unique: true, sparse: true },

  passwordChangedAt: Date,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  subscription: {
    type: String,
    enum: ["free", "premium"],
    default: "free",
  }
},
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  } else {
    this.password = await bcrypt.hash(this.password, 8);
  }
});
const UserModel = mongoose.model("User", userSchema);

export default UserModel;