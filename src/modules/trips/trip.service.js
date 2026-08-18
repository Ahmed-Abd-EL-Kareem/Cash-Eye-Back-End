import TripModel from "./trip.model.js";
import UserModel from "../users/user.model.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import { generateTripPlan } from "../../integrations/langchain/tripPlanner.ai.js";
import { recordAiUsage } from "../aiUsage/aiUsage.service.js";

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
      destination: aiResult.destination,
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
    await recordAiUsage({
      userId,
      feature: "tripPlanner",
      sessionId: null,
      tripId: trip._id,
      prompt: null,
      response: null,
      model: aiResult.rawResponse?.model || "openai/gpt-oss-120b",
      promptTokens: aiResult.rawResponse?.usage?.prompt_tokens || 0,
      completionTokens: aiResult.rawResponse?.usage?.completion_tokens || 0,
      totalTokens: aiResult.rawResponse?.usage?.total_tokens || 0,
      cost: 0,
      latencyMs: responseTime,
      status: "success",
      errorMessage: null,
    });

    return { trip, tokensUsed: aiResult.tokensUsed };
  } catch (error) {
    const responseTime = Date.now() - start;

    // Log failure AI Usage
    await recordAiUsage({
      userId,
      feature: "tripPlanner",
      sessionId: null,
      tripId: null,
      prompt: null,
      response: null,
      model: "openai/gpt-oss-120b",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      latencyMs: responseTime,
      status: "error",
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
  ).filter().search(["title.en", "title.ar", "destination.en", "destination.ar"]).sort().paginate();

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
// ─── Localize helper for manual trip input ────────────────────────────────────
// The Trip schema's title/destination/summary/day-text fields are now
// bilingual { en, ar } objects (see trip.model.js). Manual trip creation
// is filled in directly by a person, so until the frontend form collects
// both languages explicitly, accept either shape:
//   - a plain string  → duplicated into both { en, ar } (not a real
//     translation — just keeps old single-language form payloads working
//     without throwing a Mongoose validation error)
//   - an { en, ar } object → passed through as-is
// TODO: once the manual-trip form collects Arabic text explicitly, this
// fallback can be removed and { en, ar } made a hard requirement.
const toLocalized = (value) => {
  if (value && typeof value === "object" && (value.en !== undefined || value.ar !== undefined)) {
    return { en: value.en || "", ar: value.ar || "" };
  }
  if (typeof value === "string") return { en: value, ar: value };
  return { en: "", ar: "" };
};

const localizeManualDays = (days = []) =>
  (days || []).map((d) => ({
    ...d,
    title: toLocalized(d.title),
    accommodation: toLocalized(d.accommodation),
    tips: toLocalized(d.tips),
    activities: (d.activities || []).map(toLocalized),
    meals: (d.meals || []).map(toLocalized),
  }));

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
    title: toLocalized(title),
    destination: toLocalized(destination),
    imageUrl: imageUrl || null,
    duration,
    budget: budget || "mid-range",
    travelers: travelers || 1,
    interests: interests || [],
    language: language || "en",
    days: localizeManualDays(days),
    summary: toLocalized(summary),
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

// Applies toLocalized/localizeManualDays to whichever of title/destination/
// summary/days are present in a partial update payload, leaving every other
// key untouched. Used by both updateTrip and adminUpdateTrip below so a
// PATCH with a plain string for title/destination doesn't throw a Mongoose
// validation error against the now-bilingual schema.
const localizeUpdates = (filtered) => {
  const out = { ...filtered };
  if ("title" in out) out.title = toLocalized(out.title);
  if ("destination" in out) out.destination = toLocalized(out.destination);
  if ("summary" in out) out.summary = toLocalized(out.summary);
  if ("days" in out) out.days = localizeManualDays(out.days);
  return out;
};

// ─── Update trip ──────────────────────────────────────────────────────────────
export const updateTrip = async (tripId, userId, updates, role) => {
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
  const filtered = localizeUpdates(Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  ));
  let trip = null;
  if (role === "admin") {
    trip = await TripModel.findOneAndUpdate(
      { _id: tripId },
      filtered,
      { returnDocument: "after", runValidators: true }
    )
  } else {
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
export const adminGetAllTrips = async (query) => {
  const features = new APIFeatures(
    TripModel,
    TripModel.find().populate("user", "name email"),
    query
  ).filter().search(["title.en", "title.ar", "destination.en", "destination.ar"]).sort().paginate();

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

  const filtered = localizeUpdates(Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  ));

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
