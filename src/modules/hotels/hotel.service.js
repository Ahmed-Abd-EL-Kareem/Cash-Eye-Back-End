import * as repo from "./hotel.repository.js";
import ApiError from "../../utils/apiError.js";
import { indexHotel } from "../../integrations/ai/pinecone.rag.js";
import logger from "../../config/logger.js";

const buildFilter = ({
  city,
  stars,
  minPrice,
  maxPrice,
  search,
} = {}) => {
  const filter = { isActive: true };

  if (city)
    filter.city = { $regex: new RegExp(city, "i") };

  if (stars)
    filter.stars = Number(stars);

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.averagePricePerNight = {};

    if (minPrice !== undefined)
      filter.averagePricePerNight.$gte = Number(minPrice);

    if (maxPrice !== undefined)
      filter.averagePricePerNight.$lte = Number(maxPrice);
  }

  if (search)
    filter.$text = { $search: search };

  return filter;
};

// ─────────────────────────────────────────────────────────────

export const getAllHotels = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);

  const limit = Math.min(
    50,
    Math.max(1, parseInt(query.limit) || 10)
  );

  const skip = (page - 1) * limit;

  const sortMap = {
    "-createdAt": { createdAt: -1 },
    "createdAt": { createdAt: 1 },

    "-averagePricePerNight": {
      averagePricePerNight: -1,
    },

    "averagePricePerNight": {
      averagePricePerNight: 1,
    },

    "-stars": { stars: -1 },
    "stars": { stars: 1 },
  };

  const sort = sortMap[query.sort] || {
    createdAt: -1,
  };

  const filter = buildFilter(query);

  const [hotels, total] = await Promise.all([
    repo.findAll({
      filter,
      skip,
      limit,
      sort,
    }),

    repo.countAll(filter),
  ]);

  return {
    hotels,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────

export const getHotelById = async (id) => {
  const hotel = await repo.findById(id);

  if (!hotel || !hotel.isActive)
    throw new ApiError("Hotel not found", 404);

  return hotel;
};

export const getHotelBySlug = async (slug) => {
  const hotel = await repo.findBySlug(slug);

  if (!hotel || !hotel.isActive)
    throw new ApiError("Hotel not found", 404);

  return hotel;
};

export const getHotelsNearby = async ({
  lng,
  lat,
  maxKm = 100,
  limit = 10,
}) => {
  if (!lng || !lat)
    throw new ApiError(
      "lng and lat query params are required",
      400
    );

  const maxMeters = Number(maxKm) * 1000;

  return repo.findNear({
    coordinates: [Number(lng), Number(lat)],
    maxMeters,
    limit,
  });
};

export const createHotel = async (data) => {
  if (!data.slug && data.name?.en) {
    data.slug = data.name.en
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  const existing = await repo.findBySlug(data.slug);

  if (existing)
    throw new ApiError(
      "A hotel with this slug already exists",
      409
    );

  const hotel = await repo.create(data);

  try {
    await indexHotel(hotel);
    logger.info(`[RAG] Indexed hotel ${hotel._id} in Pinecone`);
  } catch (err) {
    logger.warn(`[RAG] Failed to index hotel ${hotel._id}: ${err.message}`);
  }

  return hotel;
};

export const updateHotel = async (id, data) => {
  const hotel = await repo.findById(id);

  if (!hotel)
    throw new ApiError("Hotel not found", 404);

  return repo.updateById(id, data);
};

export const deleteHotel = async (id) => {
  const hotel = await repo.findById(id);

  if (!hotel)
    throw new ApiError("Hotel not found", 404);

  await repo.softDeleteById(id);
};