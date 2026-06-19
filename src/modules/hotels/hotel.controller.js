import asyncHandler from "../../utils/asyncHandler.js";

import * as hotelService from "./hotel.service.js";

import {
  successResponse,
  createdResponse,
} from "../../utils/apiResponse.js";

// ─────────────────────────────────────────────────────────────

export const getHotels = asyncHandler(async (req, res) => {
  const { hotels, pagination } =
    await hotelService.getAllHotels(req.query);

  successResponse(res, {
    message: "Hotels fetched successfully",
    length: hotels.length,
    data: hotels,
    meta: { pagination },
  });
});

export const getNearbyHotels = asyncHandler(async (req, res) => {
  const hotels = await hotelService.getHotelsNearby(
    req.query
  );

  successResponse(res, {
    message: "Nearby hotels fetched successfully",
    length: hotels.length,
    data: hotels,
  });
});

export const getHotel = asyncHandler(async (req, res) => {
  const hotel = await hotelService.getHotelById(
    req.params.id
  );

  successResponse(res, {
    message: "Hotel fetched successfully",
    data: hotel,
  });
});

export const getHotelBySlug = asyncHandler(
  async (req, res) => {
    const hotel =
      await hotelService.getHotelBySlug(
        req.params.slug
      );

    successResponse(res, {
      message: "Hotel fetched successfully",
      data: hotel,
    });
  }
);

export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await hotelService.createHotel(req.body);

  createdResponse(res, {
    message: "Hotel created successfully",
    data: hotel,
  });
});

export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await hotelService.updateHotel(
    req.params.id,
    req.body
  );

  successResponse(res, {
    message: "Hotel updated successfully",
    data: hotel,
  });
});

export const deleteHotel = asyncHandler(async (req, res) => {
  await hotelService.deleteHotel(req.params.id);

  successResponse(res, {
    message: "Hotel deleted successfully",
  });
});
export const getHotelMeta = asyncHandler(async (req, res) => {
  const data = await hotelService.getHotelMeta();
  successResponse(res, {
    message: "Hotel metadata fetched successfully",
    data,
  });
});

export const getHotelStats = asyncHandler(async (req, res) => {
  const stats = await hotelService.getHotelStats();

  successResponse(res, {
    message: "Hotel stats fetched successfully",
    data: stats,
  });
});
export const getTopHotels = asyncHandler(async (req, res) => {
  const hotels = await hotelService.getTopHotels(req.query.limit);

  successResponse(res, {
    message: "Top hotels fetched successfully",
    data: { hotels },
  });
});