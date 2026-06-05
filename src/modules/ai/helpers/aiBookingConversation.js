// Conversation management for AI-assisted hotel booking
// This is a mock implementation. In a real system, you would use a more sophisticated dialog manager.

export class AIBookingConversation {
  // In-memory store for conversation sessions (in production, use Redis or database)
  static sessions = new Map();

  /**
   * Get or create a conversation session
   * @param {string} sessionId - The session ID (optional)
   * @returns {Object} The session object
   */
  static getSession(sessionId) {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    // Create new session
    const newSession = {
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
      step: 'destination', // Start with destination selection
      context: {},
      history: [],
    };

    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  /**
   * Update a conversation session
   * @param {string} sessionId - The session ID
   * @param {Object} updates - The updates to apply
   */
  static updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates, { updatedAt: new Date() });
  }

  /**
   * Add a message to the conversation history
   * @param {string} sessionId - The session ID
   * @param {string} role - The role (user or assistant)
   * @param {string} content - The message content
   */
  static addMessage(sessionId, role, content) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.history.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep history limited to last 10 messages
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }

    session.updatedAt = new Date();
  }

  /**
   * Process a user message and determine the next step
   * @param {string} sessionId - The session ID
   * @param {string} message - The user's message
   * @param {Object} context - Additional context (tripId, etc.)
   * @returns {Object} The response with next step, AI response, and options
   */
  static processMessage(sessionId, message, context = {}) {
    const session = this.getSession(sessionId);
    const activeSessionId = session.id;

    this.addMessage(activeSessionId, "user", message);
    
    // Update context
    session.context = { ...session.context, ...context };
    
    // Process based on current step
    let aiResponse = '';
    let options = [];
    let nextStep = session.step;
    let isComplete = false;
    let bookingPreview = null;

    switch (session.step) {
      case 'destination':
        const destinationResponse = this.handleDestinationStep(message);
        aiResponse = destinationResponse.response;
        options = destinationResponse.options;
        if (destinationResponse.nextStep) {
          nextStep = destinationResponse.nextStep;
        }
        break;
        
      case 'dates':
        const datesResponse = this.handleDatesStep(message, session.context);
        aiResponse = datesResponse.response;
        options = datesResponse.options;
        if (datesResponse.nextStep) {
          nextStep = datesResponse.nextStep;
        }
        break;
        
      case 'budget':
        const budgetResponse = this.handleBudgetStep(message);
        aiResponse = budgetResponse.response;
        options = budgetResponse.options;
        if (budgetResponse.nextStep) {
          nextStep = budgetResponse.nextStep;
        }
        break;
        
      case 'preferences':
        const preferencesResponse = this.handlePreferencesStep(message);
        aiResponse = preferencesResponse.response;
        options = preferencesResponse.options;
        if (preferencesResponse.nextStep) {
          nextStep = preferencesResponse.nextStep;
        }
        break;
        
      case 'hotel_selection':
        const hotelSelectionResponse = this.handleHotelSelectionStep(message, session.context);
        aiResponse = hotelSelectionResponse.response;
        options = hotelSelectionResponse.options;
        if (hotelSelectionResponse.nextStep) {
          nextStep = hotelSelectionResponse.nextStep;
        }
        if (hotelSelectionResponse.isComplete) {
          isComplete = true;
          bookingPreview = hotelSelectionResponse.bookingPreview;
        }
        break;
        
      case 'guest_info':
        const guestInfoResponse = this.handleGuestInfoStep(message);
        aiResponse = guestInfoResponse.response;
        options = guestInfoResponse.options;
        if (guestInfoResponse.nextStep) {
          nextStep = guestInfoResponse.nextStep;
        }
        if (guestInfoResponse.isComplete) {
          isComplete = true;
          bookingPreview = guestInfoResponse.bookingPreview;
        }
        break;
        
      case 'payment':
        const paymentResponse = this.handlePaymentStep(message);
        aiResponse = paymentResponse.response;
        options = paymentResponse.options;
        if (paymentResponse.nextStep) {
          nextStep = paymentResponse.nextStep;
        }
        if (paymentResponse.isComplete) {
          isComplete = true;
          bookingPreview = paymentResponse.bookingPreview;
        }
        break;
        
      default:
        // Default to destination step
        nextStep = 'destination';
        const destResponse = this.handleDestinationStep(message);
        aiResponse = destResponse.response;
        options = destResponse.options;
        if (destResponse.nextStep) {
          nextStep = destResponse.nextStep;
        }
        break;
    }

    this.updateSession(activeSessionId, {
      step: nextStep,
      context: session.context,
    });

    this.addMessage(activeSessionId, "assistant", aiResponse);

    return {
      sessionId: session.id,
      step: nextStep,
      aiResponse,
      options,
      isComplete,
      bookingPreview,
    };
  }

  // Step handlers

  static handleDestinationStep(message) {
    const lowerMsg = message.toLowerCase();
    const destinations = [
      { name: 'Cairo', description: 'Pyramids, museums, bustling city life' },
      { name: 'Luxor', description: 'Ancient temples and tombs' },
      { name: 'Aswan', description: 'Nile views and relaxed atmosphere' },
      { name: 'Hurghada', description: 'Red Sea resorts and diving' },
      { name: 'Sharm El Sheikh', description: 'Diving, snorkeling, luxury resorts' },
      { name: 'Alexandria', description: 'Mediterranean coast, historical sites' },
    ];

    // Check if any destination is mentioned
    const matchedDestination = destinations.find(dest => 
      lowerMsg.includes(dest.name.toLowerCase())
    );

    if (matchedDestination) {
      return {
        response: `Great choice! ${matchedDestination.name} sounds wonderful. When are you planning to travel?`,
        options: [
          { type: 'date_range', title: 'Next weekend', description: 'Friday to Sunday' },
          { type: 'date_range', title: 'Next month', description: 'Flexible dates next month' },
          { type: 'date_range', title: 'Specific dates', description: 'Let me know your exact dates' }
        ],
        nextStep: 'dates'
      };
    }

    return {
      response: "Great! Egypt has many wonderful destinations. Are you thinking of Cairo, Luxor, Aswan, Hurghada, Sharm El Sheikh, or somewhere else?",
      options: destinations.map(dest => ({ 
        type: 'destination', 
        title: dest.name, 
        description: dest.description 
      })),
      nextStep: 'destination'
    };
  }

  static handleDatesStep(message, context) {
    const lowerMsg = message.toLowerCase();
    
    // Simple date parsing (in reality, use a date parsing library)
    let checkIn = null;
    let checkOut = null;
    
    // Check for relative dates
    if (lowerMsg.includes('next weekend')) {
      const today = new Date();
      const day = today.getDay();
      const diffToFriday = (5 - day + 7) % 7; // Days until Friday
      checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + diffToFriday);
      checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 2); // Friday to Sunday
    } else if (lowerMsg.includes('next month')) {
      const today = new Date();
      checkIn = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      checkOut = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    } else if (lowerMsg.includes('tomorrow')) {
      checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 1);
      checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
    }
    
    // Store in context if we parsed dates
    if (checkIn && checkOut) {
      context.checkIn = checkIn.toISOString().split('T')[0];
      context.checkOut = checkOut.toISOString().split('T')[0];
      
      return {
        response: `Got it! You're looking to stay from ${context.checkIn} to ${context.checkOut}. What's your budget per night?`,
        options: [
          { type: 'budget', title: 'Budget (Under $50)', description: 'Affordable options' },
          { type: 'budget', title: 'Mid-range ($50-$150)', description: 'Comfortable hotels' },
          { type: 'budget', title: 'Luxury ($150+)', description: 'High-end resorts' },
          { type: 'budget', title: 'Flexible', description: 'Let me show you options across budgets' }
        ],
        nextStep: 'budget'
      };
    }

    return {
      response: "When are you planning to travel? You can say things like 'next weekend', 'next month', or specific dates like 'June 15-20'.",
      options: [
        { type: 'date_range', title: 'Next weekend', description: 'Friday to Sunday' },
        { type: 'date_range', title: 'Next month', description: 'Flexible dates next month' },
        { type: 'date_input', title: 'Specific dates', description: 'Enter your check-in and check-out dates' }
      ],
      nextStep: 'dates'
    };
  }

  static handleBudgetStep(message) {
    const lowerMsg = message.toLowerCase();
    let maxPrice = null;
    
    if (lowerMsg.includes('budget') || lowerMsg.includes('cheap') || lowerMsg.includes('affordable')) {
      maxPrice = 50; // $50
    } else if (lowerMsg.includes('mid-range') || lowerMsg.includes('moderate')) {
      maxPrice = 150; // $150
    } else if (lowerMsg.includes('luxury') || lowerMsg.includes('high-end') || lowerMsg.includes('expensive')) {
      maxPrice = 500; // $500 (no upper limit really)
    }
    
    // Try to extract a number
    const priceMatch = lowerMsg.match(/\$?(\d+)/);
    if (priceMatch) {
      maxPrice = parseInt(priceMatch[1], 10);
    }

    if (maxPrice !== null) {
      // Store in context
      // Note: In a real implementation, we'd store this properly
      return {
        response: `Great! Looking for hotels under $${maxPrice} per night. Any specific amenities or hotel type you're interested in?`,
        options: [
          { type: 'amenity', title: 'Pool', description: 'Swimming pool' },
          { type: 'amenity', title: 'Spa', description: 'Spa and wellness center' },
          { type: 'amenity', title: 'Gym', description: 'Fitness center' },
          { type: 'amenity', title: 'Breakfast', description: 'Free breakfast included' },
          { type: 'amenity', title: 'WiFi', description: 'Free wireless internet' },
          { type: 'amenity', title: 'Parking', description: 'Free parking' },
          { type: 'hotel_type', title: 'Resort', description: 'Full-service resort' },
          { type: 'hotel_type', title: 'Boutique', description: 'Unique, stylish hotel' },
          { type: 'hotel_type', title: 'Business', description: 'Business-friendly hotel' },
          { type: 'hotel_type', title: 'Family', description: 'Family-friendly hotel' }
        ],
        nextStep: 'preferences'
      };
    }

    return {
      response: "What's your budget per night? You can say things like 'under $100', '$50-150', or just 'luxury'.",
      options: [
        { type: 'budget', title: 'Under $50', description: 'Budget options' },
        { type: 'budget', title: '$50-150', description: 'Mid-range hotels' },
        { type: 'budget', title: '$150-250', description: 'Upper mid-range' },
        { type: 'budget', title: '$250+', description: 'Luxury options' },
        { type: 'budget', title: 'No preference', description: 'Show me all options' }
      ],
      nextStep: 'budget'
    };
  }

  static handlePreferencesStep(message) {
    const lowerMsg = message.toLowerCase();
    const preferences = {};
    
    // Check for amenities
    const amenities = ['pool', 'spa', 'gym', 'breakfast', 'wifi', 'parking'];
    for (const amenity of amenities) {
      if (lowerMsg.includes(amenity)) {
        preferences[amenity] = true;
      }
    }
    
    // Check for hotel type
    const hotelTypes = ['resort', 'boutique', 'business', 'family'];
    for (const type of hotelTypes) {
      if (lowerMsg.includes(type)) {
        preferences.hotelType = type;
        break;
      }
    }
    
    // Store preferences in context (simplified)
    // In reality, we'd merge with existing context
    
    return {
      response: "Perfect! Now let me find some great hotel options for you.",
      options: [], // We'll show hotels in the next step
      nextStep: 'hotel_selection'
    };
  }

  static handleHotelSelectionStep(message, context) {
    // In a real implementation, we would:
    // 1. Use the context (location, dates, budget, preferences) to search hotels
    // 2. Return a selection of hotels with match scores and explanations
    // 3. Let the user choose one
    
    // For this mock, we'll simulate having found some hotels
    const mockHotels = [
      {
        id: 'mock_hotel_1',
        name: 'Luxor Palace Hotel',
        location: 'Luxor',
        pricePerNight: 120,
        rating: 4.5,
        amenities: ['pool', 'spa', 'breakfast', 'wifi'],
        description: 'Beautiful hotel with Nile views and excellent service',
        matchScore: 95,
        explanation: 'Matches your request for a hotel with pool, breakfast, and WiFi in Luxor. Excellent rating and great location.'
      },
      {
        id: 'mock_hotel_2',
        name: 'Nile View Resort',
        location: 'Aswan',
        pricePerNight: 95,
        rating: 4.2,
        amenities: ['pool', 'breakfast', 'wifi', 'parking'],
        description: 'Relaxing resort with beautiful gardens and pool',
        matchScore: 88,
        explanation: 'Great value option with pool, breakfast, and WiFi. Slightly lower rating but excellent location.'
      }
    ];
    
    // Simple selection logic (in reality, user would pick from options)
    const selectedHotel = mockHotels[0]; // Just pick the first one for demo
    
    return {
      response: `I found some great options! How about the ${selectedHotel.name}? It's a ${selectedHotel.rating}★ hotel in ${selectedHotel.location} starting at $${selectedHotel.pricePerNight}/night.`,
      options: [
        { type: 'hotel_selection', title: 'Select this hotel', description: `Book the ${selectedHotel.name}` },
        { type: 'hotel_selection', title: 'Show more options', description: 'See other hotels that match your criteria' },
        { type: 'hotel_selection', title: 'Change preferences', description: 'Go back and adjust your requirements' }
      ],
      nextStep: 'guest_info',
      isComplete: false,
      bookingPreview: {
        hotel: {
          id: selectedHotel.id,
          name: selectedHotel.name,
          location: selectedHotel.location,
          pricePerNight: selectedHotel.pricePerNight,
          rating: selectedHotel.rating,
          amenities: selectedHotel.amenities
        },
        checkIn: context.checkIn || '2026-06-10',
        checkOut: context.checkOut || '2026-06-15',
        guests: context.guests || 1,
        rooms: context.rooms || 1
      }
    };
  }

  static handleGuestInfoStep(message) {
    // In a real implementation, we would collect guest information
    // For this mock, we'll just move to payment
    
    return {
      response: "Almost there! Just need to confirm your payment information to complete the booking.",
      options: [
        { type: 'payment_method', title: 'Credit/Debit Card', description: 'Visa, Mastercard, American Express' },
        { type: 'payment_method', title: 'PayPal', description: 'Pay with your PayPal account' }
      ],
      nextStep: 'payment',
      isComplete: false
    };
  }

  static handlePaymentStep(message) {
    // In a real implementation, we would process the payment
    // For this mock, we'll just complete the booking
    
    return {
      response: "Your booking has been confirmed! You'll receive a confirmation email shortly.",
      options: [
        { type: 'action', title: 'View Booking', description: 'See your booking details' },
        { type: 'action', title: 'Book Another Hotel', description: 'Start a new hotel search' },
        { type: 'action', title: 'Visit Dashboard', description: 'Go to your account dashboard' }
      ],
      nextStep: 'complete',
      isComplete: true,
      bookingPreview: {
        status: 'confirmed',
        message: 'Your booking has been successfully processed.'
      }
    };
  }
}