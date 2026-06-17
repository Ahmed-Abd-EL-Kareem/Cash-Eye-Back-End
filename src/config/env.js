import dotenv from "dotenv";
import { existsSync } from "fs";

// Local dev: load .development.env
// Production (Railway): uses platform-injected env vars — do not rely on local files
if (process.env.NODE_ENV !== "production" && existsSync("./.env")) {
  dotenv.config({ path: "./.env" });
}
