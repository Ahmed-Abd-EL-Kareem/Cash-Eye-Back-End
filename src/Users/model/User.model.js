import mongoose from "mongoose";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim:true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  googleId: { type: String, unique: true, sparse: true },
  
  passwordChangedAt: Date,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  subscription:{
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
    return next();
  }else{
      this.password = await bcrypt.hash(this.password, 8);
  }
});
const UserModel = mongoose.model("User", userSchema);

export default UserModel;