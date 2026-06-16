import TripModel from "./trip.model.js";
import UserModel from "../users/user.model.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import { generateTripPlan } from "../../integrations/ai/tripPlanner.ai.js";

// ─── Generate + save AI trip ──────────────────────────────────────────────────
export const generateAndSaveTrip = async (userId, params) => {
  const { destination, duration, budget, travelers, interests, language } = params;

  const aiResult = await generateTripPlan({
    destination,
    duration,
    budget: budget || "mid-range",
    travelers: travelers || 1,
    interests: interests || [],
    language: language || "en",
  });

  const trip = await TripModel.create({
    user: userId,
    title: aiResult.title,
    destination,
    duration,
    budget: budget || "mid-range",
    travelers: travelers || 1,
    interests: interests || [],
    language: language || "en",
    days: aiResult.days,
    summary: aiResult.summary,
    estimatedTotalCost: aiResult.estimatedTotalCost || 0,
    currency: aiResult.currency || "EGP",
    status: "draft",
    isAIGenerated: true,
  });

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { savedTrips: trip._id },
  });

  return { trip, tokensUsed: aiResult.tokensUsed };
};

// ─── Get my trips ─────────────────────────────────────────────────────────────
export const getMyTrips = async (userId, query) => {
  const features = new APIFeatures(
    TripModel,
    TripModel.find({ user: userId }),
    query
  ).filter().search(["title", "destination"]).sort().paginate();

  const [trips, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    trips,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};

// ─── Get single (owner only) ──────────────────────────────────────────────────
export const getTripById = async (tripId, userId) => {
  const trip = await TripModel.findOne({ _id: tripId, user: userId });
  if (!trip) throw new ApiError("Trip not found", 404);
  return trip;
};

// ─── Update trip ──────────────────────────────────────────────────────────────
export const updateTrip = async (tripId, userId, updates) => {
  const ALLOWED = ["title", "status", "days", "summary", "interests"];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  const trip = await TripModel.findOneAndUpdate(
    { _id: tripId, user: userId },
    filtered,
    { new: true, runValidators: true }
  );
  if (!trip) throw new ApiError("Trip not found", 404);
  return trip;
};

// ─── Delete trip ──────────────────────────────────────────────────────────────
export const deleteTrip = async (tripId, userId) => {
  const trip = await TripModel.findOneAndDelete({ _id: tripId, user: userId });
  if (!trip) throw new ApiError("Trip not found", 404);
  await UserModel.findByIdAndUpdate(userId, { $pull: { savedTrips: tripId } });
};

// ─── Admin: all trips ─────────────────────────────────────────────────────────
export const adminGetAllTrips = async (query) => {
  const features = new APIFeatures(
    TripModel,
    TripModel.find().populate("user", "name email"),
    query
  ).filter().search(["title", "destination"]).sort().paginate();

  const [trips, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    trips,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};