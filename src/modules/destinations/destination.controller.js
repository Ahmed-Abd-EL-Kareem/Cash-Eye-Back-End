import asyncHandler from "../../utils/asyncHandler.js";
import * as destinationService from "./destination.service.js";

import {
  successResponse,
  createdResponse,
} from "../../utils/apiResponse.js";

// ─── Public ───────────────────────────────────────────────────────────────────

<<<<<<< HEAD
export const getDestinations = asyncHandler(
  async (req, res) => {
    const { destinations, pagination } =
      await destinationService.getAllDestinations(
        req.query
      );

    successResponse(res, {
      message: "Destinations fetched successfully",

      length: destinations.length,

      data: destinations,

      meta: {
        pagination,
      },
    });
  }
);
=======
// GET /api/v1/destinations
// ?city=Cairo  ?category=historical  ?region=Upper%20Egypt
// ?month=October  ?minBudget=500  ?maxBudget=2000  ?search=pyramid
// ?sort=-averageBudgetPerDay  ?page=1  ?limit=10
export const getDestinations = asyncHandler(async (req, res) => {
  const { destinations, pagination } =
    await destinationService.getAllDestinations(req.query);

  successResponse(res, {
    message: "Destinations fetched successfully",
    length: destinations.length,
    data: destinations,
    meta: { pagination },
  });
});
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e

// GET /api/v1/destinations/nearby?lng=31.13&lat=29.97&maxKm=50&limit=10
export const getNearbyDestinations = asyncHandler(async (req, res) => {
  const { lng, lat, maxKm = 100, limit = 10 } = req.query;

  const destinations = await destinationService.getDestinationsNearby({
    lng, lat, maxKm, limit,
  });

  successResponse(res, {
    message: "Nearby destinations fetched successfully",
    length: destinations.length,
    data: destinations,
  });
});

// GET /api/v1/destinations/slug/:slug
export const getDestinationBySlug = asyncHandler(async (req, res) => {
  const destination = await destinationService.getDestinationBySlug(
    req.params.slug
  );

<<<<<<< HEAD
export const getDestination = asyncHandler(
  async (req, res) => {
    const destination =
      await destinationService.getDestinationById(
        req.params.id
      );

    successResponse(res, {
      message: "Destination fetched successfully",

      data: destination,
    });
  }
);


export const createDestination = asyncHandler(
  async (req, res) => {
    const destination =
      await destinationService.createDestination(
        req.body
      );

    createdResponse(res, {
      message: "Destination created successfully",

      data: destination,
    });
  }
);


export const updateDestination = asyncHandler(
  async (req, res) => {
    const destination =
      await destinationService.updateDestination(
        req.params.id,
        req.body
      );

    successResponse(res, {
      message: "Destination updated successfully",

      data: destination,
    });
  }
);


export const deleteDestination = asyncHandler(
  async (req, res) => {
    await destinationService.deleteDestination(
      req.params.id
    );

    successResponse(res, {
      message:
        "Destination deleted successfully",
    });
  }
);


export const getNearbyDestinations =
  asyncHandler(async (req, res) => {
    const destinations =
      await destinationService.getNearbyDestinations(
        req.query
      );

    successResponse(res, {
      message:
        "Nearby destinations fetched successfully",

      length: destinations.length,

      data: destinations,
    });
  });
=======
  successResponse(res, {
    message: "Destination fetched successfully",
    data: destination,
  });
});

// GET /api/v1/destinations/:id
export const getDestination = asyncHandler(async (req, res) => {
  const destination = await destinationService.getDestinationById(req.params.id);

  successResponse(res, {
    message: "Destination fetched successfully",
    data: destination,
  });
});

// ─── Admin only ───────────────────────────────────────────────────────────────

// POST /api/v1/destinations
export const createDestination = asyncHandler(async (req, res) => {
  const destination = await destinationService.createDestination(req.body);

  createdResponse(res, {
    message: "Destination created successfully",
    data: destination,
  });
});

// PATCH /api/v1/destinations/:id
export const updateDestination = asyncHandler(async (req, res) => {
  const destination = await destinationService.updateDestination(
    req.params.id,
    req.body
  );

  successResponse(res, {
    message: "Destination updated successfully",
    data: destination,
  });
});

// DELETE /api/v1/destinations/:id  (soft delete)
export const deleteDestination = asyncHandler(async (req, res) => {
  await destinationService.deleteDestination(req.params.id);

  successResponse(res, { message: "Destination deleted successfully" });
});
>>>>>>> 4d5aa4b661dd0b7d917db77cc10fe1ed9c4b125e
