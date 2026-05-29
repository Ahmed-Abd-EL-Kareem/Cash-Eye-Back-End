import HotelModel from "./hotel.model.js";

export const findAll = async ({
  filter = {},
  skip = 0,
  limit = 10,
  sort = { createdAt: -1 },
}) => {
  return HotelModel.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countAll = async (filter = {}) => {
  return HotelModel.countDocuments(filter);
};

export const findById = async (id) => {
  return HotelModel.findById(id).lean();
};

export const findBySlug = async (slug) => {
  return HotelModel.findOne({ slug }).lean();
};

export const findNear = async ({
  coordinates,
  maxMeters = 100000,
  limit = 10,
}) => {
  return HotelModel.find({
    isActive: true,

    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates,
        },

        $maxDistance: maxMeters,
      },
    },
  })
    .limit(limit)
    .lean();
};

export const create = async (data) => {
  return HotelModel.create(data);
};

export const updateById = async (id, data) => {
  return HotelModel.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).lean();
};

export const softDeleteById = async (id) => {
  return HotelModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  ).lean();
};