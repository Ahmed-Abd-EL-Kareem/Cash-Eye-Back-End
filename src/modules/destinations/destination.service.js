import * as repo from "./destination.repository.js";
import ApiError from "../../utils/apiError.js";

<<<<<<< HEAD
const buildFilter = ({
  city,
=======
// ─── Build MongoDB filter from query params ───────────────────────────────────
// Supported params:
//   ?city=Cairo          — case-insensitive city filter
//   ?category=historical — exact category match
//   ?region=Upper Egypt  — exact region match
//   ?month=October       — destinations best visited that month
//   ?minBudget=500       — minimum average budget per day (EGP)
//   ?maxBudget=2000      — maximum average budget per day (EGP)
//   ?search=pyramid      — full-text search (uses MongoDB text index)
//   ?sort=-createdAt     — sort field (see sortMap below)
//   ?page=1&limit=10     — pagination
const buildFilter = ({
  city,
  category,
  region,
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
  month,
  minBudget,
  maxBudget,
  search,
} = {}) => {
<<<<<<< HEAD
  const filter = {};


  if (city) {
    filter.city = new RegExp(`^${city}$`, "i");
  }


  if (month) {
    filter.bestMonths = { $in: [month] };
  }

=======
  const filter = { isActive: true };

  if (city) filter.city = { $regex: new RegExp(city, "i") };
  if (category) filter.category = category;
  if (region) filter.region = region;
  if (month) filter.bestMonths = { $in: [month] };
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e

  if (minBudget !== undefined || maxBudget !== undefined) {
    filter.averageBudgetPerDay = {};

    if (minBudget !== undefined) {
      filter.averageBudgetPerDay.$gte = Number(minBudget);
    }

    if (maxBudget !== undefined) {
      filter.averageBudgetPerDay.$lte = Number(maxBudget);
    }
  }

<<<<<<< HEAD

  if (search) {
    filter.$or = [
      {
        "name.en": {
          $regex: new RegExp(search, "i"),
        },
      },

      {
        "name.ar": {
          $regex: new RegExp(search, "i"),
        },
      },

      {
        city: {
          $regex: new RegExp(search, "i"),
        },
      },
    ];
  }
=======
  // Full-text search uses the compound text index on name.en + name.ar + description
  if (search) filter.$text = { $search: search };
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e

  return filter;
};

<<<<<<< HEAD
=======
// ─── Get all (paginated + filtered) ──────────────────────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
export const getAllDestinations = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);

  const limit = Math.min(
    50,
    Math.max(1, parseInt(query.limit) || 10)
  );

  const skip = (page - 1) * limit;

<<<<<<< HEAD
  const filter = buildFilter(query);

  const [destinations, total] = await Promise.all([
    destinationRepository.findAll({
      filter,
      skip,
      limit,
    }),

    destinationRepository.countAll(filter),
=======
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
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
  ]);

  return {
    destinations,
<<<<<<< HEAD

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getDestinationById = async (id) => {
  const destination =
    await destinationRepository.findById(id);

  if (!destination) {
    throw new ApiError("Destination not found", 404);
  }

  return destination;
};

export const getDestinationBySlug = async (slug) => {
  const destination =
    await destinationRepository.findBySlug(slug);

  if (!destination) {
    throw new ApiError("Destination not found", 404);
  }

  return destination;
};

=======
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Get single by ID ─────────────────────────────────────────────────────────
export const getDestinationById = async (id) => {
  const dest = await repo.findById(id);
  if (!dest || !dest.isActive) throw new ApiError("Destination not found", 404);
  return dest;
};

// ─── Get single by slug ───────────────────────────────────────────────────────
export const getDestinationBySlug = async (slug) => {
  const dest = await repo.findBySlug(slug);
  if (!dest || !dest.isActive) throw new ApiError("Destination not found", 404);
  return dest;
};

// ─── Geo search: destinations near a point ────────────────────────────────────
// Uses the 2dsphere index + $near for spherical distance (accurate on Earth).
// Example: GET /destinations/nearby?lng=31.13&lat=29.97&maxKm=50
//
// WHY $near instead of $geoWithin?
//   $near returns results sorted by distance (closest first).
//   $geoWithin returns results in arbitrary order.
//   For a "show me what's nearby" UX, sorted results are always better.
export const getDestinationsNearby = async ({
  lng,
  lat,
  maxKm = 100,
  limit = 10,
}) => {
  if (!lng || !lat) throw new ApiError("lng and lat query params are required", 400);

  const maxMeters = Number(maxKm) * 1000;

  return repo.findNear({
    coordinates: [Number(lng), Number(lat)],  // GeoJSON order: [lng, lat]
    maxMeters,
    limit: Math.min(50, Number(limit)),
  });
};

// ─── Create ───────────────────────────────────────────────────────────────────
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
export const createDestination = async (data) => {
  // Auto-generate slug from English name if not provided
  if (!data.slug && data.name?.en) {
    data.slug = data.name.en
      .toLowerCase()
      .trim()
<<<<<<< HEAD
      .replace(/\s+/g, "-");
  }


  const existing =
    await destinationRepository.findBySlug(data.slug);

  if (existing) {
    throw new ApiError(
      "A destination with this slug already exists",
      409
    );
  }

  return destinationRepository.create(data);
};

export const updateDestination = async (id, data) => {
  const destination =
    await destinationRepository.findById(id);

  if (!destination) {
    throw new ApiError("Destination not found", 404);
  }

 
  if (data.slug && data.slug !== destination.slug) {
    const existing =
      await destinationRepository.findBySlug(data.slug);

    if (existing) {
      throw new ApiError(
        "A destination with this slug already exists",
        409
      );
    }
  }

  return destinationRepository.updateById(id, data);
};

export const deleteDestination = async (id) => {
  const destination =
    await destinationRepository.findById(id);

  if (!destination) {
    throw new ApiError("Destination not found", 404);
  }

  await destinationRepository.deleteById(id);
};


export const getNearbyDestinations = async ({
  lng,
  lat,
  radius = 50000,
  limit = 10,
}) => {
  if (!lng || !lat) {
    throw new ApiError(
      "lng and lat are required",
      400
    );
  }

  return destinationRepository.findNearby({
    lng: Number(lng),
    lat: Number(lat),
    radius: Number(radius),
    limit: Number(limit),
=======
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  const existing = await repo.findBySlug(data.slug);
  if (existing) throw new ApiError("A destination with this slug already exists", 409);

  return repo.create(data);
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
// isActive: false hides the destination from public API while preserving the
// Pinecone vector — AI trip plans that reference it still work.
export const deleteDestination = async (id) => {
  const dest = await repo.findById(id);
  if (!dest) throw new ApiError("Destination not found", 404);
  await repo.softDeleteById(id);
};

// ─── Internal: get destinations by city ──────────────────────────────────────
// Used by the AI trip planner to inject destination context into prompts.
export const getDestinationsByCity = async (city, limit = 5) => {
  return repo.findAll({
    filter: { city: { $regex: new RegExp(city, "i") }, isActive: true },
    limit,
    sort: { averageBudgetPerDay: 1 },
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
  });
};