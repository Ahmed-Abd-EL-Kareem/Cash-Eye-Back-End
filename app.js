import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";

import xss from "express-xss-sanitizer";
import mongoSanitize from "express-mongo-sanitize";

import { globalLimiter } from "./src/middleware/rate-limit.middleware.js";
import { globalErrorHandler } from "./src/middleware/global-error-handling.js";

import IndexRoutes from "./src/routes/index.js";
import AppError from "./src/utils/appError.js";

import session from "express-session";
import passport from "./src/config/passport.js";

const app = express();

console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));

app.use(cookieParser());

app.use(helmet());

app.use(compression());

app.use((req, res, next) => {
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

  next();
});

app.use(xss.xss());

app.use(hpp());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

app.use('/api', globalLimiter);

app.use('/api/v1', IndexRoutes);

app.use(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;