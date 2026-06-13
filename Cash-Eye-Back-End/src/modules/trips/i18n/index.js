import ar from "./ar.js";
import en from "./en.js";

const locales = { ar, en };
const SUPPORTED_LANGS = ["ar", "en"];
const DEFAULT_LANG = "en";

/**
 * Detect the language from an Express request.
 * Priority: query param ?lang= → X-Language header → Accept-Language header → default
 */
export function detectLang(req) {
  if (req?.query?.lang && SUPPORTED_LANGS.includes(req.query.lang)) {
    return req.query.lang;
  }

  const xLang = req?.headers?.["x-language"];
  if (xLang && SUPPORTED_LANGS.includes(xLang)) {
    return xLang;
  }

  const acceptLang = req?.headers?.["accept-language"] || "";
  for (const entry of acceptLang.split(",")) {
    const code = entry.split(";")[0].trim().split("-")[0].toLowerCase();
    if (SUPPORTED_LANGS.includes(code)) return code;
  }

  return DEFAULT_LANG;
}

/**
 * Translate a key with optional interpolation.
 *
 * @param {string} key   - Translation key e.g. "trip_not_found"
 * @param {string} lang  - "ar" | "en"
 * @param {object} vars  - Interpolation vars e.g. { field: "title", limit: 3 }
 *
 * @example
 *   t("trip_not_found", "ar")
 *   t("duplicate_value", "en", { field: "email" })
 *   t("itinerary_days_mismatch", "ar", { actual: 5, expected: 3 })
 */
export function t(key, lang = DEFAULT_LANG, vars = {}) {
  const locale = locales[lang] || locales[DEFAULT_LANG];
  let msg = locale[key] || locales[DEFAULT_LANG][key] || key;

  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`{{${k}}}`, "g"), v);
  }

  return msg;
}

/**
 * Translate a Joi validation error detail into the correct language.
 */
export function translateJoiError(detail, lang) {
  const locale = locales[lang] || locales[DEFAULT_LANG];

  const msgKey = detail.type; // e.g. "string.min", "any.required"
  const template = locale[msgKey] || locales[DEFAULT_LANG][msgKey];

  if (!template) return detail.message;

  const rawField = detail.path.join(".");
  const fieldLabel =
    locale.fields?.[rawField] ||
    locales[DEFAULT_LANG].fields?.[rawField] ||
    rawField;

  return template
    .replace("{{field}}", fieldLabel)
    .replace("{{limit}}", detail.context?.limit ?? "");
}

/**
 * Get text direction for a language.
 */
export function getDir(lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

export { SUPPORTED_LANGS };
