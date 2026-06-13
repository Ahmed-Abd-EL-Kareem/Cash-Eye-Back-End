import rateLimit from "express-rate-limit";
import { t } from "../i18n/index.js";

// ─────────────────────────────────────────────
// Helper: build a rate limiter with i18n message
// ─────────────────────────────────────────────

function buildLimiter({ windowMs, max, messageKey }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return RateLimit-* headers
    legacyHeaders: false,
    handler(req, res) {
      const lang = req.lang || "en";
      res.status(429).json({
        success: false,
        message: t(messageKey, lang),
      });
    },
  });
}

// ─────────────────────────────────────────────
// Limiters
// ─────────────────────────────────────────────

/**
 * General read-heavy endpoints (GET).
 * 200 requests per 15 minutes per IP.
 */
export const standardLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  messageKey: "too_many_requests",
});

/**
 * Write endpoints (POST, PUT, DELETE, PATCH).
 * 60 requests per 15 minutes per IP.
 */
export const writeLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  messageKey: "write_limit",
});

/**
 * AI trip save — most expensive operation.
 * 10 saves per hour per IP.
 */
export const aiSaveLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  messageKey: "ai_save_limit",
});
