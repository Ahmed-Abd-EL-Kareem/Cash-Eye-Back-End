// agent.tools.js
// All LangChain tools used by the sub-agents.
// Each tool wraps one DB/RAG/scoring operation with a z.object() schema
// so LangGraph can call them via tool-calling.

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { retrieveContext } from "./rag.retriever.js";
import logger from "../../config/logger.js";

// ─── Lazy imports avoid circular deps at module load time ──────────────────────
const getHotelService = async () => (await import("../../modules/hotels/hotel.service.js"));
const getTripModel = async () => (await import("../../modules/trips/trip.model.js")).default;
const getBookingModel = async () => (await import("../../modules/bookings/booking.model.js")).default;

// ─── Sanitise price strings from LLM output ───────────────────────────────────
// Handles "100,000" / "EGP 100,000" / 100000 → clean float or undefined
const sanitisePrice = (val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const num = parseFloat(String(val).replace(/,/g, "").replace(/[^0-9.]/g, ""));
  return isFinite(num) && num > 0 ? num : undefined;
};

// ─── Validate 24-char MongoDB ObjectId ────────────────────────────────────────
const isValidObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

// ─────────────────────────────────────────────────────────────────────────────
// RAG TOOL
// ─────────────────────────────────────────────────────────────────────────────
export const ragTool = new DynamicStructuredTool({
  name: "retrieve_rag_context",
  description:
    "Search the Pinecone knowledge base for relevant hotels and destination information. " +
    "Use this before answering any travel or hotel question to get accurate RAG context.",
  schema: z.object({
    query: z.string().describe("Natural-language search query"),
    topK: z.number().int().min(1).max(10).default(5).describe("Number of results to retrieve"),
  }),
  func: async ({ query, topK }) => {
    const context = await retrieveContext(query, topK);
    if (!context) return "No relevant context found in knowledge base.";
    logger.info(`[RAG Tool] Retrieved ${context.length} chars for: "${query}"`);
    return context;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOTEL SEARCH TOOLS
// ─────────────────────────────────────────────────────────────────────────────
export const searchHotelsTool = new DynamicStructuredTool({
  name: "search_hotels",
  description:
    "Search hotels in MongoDB. Returns hotels with their exact 'id' (MongoDB ObjectId) — " +
    "use that id for get_hotel_details and save_booking. " +
    "Pass prices as strings or numbers — commas are handled automatically (e.g. '100,000' or 100000). " +
    "If no hotels match the price filter, retries without price and returns all available options.",
  schema: z.object({
    city: z.string().optional().describe("City in Egypt e.g. Cairo, Luxor, Marsa Alam, Sharm El-Sheikh"),
    minPrice: z.string().optional().describe("Min price per night EGP — commas OK e.g. '5,000' or '5000'"),
    maxPrice: z.string().optional().describe("Max price per night EGP — commas OK e.g. '100,000' or '100000'"),
    stars: z.coerce.number().int().min(1).max(5).optional().describe("Minimum star rating"),
    search: z.string().optional().describe("Free-text keyword (amenity, hotel type, etc.)"),
    limit: z.coerce.number().int().min(1).max(30).default(10),
    sort: z.string().default("-stars"),
  }),
  func: async ({ city, minPrice, maxPrice, stars, search, limit, sort }) => {
    try {
      const hotelService = await getHotelService();

      // Sanitise price inputs — strips commas/currency symbols
      const cleanMin = sanitisePrice(minPrice);
      const cleanMax = sanitisePrice(maxPrice);

      const mapHotel = (h) => ({
        id: h._id?.toString(),
        name: h.name?.en || h.name,
        city: h.city,
        stars: h.stars,
        pricePerNight: h.averagePricePerNight,
        currency: h.currency || "EGP",
        amenities: h.amenities?.slice(0, 6) || [],
        description: h.description?.en?.slice(0, 120) || "",
      });

      const buildQuery = (includePrice) => {
        const q = { limit, sort };
        if (city) q.city = city;
        if (stars !== undefined) q.stars = stars;
        if (search) q.search = search;
        if (includePrice) {
          if (cleanMin !== undefined) q.minPrice = cleanMin;
          if (cleanMax !== undefined) q.maxPrice = cleanMax;
        }
        return q;
      };

      // First attempt: with price filter
      let { hotels, pagination } = await hotelService.getAllHotels(buildQuery(true));
      logger.info(`[HotelSearch Tool] Found ${hotels.length} hotels (with price filter)`);

      // Fallback: retry without price when no results found
      if (hotels.length === 0 && (cleanMin !== undefined || cleanMax !== undefined)) {
        logger.info(`[HotelSearch Tool] No results with price filter — retrying without price`);
        ({ hotels, pagination } = await hotelService.getAllHotels(buildQuery(false)));
        logger.info(`[HotelSearch Tool] Fallback found ${hotels.length} hotels`);

        if (hotels.length === 0) {
          return JSON.stringify({
            hotels: [],
            message: city ? `No hotels found in ${city}.` : "No hotels found.",
          });
        }

        const budgetNote = [
          cleanMin ? `min EGP ${cleanMin.toLocaleString()}` : null,
          cleanMax ? `max EGP ${cleanMax.toLocaleString()}` : null,
        ].filter(Boolean).join(" – ");

        return JSON.stringify({
          hotels: hotels.map(mapHotel),
          pagination,
          note: `No hotels matched budget (${budgetNote}). Showing all available options — tell the user and let them choose.`,
        });
      }

      if (hotels.length === 0) {
        return JSON.stringify({
          hotels: [],
          message: city ? `No hotels found in ${city}.` : "No hotels found.",
        });
      }

      return JSON.stringify({ hotels: hotels.map(mapHotel), pagination });
    } catch (err) {
      return `Hotel search failed: ${err.message}`;
    }
  },
});

export const scoreHotelsTool = new DynamicStructuredTool({
  name: "score_hotels",
  description:
    "Score and rank a list of hotels against user filters. Returns hotels sorted by match score.",
  schema: z.object({
    hotels: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        city: z.string(),
        stars: z.coerce.number(),
        pricePerNight: z.coerce.number(),
        currency: z.string(),
        amenities: z.array(z.string()),
      })
    ),
    filters: z.object({
      location: z.string().nullable().optional(),
      minPrice: z.coerce.number().nullable().optional(),
      maxPrice: z.coerce.number().nullable().optional(),
      minStars: z.coerce.number().nullable().optional(),
      amenities: z.array(z.string()).optional(),
    }),
  }),
  func: async ({ hotels, filters }) => {
    const scored = hotels.map((hotel) => {
      let score = 0;
      const hotelCity = (hotel.city || "").toLowerCase();
      const filterLoc = (filters.location || "").toLowerCase();

      if (filterLoc && hotelCity.includes(filterLoc)) score += 35;
      else if (filterLoc) score -= 15;
      else score += 20;

      const price = hotel.pricePerNight;
      if (filters.maxPrice && price <= filters.maxPrice) score += 25;
      else if (!filters.maxPrice) score += 25;
      else if (filters.maxPrice && price <= filters.maxPrice * 1.3) score += 12;

      if (filters.minStars && hotel.stars >= filters.minStars) score += 20;
      else if (!filters.minStars) score += 20;

      if (filters.amenities?.length && hotel.amenities?.length) {
        const hotelAmen = hotel.amenities.map((a) => a.toLowerCase());
        const matched = filters.amenities.filter((a) =>
          hotelAmen.some((ha) => ha.includes(a.toLowerCase()))
        );
        score += (matched.length / filters.amenities.length) * 15;
      } else {
        score += 15;
      }

      score += Math.min(hotel.stars || 0, 5);
      return { ...hotel, matchScore: Math.max(0, Math.min(100, Math.round(score))) };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return JSON.stringify(scored);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TRIP CONTEXT TOOL
// ─────────────────────────────────────────────────────────────────────────────
export const getTripContextTool = new DynamicStructuredTool({
  name: "get_trip_context",
  description:
    "Fetch a saved trip by tripId to get destination, budget, interests and traveler count. " +
    "Use this when the user references a trip for hotel recommendations.",
  schema: z.object({
    tripId: z.string().describe("MongoDB ObjectId of the trip"),
    userId: z.string().describe("MongoDB ObjectId of the current user"),
  }),
  func: async ({ tripId, userId }) => {
    try {
      const TripModel = await getTripModel();
      const trip = await TripModel.findOne({ _id: tripId, user: userId }).lean();
      if (!trip) return "Trip not found.";
      return JSON.stringify({
        destination: trip.destination,
        budget: trip.budget,
        interests: trip.interests,
        travelers: trip.travelers,
        duration: trip.duration,
      });
    } catch (err) {
      return `Trip lookup failed: ${err.message}`;
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING TOOLS
// ─────────────────────────────────────────────────────────────────────────────
export const getHotelDetailsTool = new DynamicStructuredTool({
  name: "get_hotel_details",
  description: "Fetch full details of a specific hotel by its ID.",
  schema: z.object({
    hotelId: z.string().describe("MongoDB ObjectId of the hotel"),
  }),
  func: async ({ hotelId }) => {
    try {
      const hotelService = await getHotelService();
      const hotel = await hotelService.getHotelById(hotelId);
      return JSON.stringify({
        id: hotel._id?.toString(),
        name: hotel.name?.en,
        city: hotel.city,
        stars: hotel.stars,
        pricePerNight: hotel.averagePricePerNight,
        currency: hotel.currency || "EGP",
        amenities: hotel.amenities || [],
        description: hotel.description?.en || "",
      });
    } catch (err) {
      return `Hotel lookup failed: ${err.message}`;
    }
  },
});

export const saveBookingTool = new DynamicStructuredTool({
  name: "save_booking",
  description:
    "Persist a confirmed booking. ONLY call after search_hotels returned real results and user confirmed a hotel. " +
    "hotelId MUST be the 24-char MongoDB ObjectId from search_hotels 'id' field. " +
    "NEVER call with placeholders like 'hotel_id', 'not found', or hotel names.",
  schema: z.object({
    userId: z.string().describe("MongoDB ObjectId of the authenticated user"),
    hotelId: z.string().describe("24-char MongoDB ObjectId from search_hotels 'id' field — NOT a hotel name"),
    checkIn: z.string().describe("Check-in date YYYY-MM-DD"),
    checkOut: z.string().describe("Check-out date YYYY-MM-DD"),
    guests: z.coerce.number().int().min(1).default(1),
    rooms: z.coerce.number().int().min(1).default(1),
    paymentMethod: z.string().default("credit_card"),
    specialRequests: z.string().optional(),
  }),
  func: async ({ userId, hotelId, checkIn, checkOut, guests, rooms, paymentMethod, specialRequests }) => {
    // Guard: reject invalid hotelId before hitting MongoDB
    if (!isValidObjectId(hotelId)) {
      logger.warn(`[SaveBooking Tool] Rejected invalid hotelId: "${hotelId}"`);
      return JSON.stringify({
        success: false,
        error: `Invalid hotelId "${hotelId}". Use the 24-char 'id' from search_hotels results.`,
      });
    }

    try {
      const BookingModel = await getBookingModel();
      const hotelService = await getHotelService();

      const hotel = await hotelService.getHotelById(hotelId);
      if (!hotel) return JSON.stringify({ success: false, error: "Hotel not found" });

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (isNaN(checkInDate) || isNaN(checkOutDate)) {
        return JSON.stringify({ success: false, error: "Invalid dates" });
      }

      const nights = Math.max(
        1,
        Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
      );
      const totalPrice = hotel.averagePricePerNight * nights * rooms;

      const booking = await BookingModel.create({
        user: userId,
        hotel: hotel._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        rooms,
        totalPrice,
        currency: hotel.currency || "EGP",
        status: "confirmed",
        paymentStatus: "pending",
        paymentMethod,
        amountPaid: totalPrice,
        paidAt: new Date(),
        specialRequests: specialRequests || null,
      });

      logger.info(`[SaveBooking Tool] Booking saved: ${booking._id}`);
      return JSON.stringify({
        success: true,
        bookingId: booking._id.toString(),
        totalPrice,
        currency: hotel.currency || "EGP",
        nights,
      });
    } catch (err) {
      logger.error(`[SaveBooking Tool] ${err.message}`);
      return JSON.stringify({ success: false, error: err.message });
    }
  },
});