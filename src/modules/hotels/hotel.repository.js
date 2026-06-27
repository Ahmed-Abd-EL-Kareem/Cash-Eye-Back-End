// import HotelModel from "./hotel.model.js";

// export const findAll = async ({
//   filter = {},
//   skip = 0,
//   limit = 10,
//   sort = { createdAt: -1 },
// }) => {
//   return HotelModel.find(filter)
//     .sort(sort)
//     .skip(skip)
//     .limit(limit)
//     .lean();
// };

// export const countAll = async (filter = {}) => {
//   return HotelModel.countDocuments(filter);
// };

// export const findById = async (id) => {
//   return HotelModel.findById(id).lean();
// };

// export const findBySlug = async (slug) => {
//   return HotelModel.findOne({ slug }).lean();
// };

// export const findNear = async ({
//   coordinates,
//   maxMeters = 100000,
//   limit = 10,
// }) => {
//   return HotelModel.find({
//     isActive: true,

//     location: {
//       $near: {
//         $geometry: {
//           type: "Point",
//           coordinates,
//         },

//         $maxDistance: maxMeters,
//       },
//     },
//   })
//     .limit(limit)
//     .lean();
// };

// export const create = async (data) => {
//   return HotelModel.create(data);
// };

// export const updateById = async (id, data) => {
//   return HotelModel.findByIdAndUpdate(id, data, {
//     new: true,
//     runValidators: true,
//   }).lean();
// };

// export const softDeleteById = async (id) => {
//   return HotelModel.findByIdAndUpdate(
//     id,
//     { isActive: false },
//     { new: true }
//   ).lean();
// };
// export const getDistinct = async (field, filter = {}) => {
//   return HotelModel.distinct(field, filter);
// };
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

// Bulk lookup by an array of ids — used by the AI hotel-search /
// recommendations flows to turn the AI's picked ids back into full
// hotel documents for the frontend's card UI. Does NOT preserve the
// order of `ids` (Mongo's $in doesn't guarantee it) — callers that
// need ranked order should re-sort using the returned `_id`s.
export const findByIds = async (ids = []) => {
  if (!ids.length) return [];
  return HotelModel.find({
    _id: { $in: ids },
    isActive: true,
  }).lean();
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
export const getDistinct = async (field, filter = {}) => {
  return HotelModel.distinct(field, filter);
};