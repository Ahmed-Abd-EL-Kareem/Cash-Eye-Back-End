import "./src/config/env.js";
import app from "./app.js";
import { connectDB } from "./src/config/db.js";
import { seedPlans } from "./src/modules/subscriptions/plan/plan.service.js";
import "./src/jobs/aiLog.retention.job.js";

// Custom DNS servers for local development if needed
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch {}
}

const port = process.env.PORT || 3000;

let dbPromise = null;
const init = async () => {
  if (!dbPromise) {
    dbPromise = Promise.all([connectDB(), seedPlans()]);
  }
  return dbPromise;
};

if (!process.env.VERCEL) {
  init()
    .then(() => {
      app.listen(port, () => {
        console.log(`Rahal API running at http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
} else {
  init().catch((err) => {
    console.error("Vercel initialization error:", err);
  });
}

export default app;