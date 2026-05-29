// import dns from node :dns;
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import "./src/config/env.js";
import app from "./app.js";
import { connectDB } from "./src/config/db.js";
import { seedPlans } from "./src/modules/plans/plan.service.js";


const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await seedPlans();


    app.listen(port, () => {
      console.log(`Rahal API running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
