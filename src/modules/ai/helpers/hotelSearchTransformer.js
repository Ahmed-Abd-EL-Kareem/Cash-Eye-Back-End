import { AIHotelSearch } from "./aiHotelSearch.js";

export class HotelSearchTransformer {
  /**
   * Convert AI interpreted filters to hotel service query format
   * @param {Object} aiFilters - The filters from AI processing
   * @returns {Object} Query object for hotel service
   */
  static toHotelQuery(aiFilters) {
    const query = {};

    if (aiFilters.location) {
      query.city = aiFilters.location;
    }

    // Price range
    if (aiFilters.minPrice !== null || aiFilters.maxPrice !== null) {
      // Hotel service expects minPrice and maxPrice
      if (aiFilters.minPrice !== null) {
        query.minPrice = aiFilters.minPrice;
      }
      if (aiFilters.maxPrice !== null) {
        query.maxPrice = aiFilters.maxPrice;
      }
    }

    // Rating - hotel service uses stars filter
    if (aiFilters.minRating !== null) {
      query.stars = aiFilters.minRating;
    }

    // Amenities - we don't have a direct amenities filter in hotel service
    // This would need to be added to the hotel service or done post-query
    // TODO: Add amenities filter to hotel service if needed

    // Keywords - add to search
    if (aiFilters.keywords && aiFilters.keywords.length > 0) {
      const keywordSearch = aiFilters.keywords.join(' ');
      if (query.search) {
        query.search += ` ${keywordSearch}`;
      } else {
        query.search = keywordSearch;
      }
    }

    // Date context - not directly used in hotel search, but would be used in booking
    // We'll pass it through in the context for later use

    return query;
  }

  /**
   * Transform AI hotel search results to match the expected API response format
   * @param {Object} aiResult - The result from AI processing
   * @param {Array} hotels - The raw hotel objects from the database
   * @returns {Object} Formatted response for the API
   */
  static transformSearchResults(aiResult, hotels) {
    if (!aiResult || !aiResult.interpretedFilters) {
      throw new Error('Invalid AI result format');
    }

    const formattedHotels = hotels.map(hotel => {
      const matchScore = AIHotelSearch.scoreHotel(hotel, aiResult.interpretedFilters);
      const explanation = AIHotelSearch.generateExplanation(hotel, aiResult.interpretedFilters);
      
      return {
        hotel,
        matchScore,
        explanation
      };
    });

    // Sort by match score descending
    formattedHotels.sort((a, b) => b.matchScore - a.matchScore);

    return {
      status: 'success',
      data: {
        interpretedFilters: aiResult.interpretedFilters,
        hotels: formattedHotels,
        suggestions: aiResult.suggestions || []
      }
    };
  }
}