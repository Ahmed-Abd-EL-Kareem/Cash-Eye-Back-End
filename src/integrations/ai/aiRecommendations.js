// Hotel Recommendations AI
// Flow: load trip context → RAG retrieve → fetch candidate hotels → LLM rank + explain

import { chatClient } from "./openai.client.js";
import { retrieveContext } from "./pinecone.rag.js";
import { buildRecommendationsPrompt, buildRagQuery } from "./prompt.engine.js";
import TripModel from "../../modules/trips/trip.model.js";
import * as hotelService from "../../modules/hotels/hotel.service.js";
import ApiError from "../../utils/apiError.js";
import logger from "../../config/logger.js";

const parseJsonResponse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    const match =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Failed to parse AI response");
  }
};

const toCandidateHotel = (hotel) => ({
  _id: hotel._id?.toString(),
  name: hotel.name?.en || hotel.name,
  city: hotel.city,
  stars: hotel.stars,
  averagePricePerNight: hotel.averagePricePerNight,
  currency: hotel.currency || "EGP",
  amenities: hotel.amenities || [],
  description: hotel.description?.en || "",
});

const mapRecommendation = (rec, hotelMap) => {
  const hotel = hotelMap.get(rec.hotelId);
  if (!hotel) return null;

  return {
    hotel: {
      id: hotel._id?.toString(),
      name: hotel.name?.en || hotel.name,
      location: hotel.city,
      pricePerNight: hotel.averagePricePerNight,
      rating: hotel.stars,
      amenities: hotel.amenities || [],
      description: hotel.description?.en || "",
    },
    matchScore: rec.matchScore,
    reason: rec.reason,
    bestFor: rec.bestFor || [],
  };
};

export const getHotelRecommendations = async (userId, context = {}) => {
  const limit = Math.min(context.limit || 10, 20);

  let trip = null;
  if (context.tripId) {
    trip = await TripModel.findOne({ _id: context.tripId, user: userId }).lean();
    if (!trip) {
      throw new ApiError("Trip not found", 404);
    }
  }

  const userContext = {
    destination: trip?.destination || context.destination || null,
    budget: trip?.budget || context.budget || "mid-range",
    interests: trip?.interests || context.interests || [],
    travelers: trip?.travelers || context.travelers || 1,
    duration: trip?.duration || null,
  };

  const ragQuery = buildRagQuery("recommendations", {
    destination: userContext.destination || "Egypt",
    interests: userContext.interests,
    budget: userContext.budget,
  });
  const ragContext = await retrieveContext(ragQuery, 5);

  if (ragContext) {
    logger.info(`[Recommendations] RAG context retrieved (${ragContext.length} chars)`);
  }

  const hotelQuery = userContext.destination
    ? { city: userContext.destination, limit: 30, sort: "-stars" }
    : { limit: 30, sort: "-stars" };

  const { hotels } = await hotelService.getAllHotels(hotelQuery);
  const candidateHotels = hotels.map(toCandidateHotel);

  if (candidateHotels.length === 0) {
    return {
      recommendations: [],
      insights: {
        trendingDestinations: ["Cairo", "Luxor", "Hurghada"],
        priceTips: "No hotels found in the database for this destination.",
        seasonalAdvice: "October to April offers the most comfortable weather in Egypt.",
      },
      tokensUsed: 0,
    };
  }

  const prompt = buildRecommendationsPrompt({
    userContext,
    ragContext,
    candidateHotels,
    limit,
  });

  const response = await chatClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new ApiError("AI failed to generate recommendations", 500);

  let parsed;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    logger.error(`[Recommendations] JSON parse failed: ${raw.slice(0, 300)}`);
    throw new ApiError("AI returned malformed recommendation data", 500);
  }

  const hotelMap = new Map(hotels.map((h) => [h._id.toString(), h]));
  const recommendations = (parsed.recommendations || [])
    .map((rec) => mapRecommendation(rec, hotelMap))
    .filter(Boolean)
    .slice(0, limit);

  const tokensUsed = response.usage?.total_tokens || 0;
  logger.info(`[Recommendations] Generated ${recommendations.length} recommendations — ${tokensUsed} tokens`);

  return {
    recommendations,
    insights: parsed.insights || {
      trendingDestinations: ["Luxor", "Aswan", "Hurghada"],
      priceTips: "Prices are typically lower during summer months (June–August).",
      seasonalAdvice: "October to April is peak season for comfortable weather.",
    },
    tokensUsed,
  };
};
