import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_DATABASE_URL;
  if (!uri) {
    throw new Error("MONGO_DATABASE_URL is not defined in environment variables");
  }

  await mongoose.connect(uri);
  console.log("DataBase Connected Successfully");
};

export default connectDB;
