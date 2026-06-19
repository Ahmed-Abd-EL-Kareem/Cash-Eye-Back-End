export const PREDEFINED_CATEGORIES = ["Family", "Luxury", "Adventure", "Weekend"];

const CATEGORY_ALIASES = {
  famaily: "Family",
  family: "Family",
  luxury: "Luxury",
  adventure: "Adventure",
  weekend: "Weekend",
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeInterest = (value) => {
  if (value == null) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const alias = CATEGORY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const predefined = PREDEFINED_CATEGORIES.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase()
  );
  if (predefined) return predefined;

  return trimmed;
};

export const normalizeInterests = (interests) => {
  if (!Array.isArray(interests)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of interests) {
    const normalized = normalizeInterest(raw);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
};

export const buildCategoryFilter = (category) => {
  const normalized = normalizeInterest(category);
  if (!normalized) return null;

  const patterns = new Set([normalized]);
  for (const [alias, target] of Object.entries(CATEGORY_ALIASES)) {
    if (target === normalized) {
      patterns.add(alias);
    }
  }

  const regex = [...patterns].map((pattern) => `^${escapeRegex(pattern)}$`).join("|");
  return { interests: { $regex: new RegExp(regex, "i") } };
};
