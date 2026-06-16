import morgan from "morgan";

export const devLogger = morgan("dev");

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    return devLogger(req, res, next);
  }
  return next();
};

// Simple logger for consistent logging across the application
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};

export default logger;
