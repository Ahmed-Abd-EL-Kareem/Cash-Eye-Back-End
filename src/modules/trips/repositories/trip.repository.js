import mongoose from "mongoose";
import Trip from "../models/trip.model.js";
import TripVersion from "../models/trip-version.model.js";

class TripRepository {
  // ─────────────────────────────────────────────
  // Core CRUD
  // ─────────────────────────────────────────────

  async create(data) {
    const trip = new Trip(data);
    return trip.save();
  }

  async findById(id, userId = null) {
    const query = { _id: id, deletedAt: null };
    if (userId) query.userId = userId;
    return Trip.findOne(query)
      .populate("destinationIds", "name  city location images")
      .populate("hotelIds", "name stars averagePricePerNight currency location images coverImage city")
      .lean({ virtuals: true });
  }

  async findByIdRaw(id) {
    return Trip.findOne({ _id: id, deletedAt: null });
  }

  /**
   * Caller passes the full update operator object, e.g.:
   *   { $set: { title: "..." } }
   *   { $set: { ... }, $push: { ... } }
   */
  async update(id, userId, data, options = {}) {
    return Trip.findOneAndUpdate(
      { _id: id, userId, deletedAt: null },
      data,
      { new: true, runValidators: true, ...options }
    )
      .populate("destinationIds", "name country city")
      .populate("hotelIds", "name stars averagePricePerNight currency city");
  }

  async softDelete(id, userId) {
    const trip = await Trip.findOne({ _id: id, userId, deletedAt: null });
    if (!trip) return null;
    trip.softDelete();
    return trip.save();
  }

  // ─────────────────────────────────────────────
  // Query / Filtering
  // ─────────────────────────────────────────────

  async findUserTrips(userId, filters = {}, options = {}) {
    const { status, destination, startDate, endDate, tags, travelType, isFavorite, source } = filters;
    const { page = 1, limit = 10, sort = "-createdAt" } = options;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId, deletedAt: null };

    if (status) query.status = status;
    if (source) query.source = source;
    if (travelType) query.travelType = travelType;
    if (isFavorite !== undefined) query.isFavorite = isFavorite;
    if (tags?.length) query.tags = { $in: tags };

    if (destination) {
      query.$or = [
        { "title.en": { $regex: destination, $options: "i" } },
        { "title.ar": { $regex: destination, $options: "i" } },
        { "description.en": { $regex: destination, $options: "i" } },
        { tags: destination.toLowerCase() },
      ];
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate("destinationIds", "name country city images")
        .populate("hotelIds", "name stars averagePricePerNight currency images coverImage city")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Trip.countDocuments(query),
    ]);

    return {
      trips,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    };
  }

  async findPublicTrips(filters = {}, options = {}) {
    const { destination, tags, travelType } = filters;
    const { page = 1, limit = 10, sort = "-createdAt" } = options;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      "permissions.visibility": "public",
      deletedAt: null,
      status: { $in: ["completed", "booked", "active"] },
    };

    if (destination) {
      query.$or = [
        { "title.en": { $regex: destination, $options: "i" } },
        { "title.ar": { $regex: destination, $options: "i" } },
        { tags: destination.toLowerCase() },
      ];
    }
    if (tags?.length) query.tags = { $in: tags };
    if (travelType) query.travelType = travelType;

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .select("-aiMetadata -statusHistory")
        .populate("destinationIds", "name country city images")
        .populate("hotelIds", "name stars averagePricePerNight currency images coverImage city")
        .populate("userId", "name avatar")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Trip.countDocuments(query),
    ]);

    return {
      trips,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findByShareId(shareId) {
    return Trip.findOne({
      "permissions.shareId": shareId,
      "permissions.visibility": { $in: ["public", "collaborative"] },
      deletedAt: null,
    })
      .populate("destinationIds", "name  city images location")
      .populate("hotelIds", "name stars averagePricePerNight currency location images coverImage city")
      .lean({ virtuals: true });
  }

  // ─────────────────────────────────────────────
  // Geospatial
  // ─────────────────────────────────────────────

  async findNearby(coordinates, maxDistanceKm = 50) {
    return Trip.find({
      centroid: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: maxDistanceKm * 1000,
        },
      },
      "permissions.visibility": "public",
      deletedAt: null,
    })
      .limit(20)
      .lean({ virtuals: true });
  }

  // ─────────────────────────────────────────────
  // Versioning
  // ─────────────────────────────────────────────

  async createVersion(tripId, data) {
    return TripVersion.create(data);
  }

  async getVersions(tripId, limit = 10) {
    return TripVersion.find({ tripId })
      .sort({ version: -1 })
      .limit(limit)
      .lean();
  }

  async getVersion(tripId, version) {
    return TripVersion.findOne({ tripId, version }).lean();
  }

  // ─────────────────────────────────────────────
  // Aggregations
  // ─────────────────────────────────────────────

  async getUserTripStats(userId) {
    return Trip.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), deletedAt: null } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalBudget: { $sum: "$budget.total" },
          totalDays: { $sum: "$durationDays" },
          avgBudget: { $avg: "$budget.total" },
          byStatus: { $push: "$status" },
          byTravelType: { $push: "$travelType" },
        },
      },
    ]);
  }

  async findTemplates(tags = []) {
    const query = { isTemplate: true, deletedAt: null };
    if (tags.length) query.templateTags = { $in: tags };
    return Trip.find(query)
      .select("title description templateTags coverImage travelType durationDays budget")
      .lean();
  }
}

export default new TripRepository();