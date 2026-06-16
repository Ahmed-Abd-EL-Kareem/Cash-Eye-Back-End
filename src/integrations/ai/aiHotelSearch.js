// Hotel Search AI
// Flow: RAG query → retrieve Pinecone context → build prompt → call LLM
// Returns structured filters for MongoDB hotel query + scoring helpers.

import { chatClient } from "./openai.client.js";
import { retrieveContext } from "./pinecone.rag.js";
import { buildHotelSearchSystemPrompt, buildRagQuery } from "./prompt.engine.js";
import logger from "../../config/logger.js";

const EMPTY_FILTERS = {
  location: null,
  minPrice: null,
  maxPrice: null,
  minStars: null,
  amenities: [],
  hotelType: null,
  keywords: [],
  searchSummary: "",
};

const parseJsonResponse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    const match =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
};

export const parseHotelSearchQuery = async (query, context = {}) => {
  try {
    const ragQuery = buildRagQuery("hotel", { query, location: context.location });
    const ragContext = await retrieveContext(ragQuery, 3);

    if (ragContext) {
      logger.info(`[HotelSearch] RAG context retrieved (${ragContext.length} chars)`);
    }

    const systemPrompt = buildHotelSearchSystemPrompt(ragContext, query, context);

    const response = await chatClient.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from AI");

    const filters = parseJsonResponse(raw, { ...EMPTY_FILTERS, searchSummary: query });

    if (context.checkIn) filters.checkIn = context.checkIn;
    if (context.checkOut) filters.checkOut = context.checkOut;
    if (context.guests) filters.guests = context.guests;
    if (context.rooms) filters.rooms = context.rooms;
    if (context.tripId) filters.tripId = context.tripId;

    filters.tokensUsed = response.usage?.total_tokens || 0;

    logger.info(`[HotelSearch] Parsed filters: ${JSON.stringify(filters)}`);
    return filters;
  } catch (err) {
    logger.error(`[HotelSearch] parseHotelSearchQuery failed: ${err.message}`);
    return { ...EMPTY_FILTERS, searchSummary: query };
  }
};

export const scoreHotel = (hotel, filters) => {
  let score = 0;

  const hotelCity = (hotel.city || "").toLowerCase();
  const filterLocation = (filters.location || "").toLowerCase();

  if (filterLocation && hotelCity.includes(filterLocation)) {
    score += 35;
  } else if (filterLocation) {
    score -= 15;
  } else {
    score += 20;
  }

  const price = hotel.averagePricePerNight;
  if (filters.maxPrice && price <= filters.maxPrice) score += 25;
  else if (!filters.maxPrice) score += 25;
  else if (filters.maxPrice && price <= filters.maxPrice * 1.3) score += 12;

  if (filters.minStars && hotel.stars >= filters.minStars) score += 20;
  else if (!filters.minStars) score += 20;

  if (filters.amenities?.length > 0 && hotel.amenities?.length > 0) {
    const hotelAmenLower = hotel.amenities.map((a) => a.toLowerCase());
    const matched = filters.amenities.filter((a) =>
      hotelAmenLower.some((ha) => ha.includes(a.toLowerCase()))
    );
    score += (matched.length / filters.amenities.length) * 15;
  } else {
    score += 15;
  }

  score += Math.min(hotel.stars || 0, 5);

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const generateExplanation = (hotel, filters) => {
  const parts = [];

  if (filters.location && hotel.city?.toLowerCase().includes(filters.location.toLowerCase())) {
    parts.push(`Located in ${hotel.city}`);
  }

  if (filters.maxPrice && hotel.averagePricePerNight <= filters.maxPrice) {
    parts.push(`Within budget (${hotel.currency || "EGP"} ${hotel.averagePricePerNight}/night)`);
  }

  if (hotel.stars) {
    parts.push(`${hotel.stars}-star hotel`);
  }

  if (filters.amenities?.length > 0 && hotel.amenities?.length > 0) {
    const hotelAmenLower = hotel.amenities.map((a) => a.toLowerCase());
    const matched = filters.amenities.filter((a) =>
      hotelAmenLower.some((ha) => ha.includes(a.toLowerCase()))
    );
    if (matched.length > 0) {
      parts.push(`Includes ${matched.join(", ")}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : "Matches your search criteria";
};
