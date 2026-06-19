import BookingModel from "./booking.model.js";
import HotelModel from "../hotels/hotel.model.js";
import ApiError from "../../utils/apiError.js";
import APIFeatures from "../../utils/apiFeature.js";

// ─── Create booking ───────────────────────────────────────────────────────────
export const createBooking = async (userId, data) => {
  const hotel = await HotelModel.findById(data.hotel);
  if (!hotel || !hotel.isActive) throw new ApiError("Hotel not found", 404);

  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);

  if (checkIn < new Date())
    throw new ApiError("checkIn must be a future date", 400);

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  if (nights <= 0) throw new ApiError("checkOut must be after checkIn", 400);

  const totalPrice = hotel.averagePricePerNight * nights * (data.rooms || 1);

  const booking = await BookingModel.create({
    user: userId,
    hotel: hotel._id,
    trip: data.trip || null,
    checkIn,
    checkOut,
    guests: data.guests || 1,
    rooms: data.rooms || 1,
    totalPrice,
    currency: hotel.currency,
    specialRequests: data.specialRequests || null,
  });

  return booking.populate([
    {
      path: "hotel",
      select: "name city averagePricePerNight stars currency coverImage",
    },
    { path: "trip", select: "title destination" },
  ]);
};

// ─── Get my bookings ──────────────────────────────────────────────────────────
export const getMyBookings = async (userId, query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find({ user: userId }).populate(
      "hotel",
      "name city averagePricePerNight stars coverImage",
    ),
    query,
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

// ─── Get single booking (owner only) ─────────────────────────────────────────
export const getBookingById = async (bookingId, userId) => {
  const booking = await BookingModel.findOne({ _id: bookingId, user: userId })
    .populate("hotel")
    .populate("trip", "title destination days");

  if (!booking) throw new ApiError("Booking not found", 404);
  return booking;
};

// ─── Cancel booking ───────────────────────────────────────────────────────────
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

// ─── Admin: get all bookings ──────────────────────────────────────────────────
export const adminGetAllBookings = async (query) => {
  const features = new APIFeatures(
    BookingModel,
    BookingModel.find()
      .populate("user", "name email")
      .populate("hotel", "name city"),
    query,
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

// ─── Admin: update booking status ─────────────────────────────────────────────
export const adminUpdateStatus = async (bookingId, status) => {
  const VALID = ["pending", "confirmed", "canceled", "completed"];
  if (!VALID.includes(status))
    throw new ApiError(`status must be one of: ${VALID.join(", ")}`, 400);

  const booking = await BookingModel.findByIdAndUpdate(
    bookingId,
    { status },
    { new: true, runValidators: true },
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
    // Total bookings
    BookingModel.countDocuments(),

    // This month
    BookingModel.countDocuments({ createdAt: { $gte: startOfMonth } }),

    // Last month
    BookingModel.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),

    // By status
    BookingModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Total revenue this month
    BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Last month revenue
    BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "completed"] },
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),

    // Revenue chart - last 6 months raw
    BookingModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Booking trends by day of week
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

    // Top performing hotels by revenue
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

  // بناء الـ 6 شهور كلها حتى لو فاضية
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const revenueByMonth = last6Months.map(({ year, month }) => {
    const found = revenueByMonthRaw.find(
      (r) => r._id?.year === year && r._id?.month === month,
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
