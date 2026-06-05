// Natural language processing for hotel search
// This is a mock implementation. In a real system, you would use an NLP model or service.

export class AIHotelSearch {
  /**
   * Parse a natural language query into structured filters
   * @param {string} query - The natural language query
   * @param {Object} context - Additional context (dates, guests, etc.)
   * @returns {Object} Structured filters
   */
  static parseQuery(query, context = {}) {
    // Convert to lowercase for easier matching
    const lowerQuery = query.toLowerCase();

    // Initialize filters
    const filters = {
      location: null,
      minPrice: null,
      maxPrice: null,
      minRating: null,
      amenities: [],
      hotelType: null,
      keywords: [],
    };

    // Extract location (simple keyword matching for demo)
    const locations = ['cairo', 'luxor', 'aswan', 'hurgada', 'sharm', 'alexandria'];
    for (const loc of locations) {
      if (lowerQuery.includes(loc)) {
        filters.location = loc;
        break;
      }
    }

    // Extract price range
    const priceMatch = lowerQuery.match(/under\s*\$?(\d+)/i);
    if (priceMatch) {
      filters.maxPrice = parseInt(priceMatch[1], 10);
    }
    const priceRangeMatch = lowerQuery.match(/between\s*\$?(\d+)\s*-\s*\$?(\d+)/i);
    if (priceRangeMatch) {
      filters.minPrice = parseInt(priceRangeMatch[1], 10);
      filters.maxPrice = parseInt(priceRangeMatch[2], 10);
    }

    // Extract rating
    const ratingMatch = lowerQuery.match(/(\d+)\s*star/i);
    if (ratingMatch) {
      filters.minRating = parseInt(ratingMatch[1], 10);
    }

    // Extract amenities
    const amenitiesList = ['pool', 'spa', 'gym', 'breakfast', 'wifi', 'parking'];
    for (const amenity of amenitiesList) {
      if (lowerQuery.includes(amenity)) {
        filters.amenities.push(amenity);
      }
    }

    // Extract hotel type
    const hotelTypes = ['resort', 'boutique', 'business', 'family'];
    for (const type of hotelTypes) {
      if (lowerQuery.includes(type)) {
        filters.hotelType = type;
        break;
      }
    }

    // Extract keywords (simple: split by space and filter out common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = lowerQuery.split(/\s+/).filter(word => word.length > 2 && !stopWords.has(word));
    filters.keywords = words;

    // Override with context if provided
    if (context.checkIn) filters.checkIn = context.checkIn;
    if (context.checkOut) filters.checkOut = context.checkOut;
    if (context.guests) filters.guests = context.guests;
    if (context.rooms) filters.rooms = context.rooms;
    if (context.tripId) filters.tripId = context.tripId;

    return filters;
  }

  /**
   * Score hotels based on how well they match the filters
   * @param {Object} hotel - The hotel object
   * @param {Object} filters - The structured filters
   * @returns {number} Match score (0-100)
   */
  static scoreHotel(hotel, filters) {
    let score = 0;
    let maxScore = 100;

    const hotelCity = (hotel.city || "").toLowerCase();
    const filterLocation = (filters.location || "").toLowerCase();

    if (filterLocation && hotelCity.includes(filterLocation)) {
      score += 30;
    } else if (filterLocation) {
      // If location is specified but doesn't match, penalize
      score -= 10;
    }

    // Price (25 points)
    if (filters.maxPrice !== null && hotel.averagePricePerNight !== undefined) {
      if (hotel.averagePricePerNight <= filters.maxPrice) {
        score += 25;
      } else {
        // Partial score for being close
        const excess = hotel.averagePricePerNight - filters.maxPrice;
        const excessRatio = excess / filters.maxPrice;
        if (excessRatio <= 0.5) { // Within 50% over budget
          score += 25 * (1 - excessRatio);
        }
      }
    } else if (filters.maxPrice === null) {
      score += 25; // No price constraint
    }

    // Rating (20 points)
    if (filters.minRating !== null && hotel.stars !== undefined) {
      if (hotel.stars >= filters.minRating) {
        score += 20;
      } else {
        // Partial score for being close
        const ratingRatio = hotel.stars / filters.minRating;
        score += 20 * ratingRatio;
      }
    } else if (filters.minRating === null) {
      score += 20; // No rating constraint
    }

    // Amenities (15 points)
    if (filters.amenities.length > 0 && hotel.amenities && Array.isArray(hotel.amenities)) {
      const matchedAmenities = filters.amenities.filter(amenity =>
        hotel.amenities.some(hotelAmenity => hotelAmenity.toLowerCase().includes(amenity))
      );
      const amenityScore = (matchedAmenities.length / filters.amenities.length) * 15;
      score += amenityScore;
    } else if (filters.amenities.length === 0) {
      score += 15; // No amenity constraint
    }

    // Hotel type (10 points)
    if (filters.hotelType && hotel.description) {
      if (hotel.description.toLowerCase().includes(filters.hotelType)) {
        score += 10;
      }
    } else if (!filters.hotelType) {
      score += 10; // No hotel type constraint
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate an explanation for why a hotel matches the query
   * @param {Object} hotel - The hotel object
   * @param {Object} filters - The structured filters
   * @returns {string} Explanation
   */
  static generateExplanation(hotel, filters) {
    const explanations = [];

    const hotelCity = (hotel.city || "").toLowerCase();
    const filterLocation = (filters.location || "").toLowerCase();

    if (filterLocation && hotelCity.includes(filterLocation)) {
      explanations.push(`Located in ${hotel.city}`);
    }

    if (filters.maxPrice !== null && hotel.averagePricePerNight !== undefined && hotel.averagePricePerNight <= filters.maxPrice) {
      explanations.push(`Within budget (${hotel.currency || "EGP"} ${hotel.averagePricePerNight}/night)`);
    }

    if (filters.minRating !== null && hotel.stars !== undefined && hotel.stars >= filters.minRating) {
      explanations.push(`${hotel.stars}★ rating`);
    }

    if (filters.amenities.length > 0 && hotel.amenities && Array.isArray(hotel.amenities)) {
      const matchedAmenities = filters.amenities.filter((amenity) =>
        hotel.amenities.some((hotelAmenity) => hotelAmenity.toLowerCase().includes(amenity))
      );
      if (matchedAmenities.length > 0) {
        explanations.push(`Includes: ${matchedAmenities.join(", ")}`);
      }
    }

    if (explanations.length === 0) {
      return "This hotel matches your search criteria.";
    }

    return explanations.join('. ') + '.';
  }
}