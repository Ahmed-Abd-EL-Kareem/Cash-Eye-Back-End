import Destination from "./destination.model.js";
 
export const findAll = async ({ filter = {}, skip = 0, limit = 10, sort = { createdAt: -1 } }) => {
  return Destination.find(filter).sort(sort).skip(skip).limit(limit).lean();
};
 
export const countAll = async (filter = {}) => {
  return Destination.countDocuments(filter);
};
 
export const findById = async (id) => {
  return Destination.findById(id).lean();
};
 
export const findBySlug = async (slug) => {
  return Destination.findOne({ slug }).lean();
};
 
export const create = async (data) => {
  return Destination.create(data);
};
 
export const updateById = async (id, data) => {
  return Destination.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
};
 
export const deleteById = async (id) => {
  return Destination.findByIdAndDelete(id).lean();
};