import dotenv from 'dotenv'
dotenv.config({ path: './.development.env' })
import mongoose from 'mongoose'
import app from './app.js'
import dns from 'node:dns'

dns.setServers(["8.8.8.8", "8.8.4.4"])

mongoose.connect(process.env.MONGO_DATABASE_URL).then(() =>
  console.log("DataBase Connected Successfully🎉🎉🎉")
).catch((err) => console.log(console.error('Error connecting to MongoDB:🤦‍♂️🤦‍♂️🤦‍♂️', err))
)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`App Is Running on http://localhost:${port}!!!😁😁😁`);
})