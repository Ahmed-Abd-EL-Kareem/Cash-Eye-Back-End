import * as destinationRepository from "./destination.repository.js";
import ApiError from "../../utils/apiError.js";
const buildFilter = ({ city, month, minBudget, maxBudget, search } = {}) => {
  const filter = {};
 
  if (city) filter.city = { $regex: new RegExp(city, "i") };
 
  if (month) filter.bestMonths = { $in: [month] };
 
  if (minBudget !== undefined || maxBudget !== undefined) {
    filter.averageBudgetPerDay = {};
    if (minBudget !== undefined) filter.averageBudgetPerDay.$gte = Number(minBudget);
    if (maxBudget !== undefined) filter.averageBudgetPerDay.$lte = Number(maxBudget);
  }
 
  if (search) {
    filter.$or = [
      { "name.en": { $regex: new RegExp(search, "i") } },
      { "name.ar": { $regex: new RegExp(search, "i") } },
      { city: { $regex: new RegExp(search, "i") } },
    ];
  }
 
  return filter;
};
 
export const getAllDestinations = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
 
  const filter = buildFilter(query);
 
  const [destinations, total] = await Promise.all([
    destinationRepository.findAll({ filter, skip, limit }),
    destinationRepository.countAll(filter),
  ]);
 
  return {
    destinations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
 
export const getDestinationById = async (id) => {
  const destination = await destinationRepository.findById(id);
  if (!destination) throw new ApiError("Destination not found", 404);
  return destination;
};
 
export const getDestinationBySlug = async (slug) => {
  const destination = await destinationRepository.findBySlug(slug);
  if (!destination) throw new ApiError("Destination not found", 404);
  return destination;
};
 
export const createDestination = async (data) => {

  if (!data.slug && data.name?.en) {
    data.slug = data.name.en.toLowerCase().replace(/\s+/g, "-");
  }
 
  const existing = await destinationRepository.findBySlug(data.slug);
  if (existing) throw new ApiError("A destination with this slug already exists", 409);
 
  return destinationRepository.create(data);
};
 
export const updateDestination = async (id, data) => {
  const destination = await destinationRepository.findById(id);
  if (!destination) throw new ApiError("Destination not found", 404);

  if (data.slug && data.slug !== destination.slug) {
    const existing = await destinationRepository.findBySlug(data.slug);
    if (existing) throw new ApiError("A destination with this slug already exists", 409);
  }
 
  return destinationRepository.updateById(id, data);
};
 
export const deleteDestination = async (id) => {
  const destination = await destinationRepository.findById(id);
  if (!destination) throw new ApiError("Destination not found", 404);
  await destinationRepository.deleteById(id);
};