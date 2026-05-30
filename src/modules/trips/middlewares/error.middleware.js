import jwt from "jsonwebtoken";
import { t } from "../i18n/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "change_me_in_production";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  // Also support cookie-based token
  return req.cookies?.token || null;
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─────────────────────────────────────────────
// Middleware: authenticate (required)
// ─────────────────────────────────────────────

/**
 * Blocks unauthenticated requests.
 * On success, populates req.user = { id, email, role }
 */
export function authenticate(req, res, next) {
  const lang = req.lang || "en";
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: t("unauthorized", lang),
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      role: payload.role || "user",
    };
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? t("token_expired", lang) : t("invalid_token", lang),
    });
  }
}

// ─────────────────────────────────────────────
// Middleware: optionalAuth
// ─────────────────────────────────────────────

/**
 * Populates req.user if a valid token is present, but never blocks.
 * Useful for public endpoints that behave differently for logged-in users.
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub || payload.id,
      email: payload.email,
      role: payload.role || "user",
    };
  } catch {
    // Invalid / expired token — silently ignore for optional auth
  }

  next();
}

// ─────────────────────────────────────────────
// Middleware: requireRole (authorization)
// ─────────────────────────────────────────────

/**
 * Usage: router.delete("/admin/trips", authenticate, requireRole("admin"), handler)
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const lang = req.lang || "en";
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: t("forbidden", lang),
      });
    }
    next();
  };
}
