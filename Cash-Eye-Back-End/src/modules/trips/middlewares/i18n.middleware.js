import { detectLang, t, getDir } from "../i18n/index.js";

// ─────────────────────────────────────────────
// i18n Middleware
// ─────────────────────────────────────────────

/**
 * Detects the request language and attaches helpers to req:
 *
 *   req.lang         — "ar" | "en"
 *   req.dir          — "rtl" | "ltr"
 *   req.t(key, vars) — shorthand translate function
 */
export default function i18nMiddleware(req, res, next) {
  const lang = detectLang(req);

  req.lang = lang;
  req.dir = getDir(lang);
  req.t = (key, vars = {}) => t(key, lang, vars);

  // Echo language in response headers so the client knows
  res.setHeader("Content-Language", lang);
  res.setHeader("X-Direction", req.dir);

  next();
}
