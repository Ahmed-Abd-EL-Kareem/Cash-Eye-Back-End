import BookingModel from "./booking.model.js";
import HotelModel from "../hotels/hotel.model.js";
import * as bookingRepository from "./booking.repository.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";
import { differenceInDays } from "date-fns";

const HOLD_TTL_MINUTES = Number(process.env.HOLD_TTL_MINUTES) || 15;

const calculateNights = (checkIn, checkOut) => {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const createHold = async (userId, payload) => {
  const session = await BookingModel.startSession();
  try {
    session.startTransaction();

    const hotel = await HotelModel.findById(payload.hotel).session(session);
    if (!hotel || !hotel.isActive) throw new ApiError("Hotel not found", 404);

    let totalPrice = 0;
    const nights = calculateNights(payload.checkIn, payload.checkOut);
    const roomsData = [];

    for (const selection of payload.rooms) {
      const roomDoc = hotel.rooms.id(selection.room);
      if (!roomDoc || !roomDoc.isActive) {
        throw new ApiError(`Room ${selection.room} not found or inactive`, 404);
      }

      const maxAdultsForSelection = roomDoc.maxAdults * selection.quantity;
      const maxChildrenForSelection = roomDoc.maxChildren * selection.quantity;

      if (selection.guests.adults > maxAdultsForSelection) {
        throw new ApiError(
          `Room "${roomDoc.name}" allows max ${roomDoc.maxAdults} adults per unit (${maxAdultsForSelection} total for ${selection.quantity} unit(s))`,
          400
        );
      }
      if (selection.guests.children > maxChildrenForSelection) {
        throw new ApiError(
          `Room "${roomDoc.name}" allows max ${roomDoc.maxChildren} children per unit (${maxChildrenForSelection} total for ${selection.quantity} unit(s))`,
          400
        );
      }

      const occupied = await bookingRepository.getOccupiedUnitsForRoom(
        hotel._id,
        roomDoc._id,
        payload.checkIn,
        payload.checkOut,
        session
      );
      const availableUnits = roomDoc.totalUnits - occupied;

      if (availableUnits < selection.quantity) {
        throw new ApiError(
          `Only ${availableUnits} unit(s) of "${roomDoc.name}" available for these dates`,
          409
        );
      }

      totalPrice += roomDoc.pricePerNight * selection.quantity * nights;
      roomsData.push({
        room: roomDoc._id,
        roomType: roomDoc.roomType,
        quantity: selection.quantity,
        guests: selection.guests,
        pricePerNight: roomDoc.pricePerNight,
      });
    }

    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

    const [hold] = await BookingModel.create(
      [
        {
          user: userId,
          hotel: hotel._id,
          trip: payload.trip || null,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          rooms: roomsData,
          totalPrice,
          currency: hotel.currency,
          status: "held",
          expiresAt,
          specialRequests: payload.specialRequests || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return hold;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const getAvailability = async (hotelId, checkIn, checkOut) => {
  const hotel = await HotelModel.findById(hotelId).select("rooms");
  if (!hotel) throw new ApiError("Hotel not found", 404);

  const occupiedAggregation = await bookingRepository.getAvailabilityForHotel(hotelId, checkIn, checkOut);
  const occupiedMap = new Map(occupiedAggregation.map((o) => [o._id.toString(), o.occupiedUnits]));

  return hotel.rooms
    .filter((r) => r.isActive)
    .map((room) => {
      const occupied = occupiedMap.get(room._id.toString()) || 0;
      const available = room.totalUnits - occupied;
      return {
        roomId: room._id,
        name: room.name,
        nameAr: room.nameAr,
        roomType: room.roomType,
        totalUnits: room.totalUnits,
        occupiedUnits: occupied,
        availableUnits: Math.max(0, available),
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        maxOccupancy: room.maxOccupancy,
        pricePerNight: room.pricePerNight,
        amenities: room.amenities,
        images: room.images,
      };
    });
};

export const getRoomAvailability = async (hotelId, roomId, checkIn, checkOut, quantity = 1) => {
  const hotel = await HotelModel.findById(hotelId);
  if (!hotel) throw new ApiError("Hotel not found", 404);

  const roomDoc = hotel.rooms.id(roomId);
  if (!roomDoc || !roomDoc.isActive) throw new ApiError("Room not found", 404);

  const occupied = await bookingRepository.getOccupiedUnitsForRoom(
    hotelId,
    roomId,
    checkIn,
    checkOut
  );
  const available = roomDoc.totalUnits - occupied;

  return {
    roomId: roomDoc._id,
    name: roomDoc.name,
    roomType: roomDoc.roomType,
    totalUnits: roomDoc.totalUnits,
    occupiedUnits: occupied,
    availableUnits: Math.max(0, available),
    requestedQuantity: quantity,
    isAvailable: available >= quantity,
    maxAdults: roomDoc.maxAdults,
    maxChildren: roomDoc.maxChildren,
    pricePerNight: roomDoc.pricePerNight,
  };
};

export const createCheckoutSessionForHold = async (holdId, userId, currency) => {
  const hold = await BookingModel.findOne({ _id: holdId, user: userId, status: "held" })
    .populate("hotel", "name rooms currency");
  if (!hold) throw new ApiError("Hold not found or already expired", 404);
  if (hold.expiresAt < new Date()) throw new ApiError("Hold has expired, please select rooms again", 410);

  const { default: stripe } = await import("../../utils/stripe.js");
  const { default: UserModel } = await import("../users/user.model.js");

  const user = await UserModel.findById(userId).select("email name");
  const payCurrency = (currency || hold.currency || "EGP").toLowerCase();
  const amount = Math.round(hold.totalPrice * 100);

  const hotel = hold.hotel;

  const lineItems = hold.rooms.map((r) => {
    const roomDoc = hotel.rooms.id(r.room);
    return {
      price_data: {
        currency: payCurrency,
        unit_amount: Math.round(r.pricePerNight * 100),
        product_data: {
          name: `${hotel.name} — ${roomDoc?.name || r.roomType}`,
          description: `${r.quantity} room(s) × ${differenceInDays(hold.checkOut, hold.checkIn)} night(s)`,
        },
      },
      quantity: r.quantity * differenceInDays(hold.checkOut, hold.checkIn),
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user?.email,
    line_items: lineItems,
    success_url: `${process.env.CLIENT_URL}/booking/payment/success?holdId=${hold._id}`,
    cancel_url: `${process.env.CLIENT_URL}/booking/payment/cancel?holdId=${hold._id}`,
    metadata: {
      holdId: hold._id.toString(),
      userId: userId.toString(),
    },
    expires_at: (() => {
      const minExpiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
      const maxExpiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      return Math.min(
        Math.max(Math.floor(hold.expiresAt.getTime() / 1000), minExpiresAt),
        maxExpiresAt
      );
    })(),
  });

  hold.stripeCheckoutSessionId = session.id;
  await hold.save();

  return {
    url: session.url,
    sessionId: session.id,
    amount,
    currency: payCurrency,
    holdId: hold._id,
    expiresAt: hold.expiresAt,
  };
};

export const getHoldStatus = async (holdId, userId) => {
  const hold = await BookingModel.findOne({ _id: holdId, user: userId }).select("status expiresAt totalPrice stripeCheckoutSessionId");
  if (!hold) {
    return { status: "expired" };
  }
  return {
    status: hold.status,
    expiresAt: hold.expiresAt,
    totalPrice: hold.totalPrice,
    stripeCheckoutSessionId: hold.stripeCheckoutSessionId,
  };
};

export const createBooking = async (userId, data) => {
  const hotel = await HotelModel.findById(data.hotel);
  if (!hotel || !hotel.isActive) throw new ApiError("Hotel not found", 404);

  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);

  if (checkIn < new Date()) throw new ApiError("checkIn must be a future date", 400);
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) throw new ApiError("checkOut must be after checkIn", 400);

  // Support both new format (rooms array) and legacy format (room + rooms qty + guests)
  let roomSelections = [];
  if (data.rooms && Array.isArray(data.rooms) && data.rooms.length > 0) {
    // New format: rooms: [{ room, quantity, guests: { adults, children } }]
    roomSelections = data.rooms;
  } else if (data.room && data.rooms && typeof data.rooms === "number" && data.rooms > 0) {
    // Legacy format: room (roomId), rooms (quantity), guests (number of adults)
    const adults = typeof data.guests === "number" ? data.guests : 1;
    roomSelections = [{
      room: data.room,
      quantity: data.rooms,
      guests: { adults, children: data.children || 0 },
      roomType: data.roomType || "double",
      pricePerNight: data.pricePerNight || hotel.averagePricePerNight,
    }];
  } else {
    throw new ApiError("At least one room selection is required", 400);
  }

  let totalPrice = 0;
  const roomsData = [];

  for (const selection of roomSelections) {
    const roomDoc = hotel.rooms.id(selection.room);
    if (!roomDoc || !roomDoc.isActive) {
      throw new ApiError(`Room ${selection.room} not found or inactive`, 404);
    }

    const maxAdultsForSelection = roomDoc.maxAdults * selection.quantity;
    const maxChildrenForSelection = roomDoc.maxChildren * selection.quantity;

    if (selection.guests.adults > maxAdultsForSelection) {
      throw new ApiError(
        `Room "${roomDoc.name}" allows max ${roomDoc.maxAdults} adults per unit (${maxAdultsForSelection} total for ${selection.quantity} unit(s))`,
        400
      );
    }
    if (selection.guests.children > maxChildrenForSelection) {
      throw new ApiError(
        `Room "${roomDoc.name}" allows max ${roomDoc.maxChildren} children per unit (${maxChildrenForSelection} total for ${selection.quantity} unit(s))`,
        400
      );
    }

    totalPrice += roomDoc.pricePerNight * selection.quantity * nights;
    roomsData.push({
      room: roomDoc._id,
      roomType: roomDoc.roomType,
      quantity: selection.quantity,
      guests: selection.guests,
      pricePerNight: roomDoc.pricePerNight,
    });
  }

  const booking = await BookingModel.create({
    user: userId,
    hotel: hotel._id,
    trip: data.trip || null,
    checkIn,
    checkOut,
    rooms: roomsData,
    totalPrice,
    currency: hotel.currency,
    specialRequests: data.specialRequests || null,
    status: "pending",
  });

  return booking.populate([
    { path: "hotel", select: "name city averagePricePerNight stars currency coverImage" },
    { path: "trip", select: "title destination" },
  ]);
};

export const getMyBookings = async (userId, query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find({ user: userId }).populate(
      "hotel",
      "name city averagePricePerNight stars coverImage"
    ),
    query
  )
    .filter()
    .sort()
    .paginate();

  const [bookings, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};

export const getBookingById = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId })
    .populate("hotel")
    .populate("trip", "title destination days");
  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};

export const cancelBooking = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId });
  if (!booking) throw new ApiError("Booking not found", 404);

  if (booking.status === "canceled")
    throw new ApiError("Booking is already canceled", 400);
  if (booking.status === "completed")
    throw new ApiError("Completed bookings cannot be canceled", 400);

  booking.status = "canceled";
  booking.canceledAt = new Date();
  await booking.save();
  return booking;
};

export const adminGetAllBookings = async (query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find()
      .populate("user", "name email")
      .populate("hotel", "name city"),
    query
  )
    .filter()
    .sort()
    .paginate();

  const [bookings, total] = await Promise.all([
    features.query,
    features.countDocuments(),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: features.page,
      limit: features.limit,
      totalPages: Math.ceil(total / features.limit),
    },
  };
};

export const adminUpdateStatus = async (bookingId, status) => {
  const VALID = ["pending", "confirmed", "canceled", "completed", "held"];
  if (!VALID.includes(status))
    throw new ApiError(`status must be one of: ${VALID.join(", ")}`, 400);

  const booking = await BookingModel.findByIdAndUpdate(
    bookingId,
    { status },
    { new: true, runValidators: true }
  );
  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};

export const getBookingStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const calcGrowth = (current, previous) => {
    if (!previous) return 100;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };

  const [
    totalBookings,
    thisMonthBookings,
    lastMonthBookings,
    byStatus,
    revenueStats,
    lastMonthRevenue,
    revenueByMonthRaw,
    bookingTrends,
    topHotels,
  ] = await Promise.all([
    BookingModel.countDocuments(),
    BookingModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    BookingModel.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    BookingModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
    ]),
    BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    BookingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    BookingModel.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          hotels: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          day: {
            $arrayElemAt: [
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              { $subtract: ["$_id", 1] },
            ],
          },
          hotels: 1,
          revenue: 1,
        },
      },
    ]),
    BookingModel.aggregate([
      { $match: { status: { $in: ["confirmed", "completed"] } } },
      {
        $group: {
          _id: "$hotel",
          revenue: { $sum: "$totalPrice" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "hotels",
          localField: "_id",
          foreignField: "_id",
          as: "hotel",
        },
      },
      { $unwind: "$hotel" },
      {
        $project: {
          _id: 0,
          name: "$hotel.name",
          city: "$hotel.city",
          stars: "$hotel.stars",
          coverImage: "$hotel.coverImage",
          revenue: 1,
          bookings: 1,
        },
      },
    ]),
  ]);

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const revenueByMonth = last6Months.map(({ year, month }) => {
    const found = revenueByMonthRaw.find(
      (r) => r._id?.year === year && r._id?.month === month
    );
    const date = new Date(year, month - 1, 1);
    return {
      month: date.toLocaleString("en", { month: "short" }),
      revenue: found?.revenue || 0,
      bookings: found?.bookings || 0,
    };
  });

  const thisMonthRevenue = revenueStats[0]?.total || 0;
  const prevMonthRevenue = lastMonthRevenue[0]?.total || 0;

  return {
    totalBookings,
    bookingsGrowth: calcGrowth(thisMonthBookings, lastMonthBookings),
    totalRevenue: thisMonthRevenue,
    revenueGrowth: calcGrowth(thisMonthRevenue, prevMonthRevenue),
    byStatus,
    revenueByMonth,
    bookingTrends,
    topHotels,
  };
};