import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import dotenv from "dotenv";

dotenv.config();

console.log("GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);

import mongoose from 'mongoose'
import app from './app.js'

// MONGO_DATABASE_URL
mongoose.connect(process.env.MONGO_DATABASE_URL).then(() =>
  console.log("DataBase Connected Successfully🎉🎉🎉")
).catch((err) => console.log(console.error('Error connecting to MongoDB:🤦‍♂️🤦‍♂️🤦‍♂️', err))
)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`App Is Running on http://localhost:${port}!!!😁😁😁`);
})