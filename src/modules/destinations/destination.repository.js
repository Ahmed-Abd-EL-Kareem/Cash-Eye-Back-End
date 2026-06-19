// Repository: all DB access in one place.
// Services call this — they never import the model directly.

import DestinationModel from "./destination.model.js";

export const findAll = async ({
  filter = {},
  skip = 0,
  limit = 10,
  sort = { createdAt: -1 },
}) => {
  return DestinationModel.find(filter).sort(sort).skip(skip).limit(limit).lean();
};

export const countAll = async (filter = {}) => {
  return DestinationModel.countDocuments(filter);
};

export const findById = async (id) => {
  return DestinationModel.findById(id).lean();
};

export const findBySlug = async (slug) => {
  return DestinationModel.findOne({ slug }).lean();
};

// ─── Geo: find destinations near a point ─────────────────────────────────────
// $near requires the 2dsphere index on location.
// Returns documents sorted by distance (closest first) automatically.
// coordinates = [longitude, latitude]  ← GeoJSON order
export const findNear = async ({ coordinates, maxMeters = 100000, limit = 10 }) => {
  return DestinationModel.find({
    isActive: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: maxMeters,
      },
    },
  })
    .limit(limit)
    .lean();
};

export const create = async (data) => {
  return DestinationModel.create(data);
};

export const updateById = async (id, data) => {
  return DestinationModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();
};

// Soft delete — isActive:false, document stays in DB and Pinecone
export const softDeleteById = async (id,dest) => {
  return DestinationModel.findByIdAndUpdate(
    id,
    { isActive: !dest.isActive },
    { new: true }
  ).lean();
};