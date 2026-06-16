// Transforms AI-extracted hotel filters ↔ hotel service query ↔ API response format.

import { scoreHotel, generateExplanation } from "./aiHotelSearch.js";

export const toHotelQuery = (aiFilters) => {
  const query = {};

  if (aiFilters.location) {
    query.city = aiFilters.location;
  }

  if (aiFilters.minPrice !== null && aiFilters.minPrice !== undefined) {
    query.minPrice = aiFilters.minPrice;
  }
  if (aiFilters.maxPrice !== null && aiFilters.maxPrice !== undefined) {
    query.maxPrice = aiFilters.maxPrice;
  }

  if (aiFilters.minStars != null) {
    query.stars = aiFilters.minStars;
  }

  if (aiFilters.keywords?.length > 0) {
    query.search = aiFilters.keywords.join(" ");
  }

  return query;
};

export const transformSearchResults = (aiResult, hotels) => {
  if (!aiResult?.interpretedFilters) {
    throw new Error("Invalid AI result format");
  }

  const formattedHotels = hotels.map((hotel) => ({
    hotel,
    matchScore: scoreHotel(hotel, aiResult.interpretedFilters),
    explanation: generateExplanation(hotel, aiResult.interpretedFilters),
  }));

  formattedHotels.sort((a, b) => b.matchScore - a.matchScore);

  return {
    status: "success",
    data: {
      interpretedFilters: aiResult.interpretedFilters,
      hotels: formattedHotels,
      suggestions: aiResult.suggestions || [],
    },
  };
};
