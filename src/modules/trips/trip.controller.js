// import asyncHandler from "../../utils/asyncHandler.js";
// import ApiError from "../../utils/apiError.js";
// import * as tripService from "./trip.service.js";
// import { successResponse, createdResponse } from "../../utils/apiResponse.js";
// import { recordAIUsage } from "../../middleware/aiUsage.middleware.js";

// // POST /api/v1/trips/generate
// export const generateTrip = asyncHandler(async (req, res) => {
//   const { destination, duration, budget, travelers, interests, language } = req.body;

//   if (!destination?.trim())
//     throw new ApiError("destination is required", 400);
//   if (!duration || isNaN(Number(duration)) || Number(duration) < 1)
//     throw new ApiError("duration must be a positive number (days)", 400);

//   const result = await tripService.generateAndSaveTrip(req.user._id, {
//     destination: destination.trim(),
//     duration: Number(duration),
//     budget,
//     travelers: travelers ? Number(travelers) : 1,
//     interests,
//     language,
//   });
//   await recordAIUsage(req.subscription, { isTripGeneration: true });

//   createdResponse(res, {
//     message: "Trip generated successfully",
//     tokensUsed: result.tokensUsed,
//     data: { trip: result.trip },
//   });
// });

// // GET /api/v1/trips
// export const getMyTrips = asyncHandler(async (req, res) => {
//   const result = await tripService.getMyTrips(req.user._id, req.query);
//   successResponse(res, {
//     message: "Trips fetched successfully",
//     length: result.trips.length,
//     data: result.trips,
//     meta: { pagination: result.pagination },
//   });
// });

// // GET /api/v1/trips/:id
// export const getTripById = asyncHandler(async (req, res) => {
//   const trip = await tripService.getTripById(req.params.id, req.user._id);
//   successResponse(res, { message: "Trip fetched successfully", data: trip });
// });

// // PATCH /api/v1/trips/:id
// export const updateTrip = asyncHandler(async (req, res) => {
//   const trip = await tripService.updateTrip(
//     req.params.id, req.user._id, req.body
//   );
//   successResponse(res, { message: "Trip updated successfully", data: trip });
// });

// // DELETE /api/v1/trips/:id
// export const deleteTrip = asyncHandler(async (req, res) => {
//   await tripService.deleteTrip(req.params.id, req.user._id);
//   successResponse(res, { message: "Trip deleted successfully" });
// });

// // GET /api/v1/trips/admin/all
// export const adminGetAllTrips = asyncHandler(async (req, res) => {
//   const result = await tripService.adminGetAllTrips(req.query);
//   successResponse(res, {
//     message: "All trips fetched successfully",
//     length: result.trips.length,
//     data: result.trips,
//     meta: { pagination: result.pagination },
//   });
// });
// ? /////////////////////////
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/apiError.js";
import * as tripService from "./trip.service.js";
import { successResponse, createdResponse } from "../../utils/apiResponse.js";
import { recordAIUsage } from "../../middleware/aiUsage.middleware.js";


// POST /api/v1/trips/generate
export const generateTrip = asyncHandler(async (req, res) => {
  const {
    destination,
    duration,
    budget,
    travelers,
    interests,
    language,
    imageUrl,
  } = req.body;

  if (!destination?.trim())
    throw new ApiError("destination is required", 400);

  if (!duration || isNaN(Number(duration)) || Number(duration) < 1)
    throw new ApiError("duration must be a positive number (days)", 400);

  const result = await tripService.generateAndSaveTrip(
    req.user._id,
    {
      destination: destination.trim(),
      duration: Number(duration),
      budget,
      travelers: travelers ? Number(travelers) : 1,
      interests,
      language,
      imageUrl,
    }
  );

  await recordAIUsage(req.subscription, {
    isTripGeneration: true,
  });

  createdResponse(res, {
    message: "Trip generated successfully",
    tokensUsed: result.tokensUsed,
    data: {
      trip: result.trip,
    },
  });
});

// GET /api/v1/trips
export const getMyTrips = asyncHandler(async (req, res) => {
  const result = await tripService.getMyTrips(req.user._id, req.query);
  successResponse(res, {
    message: "Trips fetched successfully",
    length: result.trips.length,
    data: result.trips,
    meta: { pagination: result.pagination },
  });
});

// GET /api/v1/trips/:id
export const getTripById = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripById(req.params.id, req.user._id);
  successResponse(res, { message: "Trip fetched successfully", data: trip });
});

// PATCH /api/v1/trips/:id
export const updateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(
    req.params.id, req.user._id, req.body
  );
  successResponse(res, { message: "Trip updated successfully", data: trip });
});

// DELETE /api/v1/trips/:id
export const deleteTrip = asyncHandler(async (req, res) => {
  await tripService.deleteTrip(req.params.id, req.user._id);
  successResponse(res, { message: "Trip deleted successfully" });
});

// GET /api/v1/trips/admin/all
export const adminGetAllTrips = asyncHandler(async (req, res) => {
  const result = await tripService.adminGetAllTrips(req.query);
  successResponse(res, {
    message: "All trips fetched successfully",
    length: result.trips.length,
    data: result.trips,
    meta: { pagination: result.pagination },
  });
});
// POST /api/v1/trips
export const createManualTrip = asyncHandler(async (req, res) => {
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
  } = req.body;

  if (!title?.trim())
    throw new ApiError("title is required", 400);
  if (!destination?.trim())
    throw new ApiError("destination is required", 400);
  if (!duration || isNaN(Number(duration)) || Number(duration) < 1)
    throw new ApiError("duration must be a positive number (days)", 400);

  const trip = await tripService.createManualTrip(req.user._id, {
    title: title.trim(),
    destination: destination.trim(),
    duration: Number(duration),
    budget,
    travelers: travelers ? Number(travelers) : 1,
    interests,
    language,
    imageUrl,
    summary,
    days,
    estimatedTotalCost,
    currency,
    status,
  });

  createdResponse(res, {
    message: "Trip created successfully",
    data: { trip },
  });
});
export const adminGetTripById = asyncHandler(async (req, res) => {
  const trip = await tripService.adminGetTripById(req.params.id);

  successResponse(res, {
    message: "Trip fetched successfully",
    data: trip,
  });
});

export const adminUpdateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.adminUpdateTrip(
    req.params.id,
    req.body
  );

  successResponse(res, {
    message: "Trip updated successfully",
    data: trip,
  });
});