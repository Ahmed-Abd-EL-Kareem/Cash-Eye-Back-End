// import TripModel from "./trip.model.js";
// import UserModel from "../users/user.model.js";
// import ApiError from "../../utils/apiError.js";
// import APIFeatures from "../../utils/apiFeature.js";
// import { generateTripPlan } from "../../integrations/ai/tripPlanner.ai.js";

// // ─── Generate + save AI trip ──────────────────────────────────────────────────
// export const generateAndSaveTrip = async (userId, params) => {
//   const { destination, duration, budget, travelers, interests, language } = params;

//   const aiResult = await generateTripPlan({
//     destination,
//     duration,
//     budget: budget || "mid-range",
//     travelers: travelers || 1,
//     interests: interests || [],
//     language: language || "en",
//   });

//   const trip = await TripModel.create({
//     user: userId,
//     title: aiResult.title,
//     destination,
//     duration,
//     budget: budget || "mid-range",
//     travelers: travelers || 1,
//     interests: interests || [],
//     language: language || "en",
//     days: aiResult.days,
//     summary: aiResult.summary,
//     estimatedTotalCost: aiResult.estimatedTotalCost || 0,
//     currency: aiResult.currency || "EGP",
//     status: "draft",
//     isAIGenerated: true,
//   });

//   await UserModel.findByIdAndUpdate(userId, {
//     $addToSet: { savedTrips: trip._id },
//   });

//   return { trip, tokensUsed: aiResult.tokensUsed };
// };

// // ─── Get my trips ─────────────────────────────────────────────────────────────
// export const getMyTrips = async (userId, query) => {
//   const features = new APIFeatures(
//     TripModel,
//     TripModel.find({ user: userId }),
//     query
//   ).filter().search(["title", "destination"]).sort().paginate();

//   const [trips, total] = await Promise.all([
//     features.query,
//     features.countDocuments(),
//   ]);

//   return {
//     trips,
//     pagination: {
//       total,
//       page: features.page,
//       limit: features.limit,
//       totalPages: Math.ceil(total / features.limit),
//     },
//   };
// };

// // ─── Get single (owner only) ──────────────────────────────────────────────────
// export const getTripById = async (tripId, userId) => {
//   const trip = await TripModel.findOne({ _id: tripId, user: userId });
//   if (!trip) throw new ApiError("Trip not found", 404);
//   return trip;
// };

// // ─── Update trip ──────────────────────────────────────────────────────────────
// export const updateTrip = async (tripId, userId, updates) => {
//   const ALLOWED = ["title", "status", "days", "summary", "interests"];
//   const filtered = Object.fromEntries(
//     Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
//   );

//   const trip = await TripModel.findOneAndUpdate(
//     { _id: tripId, user: userId },
//     filtered,
//     { new: true, runValidators: true }
//   );
//   if (!trip) throw new ApiError("Trip not found", 404);
//   return trip;
// };

// // ─── Delete trip ──────────────────────────────────────────────────────────────
// export const deleteTrip = async (tripId, userId) => {
//   const trip = await TripModel.findOneAndDelete({ _id: tripId, user: userId });
//   if (!trip) throw new ApiError("Trip not found", 404);
//   await UserModel.findByIdAndUpdate(userId, { $pull: { savedTrips: tripId } });
// };

// // ─── Admin: all trips ─────────────────────────────────────────────────────────
// export const adminGetAllTrips = async (query) => {
//   const features = new APIFeatures(
//     TripModel,
//     TripModel.find().populate("user", "name email"),
//     query
//   ).filter().search(["title", "destination"]).sort().paginate();

//   const [trips, total] = await Promise.all([
//     features.query,
//     features.countDocuments(),
//   ]);

//   return {
//     trips,
//     pagination: {
//       total,
//       page: features.page,
//       limit: features.limit,
//       totalPages: Math.ceil(total / features.limit),
//     },
//   };
// };
// trip.service.js (excerpt — only generateAndSaveTrip changes)
// Replace the old import of generateTripPlan from tripPlanner.ai.js with
// the one from multi.agent.js. Everything else is identical.
// ? ///////////////////////////////////////////////////////////////
import TripModel from "./trip.model.js";
import UserModel from "../users/user.model.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import { generateTripPlan } from "../../integrations/ai/tripPlanner.ai.js";
import { createUsage } from "../aiUsage/aiUsage.service.js";

// ─── Generate + save AI trip ──────────────────────────────────────────────────
export const generateAndSaveTrip = async (userId, params) => {
  const {
    destination,
    duration,
    budget,
    travelers,
    interests,
    language,
    imageUrl,
  } = params;

  const start = Date.now();

  try {
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
      imageUrl,
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

    const responseTime = Date.now() - start;

    // Log success AI Usage
    await createUsage({
      user: userId,
      trip: trip._id,
      model: aiResult.rawResponse?.model || "openai/gpt-oss-120b",
      promptTokens: aiResult.rawResponse?.usage?.prompt_tokens || 0,
      completionTokens: aiResult.rawResponse?.usage?.completion_tokens || 0,
      totalTokens: aiResult.rawResponse?.usage?.total_tokens || 0,
      responseTime,
      success: true,
    });

    return { trip, tokensUsed: aiResult.tokensUsed };
  } catch (error) {
    const responseTime = Date.now() - start;

    // Log failure AI Usage
    await createUsage({
      user: userId,
      trip: null,
      model: "openai/gpt-oss-120b", // default fallback model
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      responseTime,
      success: false,
      errorMessage: error.message || "Failed to generate AI trip plan",
    });

    throw error;
  }
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
////
// ─── Create manual trip ───────────────────────────────────────────────────────
export const createManualTrip = async (userId, params) => {
  const {
    title,
    destination,
    duration,
    budget,
    travelers,
    interests,
    language,
    imageUrl,
    summary,
    days,
    estimatedTotalCost,
    currency,
    status,
  } = params;

  const trip = await TripModel.create({
    user: userId,
    title,
    destination,
    imageUrl: imageUrl || null,
    duration,
    budget: budget || "mid-range",
    travelers: travelers || 1,
    interests: interests || [],
    language: language || "en",
    days: days || [],
    summary: summary || null,
    estimatedTotalCost: estimatedTotalCost || 0,
    currency: currency || "EGP",
    status: status || "draft",
    isAIGenerated: false,
  });

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { savedTrips: trip._id },
  });

  return trip;
};
///////////////

// ─── Get single (owner only) ──────────────────────────────────────────────────
export const getTripById = async (tripId, userId) => {
  const trip = await TripModel.findOne({ _id: tripId, user: userId });
  if (!trip) throw new ApiError("Trip not found", 404);
  return trip;
};

// ─── Update trip ──────────────────────────────────────────────────────────────
export const updateTrip = async (tripId, userId, updates,role) => {
  const ALLOWED = [
    "title",
    "destination",
    "duration",
    "budget",
    "estimatedTotalCost",
    "travelers",
    "language",
    "status",
    "days",
    "summary",
    "interests",
    "imageUrl",
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );
  let trip = null;
  if(role === "admin"){
    trip = await TripModel.findOneAndUpdate(
    { _id: tripId },
    filtered,
     { returnDocument: "after", runValidators: true }
   )
  }else{
     trip = await TripModel.findOneAndUpdate(
      { _id: tripId, user: userId },
      filtered,
      { returnDocument: "after", runValidators: true }
    );
  }
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
const preprocessAdminTripsQuery = (query) => {
  const apiQuery = { ...query };
  const extraFilters = {};

  const category = apiQuery.category || apiQuery.interest;
  if (category && category !== "All") {
    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) {
      Object.assign(extraFilters, categoryFilter);
    }
    delete apiQuery.category;
    delete apiQuery.interest;
  }

  if (apiQuery.budgetRange && apiQuery.budgetRange !== "All") {
    const range = apiQuery.budgetRange;
    delete apiQuery.budgetRange;
    if (range === "under2000") {
      apiQuery["estimatedTotalCost[lt]"] = 2000;
    } else if (range === "2000to5000") {
      apiQuery["estimatedTotalCost[gte]"] = 2000;
      apiQuery["estimatedTotalCost[lte]"] = 5000;
    } else if (range === "over5000") {
      apiQuery["estimatedTotalCost[gt]"] = 5000;
    }
  }

  if (apiQuery.isAIGenerated === "true") apiQuery.isAIGenerated = true;
  else if (apiQuery.isAIGenerated === "false") apiQuery.isAIGenerated = false;

  return { apiQuery, extraFilters };
};

export const adminGetAllTrips = async (query) => {
  const { apiQuery, extraFilters } = preprocessAdminTripsQuery(query);

  const features = new APIFeatures(
    TripModel,
    TripModel.find().populate("user", "name email"),
    query
  ).filter().search(["title", "destination"]).sort().paginate();

  const [trips, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  const limit = features.limit || 10;

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
export const adminGetTripById = async (tripId) => {
  const trip = await TripModel.findById(tripId)
    .populate("user", "name email");

  if (!trip) throw new ApiError("Trip not found", 404);

  return trip;
};

export const adminUpdateTrip = async (tripId, updates) => {
  const ALLOWED = [
    "title",
    "destination",
    "duration",
    "budget",
    "estimatedTotalCost",
    "travelers",
    "language",
    "status",
    "days",
    "summary",
    "interests",
    "imageUrl",
  ];

  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  const trip = await TripModel.findByIdAndUpdate(
    tripId,
    filtered,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!trip) throw new ApiError("Trip not found", 404);

  return trip;
};
export const getTripStats = async () => {
  const [totalTrips, activeTripsNow] = await Promise.all([
    TripModel.countDocuments({ status: { $ne: "archived" } }),
    TripModel.countDocuments({
      status: "saved",
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  return { totalTrips, activeTripsNow };
};