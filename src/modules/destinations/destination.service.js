import * as repo from "./destination.repository.js";
import ApiError from "../../utils/apiError.js";
import { indexDestination } from "../../integrations/ai/pinecone.rag.js";
import logger from "../../config/logger.js";

// ─── Build MongoDB filter from query params ───────────────────────────────────
const buildFilter = ({
  city,
  category,
  region,
  month,
  minBudget,
  maxBudget,
  search,
  isActive,
} = {}) => {
  const filter = {};


  if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
    filter.isActive = (isActive === true || isActive === 'true');
  }

  if (city) filter.city = { $regex: new RegExp(city, "i") };

  if (category && category !== 'all') filter.category = category;

  if (region) filter.region = region;
  if (month) filter.bestMonths = { $in: [month] };

  if (minBudget !== undefined || maxBudget !== undefined) {
    filter.averageBudgetPerDay = {};
    if (minBudget !== undefined) filter.averageBudgetPerDay.$gte = Number(minBudget);
    if (maxBudget !== undefined) filter.averageBudgetPerDay.$lte = Number(maxBudget);
  }

  if (search) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { "name.en": { $regex: new RegExp(search, "i") } },
          { "name.ar": { $regex: new RegExp(search, "i") } }
        ]
      }
    ];
  }
  return filter;
};

// ─── Get all (paginated + filtered) ──────────────────────────────────────────
export const getAllDestinations = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  const sortMap = {
    "-createdAt": { createdAt: -1 },
    "createdAt": { createdAt: 1 },
    "-averageBudgetPerDay": { averageBudgetPerDay: -1 },
    "averageBudgetPerDay": { averageBudgetPerDay: 1 },
    "name": { "name.en": 1 },
    "-name": { "name.en": -1 },
  };
  const sort = sortMap[query.sort] || { createdAt: -1 };

  const filter = buildFilter(query);

  const [destinations, total] = await Promise.all([
    repo.findAll({ filter, skip, limit, sort }),
    repo.countAll(filter),
  ]);

  return {
    destinations,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Get single by ID ─────────────────────────────────────────────────────────
export const getDestinationById = async (id) => {
  const dest = await repo.findById(id);

  if (!dest) throw new ApiError("Destination not found", 404);
  return dest;
};

// ─── Get single by slug ───────────────────────────────────────────────────────
export const getDestinationBySlug = async (slug) => {
  const dest = await repo.findBySlug(slug);

  if (!dest) throw new ApiError("Destination not found", 404);
  return dest;
};

// ─── Geo search: destinations near a point ────────────────────────────────────
export const getDestinationsNearby = async ({
  lng,
  lat,
  maxKm = 100,
  limit = 10,
}) => {
  if (!lng || !lat) throw new ApiError("lng and lat query params are required", 400);

  const maxMeters = Number(maxKm) * 1000;

  return repo.findNear({
    coordinates: [Number(lng), Number(lat)],
    maxMeters,
    limit: Math.min(50, Number(limit)),
  });
};

// ─── Create ───────────────────────────────────────────────────────────────────
export const createDestination = async (data) => {
  if (!data.slug && data.name?.en) {
    data.slug = data.name.en
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  const existing = await repo.findBySlug(data.slug);
  if (existing) throw new ApiError("A destination with this slug already exists", 409);

  const destination = await repo.create(data);

  try {
    await indexDestination(destination);
    logger.info(`[RAG] Indexed destination ${destination._id} in Pinecone`);
  } catch (err) {
    logger.warn(`[RAG] Failed to index destination ${destination._id}: ${err.message}`);
  }

  return destination;
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateDestination = async (id, data) => {
  const dest = await repo.findById(id);
  if (!dest) throw new ApiError("Destination not found", 404);

  if (data.slug && data.slug !== dest.slug) {
    const conflict = await repo.findBySlug(data.slug);
    if (conflict) throw new ApiError("A destination with this slug already exists", 409);
  }

  return repo.updateById(id, data);
};

// ─── Soft delete ──────────────────────────────────────────────────────────────
export const deleteDestination = async (id) => {
  const dest = await repo.findById(id);
  if (!dest) throw new ApiError("Destination not found", 404);
  await repo.softDeleteById(id);
};

// ─── Internal: get destinations by city ──────────────────────────────────────
export const getDestinationsByCity = async (city, limit = 5) => {
  return repo.findAll({
    filter: { city: { $regex: new RegExp(city, "i") }, isActive: true },
    limit,
    sort: { averageBudgetPerDay: 1 },
  });
};