import express from "express";
import dotenv from 'dotenv'
dotenv.config({ path: './.development.env' })
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import xss from 'xss'
import { globalLimiter } from "./src/middleware/rate-limit.middleware.js";
import { globalErrorHandler } from "./src/middleware/global-error-handling.js";
import { sanitize as sanitizeMongo } from 'express-mongo-sanitize'
import userRout from "./src/routes/user.routes.js"
import AppError from "./src/utils/appError.js";
const app = express()


//! Middleware
console.log("NODE_ENV", process.env.NODE_ENV);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(cors(
));
app.use(express.json())
app.use(cookieParser());
app.use(helmet())
app.use(compression())
// Data sanitization against NoSQL query injection (Express 5–compatible: cannot assign req.query)
app.use((req, res, next) => {
  if (req.body) req.body = sanitizeMongo(req.body)
  if (req.params && Object.keys(req.params).length) sanitizeMongo(req.params)
  if (req.headers) sanitizeMongo(req.headers)
  const q = req.query
  if (q && Object.keys(q).length) {
    const copy = { ...q }
    sanitizeMongo(copy)
    setQuery(req, copy)
  }
  next()
})

// Data sanitization against XSS (sanitize strings inside body/query/params)
app.use((req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === "string") return xss(value);
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)])
      );
    }
    return value;
  };

  req.body = sanitizeValue(req.body);
  const sq = sanitizeValue(req.query)
  if (sq && typeof sq === "object" && Object.keys(sq).length) {
    setQuery(req, sq)
  }
  req.params = sanitizeValue(req.params);
  next();
});

// Prevent Parameter Pollution attacks
app.use(hpp());

app.use('/api', globalLimiter);

app.use("/api/v1/users", userRout)

app.use(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler)
export default app