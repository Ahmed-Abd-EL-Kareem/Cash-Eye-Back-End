import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import xss from "express-xss-sanitizer";
import session from "express-session";

import corsOptions from "./src/config/cors.js";
import { requestLogger } from "./src/config/logger.js";
import passport from "./src/config/passport.js";
import { globalLimiter } from "./src/middleware/rateLimit.middleware.js";
import { stripeWebhookBodyParser } from "./src/middleware/stripeWebhook.middleware.js";
import { globalErrorHandler } from "./src/middleware/error.middleware.js";
import ApiError from "./src/utils/apiError.js";
import apiRoutes from "./src/routes/index.js";
const app = express();

if (process.env.NODE_ENV === "development") {
  console.log("NODE_ENV:", process.env.NODE_ENV);
}

app.use(requestLogger);
app.use(cors(corsOptions));

// Webhook routes use raw body; all other routes use express.json()
app.use(stripeWebhookBodyParser);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(compression());
app.use((req, res, next) => {
  if (req.originalUrl?.includes("/webhook")) {
    return next();
  }

  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
        continue;
      }

      if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.params);
  sanitize(req.query);
  next();
});

app.use(xss.xss());
app.use(hpp());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", globalLimiter);
app.use("/api/v1", apiRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use(/.*/, (req, res, next) => {
  next(new ApiError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;
