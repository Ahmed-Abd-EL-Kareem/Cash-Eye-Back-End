import asyncHandler from "../../utils/asyncHandler.js";
import * as destinationService from "./destination.service.js";

import {
  successResponse,
  createdResponse,
} from "../../utils/apiResponse.js";


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