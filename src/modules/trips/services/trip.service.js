// import crypto from "crypto";
// import { t } from "../i18n/index.js";
// import tripRepository from "../repositories/trip.repository.js";
// import TripVersion from "../models/trip-version.model.js";
// import tripEvents from "../events/trip.events.js";
// import {
//   validateDestinationsExist,
//   validateHotelsExist,
//   normalizeDays,
//   buildCentroid,
// } from "../utils/trip.utils.js";

// class TripService {
//   // ─────────────────────────────────────────────
//   // Create Trip
//   // ─────────────────────────────────────────────

//   async createTrip(userId, dto, lang = "en") {
//     // 1) Validate references exist in external services
//     await this._validateExternalRefs(dto.destinationIds, dto.hotelIds, lang);

//     // 2) Validate itinerary days match date range
//     if (dto.itinerary?.length) {
//       const expectedDays = this._computeExpectedDays(dto.startDate, dto.endDate);
//       if (dto.itinerary.length > expectedDays) {
//         throw this._error(
//           400,
//           t("itinerary_days_mismatch", lang, {
//             actual: dto.itinerary.length,
//             expected: expectedDays,
//           })
//         );
//       }
//     }

//     // 3) Build centroid from destinations (for geo queries)
//     const centroid = await buildCentroid(dto.destinationIds);

//     const trip = await tripRepository.create({
//       ...dto,
//       userId,
//       source: "manual",
//       status: "draft",
//       centroid,
//       itinerary: normalizeDays(dto.itinerary || []),
//     });

//     // 4) Save initial version snapshot
//     await this._saveVersion(trip, userId, "user");

//     // 5) Emit event
//     tripEvents.emitTripCreated(trip, userId);

//     return trip;
//   }

//   // ─────────────────────────────────────────────
//   // Get User Trips
//   // ─────────────────────────────────────────────

//   async getUserTrips(userId, filters, options) {
//     // Normalize tags from string → array
//     if (filters.tags && typeof filters.tags === "string") {
//       filters.tags = filters.tags.split(",").map((tag) => tag.trim());
//     }
//     return tripRepository.findUserTrips(userId, filters, options);
//   }

//   // ─────────────────────────────────────────────
//   // Get Single Trip
//   // ─────────────────────────────────────────────

//   async getTripById(tripId, userId, lang = "en") {
//     const trip = await tripRepository.findById(tripId, userId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     return trip;
//   }

//   async getTripByShareId(shareId, lang = "en") {
//     const trip = await tripRepository.findByShareId(shareId);
//     if (!trip) throw this._error(404, t("trip_not_public", lang));
//     return trip;
//   }

//   // ─────────────────────────────────────────────
//   // Update Trip
//   // ─────────────────────────────────────────────

//   async updateTrip(tripId, userId, dto, lang = "en") {
//     const existing = await tripRepository.findByIdRaw(tripId);
//     if (!existing) throw this._error(404, t("trip_not_found", lang));
//     if (existing.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     // Validate refs if being updated
//     if (dto.destinationIds || dto.hotelIds) {
//       await this._validateExternalRefs(
//         dto.destinationIds || existing.destinationIds,
//         dto.hotelIds || existing.hotelIds,
//         lang
//       );
//     }

//     // Track which fields changed
//     const changedFields = Object.keys(dto);

//     // Save version BEFORE update if itinerary is changing
//     if (dto.itinerary) {
//       await this._saveVersion(existing, userId, "user", "Pre-edit snapshot");
//       dto.itinerary = normalizeDays(dto.itinerary);
//     }

//     // Auto-advance status: draft → customized if user edits
//     if (existing.status === "draft" || existing.status === "generated") {
//       const statusHistory = existing.statusHistory || [];
//       dto.status = "customized";
//       dto.statusHistory = [
//         ...statusHistory,
//         {
//           from: existing.status,
//           to: "customized",
//           changedBy: userId,
//           reason: "User edit",
//         },
//       ];
//     }

//     // Increment version number on every update
//     dto.version = (existing.version || 1) + 1;

//     const updated = await tripRepository.update(tripId, userId, { $set: dto });
//     tripEvents.emitTripUpdated(updated, userId, changedFields);

//     return updated;
//   }

//   // ─────────────────────────────────────────────
//   // Delete Trip (soft)
//   // ─────────────────────────────────────────────

//   async deleteTrip(tripId, userId, lang = "en") {
//     const trip = await tripRepository.softDelete(tripId, userId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     tripEvents.emitTripDeleted(tripId, userId);
//     return { message: "Trip deleted successfully" };
//   }

//   // ─────────────────────────────────────────────
//   // Save AI Generated Trip
//   // ─────────────────────────────────────────────

//   async saveAITrip(userId, dto, lang = "en") {
//     const { title, days, hotels, destinations, aiMetadata, startDate, endDate, ...rest } = dto;

//     // 1) Validate external refs
//     await this._validateExternalRefs(destinations, hotels, lang);

//     // 2) Validate & normalize itinerary
//     const normalizedDays = normalizeDays(days);

//     // 3) Compute dates from itinerary if not provided
//     const resolvedStart = startDate ? new Date(startDate) : new Date();
//     const resolvedEnd = endDate
//       ? new Date(endDate)
//       : new Date(resolvedStart.getTime() + (days.length - 1) * 86400000);

//     // 4) Auto-assign dates to each day if missing
//     const itineraryWithDates = normalizedDays.map((day, idx) => ({
//       ...day,
//       date: day.date || new Date(resolvedStart.getTime() + idx * 86400000),
//     }));

//     // 5) Compute budget from activities if not provided
//     const computedBudget = this._aggregateBudget(itineraryWithDates, rest.budget);

//     // 6) Build centroid
//     const centroid = await buildCentroid(destinations);

//     // 7) Create Trip
//     const trip = await tripRepository.create({
//       title,
//       userId,
//       description: rest.description,
//       destinationIds: destinations,
//       hotelIds: hotels || [],
//       startDate: resolvedStart,
//       endDate: resolvedEnd,
//       durationDays: days.length,
//       travelersCount: rest.travelersCount || 1,
//       travelType: rest.travelType || "solo",
//       budget: computedBudget,
//       itinerary: itineraryWithDates,
//       source: "ai",
//       status: "generated",
//       tags: rest.tags || [],
//       centroid,
//       aiMetadata: {
//         ...aiMetadata,
//         generatedAt: new Date(),
//       },
//     });

//     // 8) Save version snapshot
//     await this._saveVersion(trip, userId, "ai", "Initial AI generation");

//     // 9) Emit event
//     tripEvents.emitAITripGenerated(trip, aiMetadata);

//     return trip;
//   }

//   // ─────────────────────────────────────────────
//   // Status Transition
//   // ─────────────────────────────────────────────

//   async changeStatus(tripId, userId, newStatus, reason = "", lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     trip.transitionTo(newStatus, userId, reason);
//     await trip.save();

//     tripEvents.emitTripStatusChanged(trip, trip.statusHistory.at(-1)?.from, newStatus, userId);

//     if (newStatus === "booked") tripEvents.emitTripBooked(trip);
//     if (newStatus === "completed") tripEvents.emitTripCompleted(trip);

//     return trip;
//   }

//   // ─────────────────────────────────────────────
//   // Share / Permissions
//   // ─────────────────────────────────────────────

//   async generateShareLink(tripId, userId, lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     const shareId = crypto.randomBytes(16).toString("hex");
//     await tripRepository.update(tripId, userId, {
//       $set: {
//         "permissions.shareId": shareId,
//         "permissions.visibility": "public",
//       },
//     });

//     return { shareId, shareUrl: `/public/trips/${shareId}` };
//   }

//   async revokeShareLink(tripId, userId, lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     return tripRepository.update(tripId, userId, {
//       $set: {
//         "permissions.shareId": null,
//         "permissions.visibility": "private",
//       },
//     });
//   }

//   async addCollaborator(tripId, ownerId, collaboratorUserId, role = "viewer", lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== ownerId) throw this._error(403, t("forbidden", lang));

//     const alreadyExists = trip.permissions?.collaborators?.some(
//       (c) => c.userId.toString() === collaboratorUserId
//     );
//     if (alreadyExists) throw this._error(409, t("collaborator_exists", lang));

//     return tripRepository.update(tripId, ownerId, {
//       $set: { "permissions.visibility": "collaborative" },
//       $push: {
//         "permissions.collaborators": {
//           userId: collaboratorUserId,
//           role,
//           addedAt: new Date(),
//         },
//       },
//     });
//   }

//   // ─────────────────────────────────────────────
//   // Versioning
//   // ─────────────────────────────────────────────

//   async getTripVersions(tripId, userId, lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));
//     return tripRepository.getVersions(tripId);
//   }

//   async restoreVersion(tripId, userId, versionNumber, lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     const version = await tripRepository.getVersion(tripId, versionNumber);
//     if (!version) throw this._error(404, t("version_not_found", lang));

//     // Save current as new version before restoring
//     await this._saveVersion(trip, userId, "user", `Pre-restore backup (v${trip.version})`);

//     return tripRepository.update(tripId, userId, {
//       $set: {
//         itinerary: version.itinerarySnapshot,
//         version: trip.version + 1,
//       },
//     });
//   }

//   // ─────────────────────────────────────────────
//   // Duplicate / Template
//   // ─────────────────────────────────────────────

//   async duplicateTrip(tripId, userId, lang = "en") {
//     const original = await tripRepository.findById(tripId, userId);
//     if (!original) throw this._error(404, t("trip_not_found", lang));

//     const { _id, createdAt, updatedAt, currentVersionId, permissions, ...rest } = original;

//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     const defaultEnd = new Date(tomorrow);
//     defaultEnd.setDate(defaultEnd.getDate() + (original.durationDays || 1) - 1);

//     const duplicate = await tripRepository.create({
//       ...rest,
//       userId,
//       title: {
//         en: `${original.title?.en || ""} (Copy)`,
//         ar: `${original.title?.ar || ""} (نسخة)`,
//       },
//       status: "draft",
//       source: "manual",
//       startDate: tomorrow,
//       endDate: defaultEnd,
//       templateId: tripId,
//       permissions: { visibility: "private" },
//       version: 1,
//     });

//     await this._saveVersion(duplicate, userId, "user", "Duplicated from original");
//     return duplicate;
//   }

//   // ─────────────────────────────────────────────
//   // Favorite
//   // ─────────────────────────────────────────────

//   async toggleFavorite(tripId, userId, lang = "en") {
//     const trip = await tripRepository.findByIdRaw(tripId);
//     if (!trip) throw this._error(404, t("trip_not_found", lang));
//     if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

//     const newFav = !trip.isFavorite;
//     return tripRepository.update(tripId, userId, {
//       $set: {
//         isFavorite: newFav,
//         favoritedAt: newFav ? new Date() : null,
//       },
//     });
//   }

//   // ─────────────────────────────────────────────
//   // Public Trips
//   // ─────────────────────────────────────────────

//   async getPublicTrips(filters, options) {
//     return tripRepository.findPublicTrips(filters, options);
//   }

//   // ─────────────────────────────────────────────
//   // Nearby Trips (Geospatial)
//   // ─────────────────────────────────────────────

//   async getNearbyTrips(lat, lng, radiusKm = 50) {
//     return tripRepository.findNearby([lng, lat], radiusKm);
//   }

//   // ─────────────────────────────────────────────
//   // Stats
//   // ─────────────────────────────────────────────

//   async getUserStats(userId) {
//     return tripRepository.getUserTripStats(userId);
//   }

//   // ─────────────────────────────────────────────
//   // Private Helpers
//   // ─────────────────────────────────────────────

//   /**
//    * Check if a user can edit a trip (owner OR editor collaborator).
//    */
//   _canEditTrip(trip, userId) {
//     if (trip.userId.toString() === userId) return true;
//     const collaborator = trip.permissions?.collaborators?.find(
//       (c) => c.userId.toString() === userId && c.role === "editor"
//     );
//     return !!collaborator;
//   }

//   async _validateExternalRefs(destinationIds = [], hotelIds = [], lang = "en") {
//     const errors = [];

//     if (destinationIds.length) {
//       const invalidDest = await validateDestinationsExist(destinationIds);
//       if (invalidDest.length) {
//         errors.push(t("destinations_not_found", lang, { ids: invalidDest.join(", ") }));
//       }
//     }

//     if (hotelIds.length) {
//       const invalidHotels = await validateHotelsExist(hotelIds);
//       if (invalidHotels.length) {
//         errors.push(t("hotels_not_found", lang, { ids: invalidHotels.join(", ") }));
//       }
//     }

//     if (errors.length) throw this._error(400, errors.join(". "));
//   }

//   async _saveVersion(trip, userId, source, summary = "") {
//     try {
//       const version = await TripVersion.create({
//         tripId: trip._id,
//         version: trip.version || 1,
//         itinerarySnapshot: trip.itinerary,
//         changesSummary: summary,
//         createdBy: userId,
//         source,
//         aiMetadata: trip.aiMetadata,
//       });

//       await trip.updateOne({ currentVersionId: version._id });
//       return version;
//     } catch (err) {
//       // Non-critical: don't fail the main operation
//       console.error("[TripService] Failed to save version snapshot:", err.message);
//     }
//   }

//   _computeExpectedDays(startDate, endDate) {
//     const diff = new Date(endDate) - new Date(startDate);
//     return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
//   }

//   _aggregateBudget(days, existingBudget) {
//     if (existingBudget?.total) return existingBudget;

//     let accommodation = 0;
//     let transportation = 0;
//     let activities = 0;

//     for (const day of days) {
//       accommodation += day.dailyCost?.amount || 0;
//       for (const act of day.activities || []) {
//         activities += act.estimatedCost?.amount || 0;
//         transportation += act.transportation?.cost?.amount || 0;
//       }
//     }

//     const total = accommodation + transportation + activities;
//     return {
//       total,
//       currency: "USD",
//       breakdown: { accommodation, transportation, activities, food: 0, other: 0 },
//     };
//   }

//   _error(status, message) {
//     const err = new Error(message);
//     err.statusCode = status;
//     return err;
//   }
// }

// export default new TripService();
import crypto from "crypto";
import { t } from "../i18n/index.js";
import tripRepository from "../repositories/trip.repository.js";
import TripVersion from "../models/trip-version.model.js";
import tripEvents from "../events/trip.events.js";
import {
  validateDestinationsExist,
  validateHotelsExist,
  normalizeDays,
  buildCentroid,
} from "../utils/trip.utils.js";

class TripService {
  // ─────────────────────────────────────────────
  // Create Trip
  // ─────────────────────────────────────────────

  async createTrip(userId, dto, lang = "en") {
    // 1) Validate references exist in external services
    await this._validateExternalRefs(dto.destinationIds, dto.hotelIds, lang);

    // 2) Validate itinerary days match date range
    if (dto.itinerary?.length) {
      const expectedDays = this._computeExpectedDays(dto.startDate, dto.endDate);
      if (dto.itinerary.length > expectedDays) {
        throw this._error(
          400,
          t("itinerary_days_mismatch", lang, {
            actual: dto.itinerary.length,
            expected: expectedDays,
          })
        );
      }
    }

    // 3) Build centroid from destinations (for geo queries)
    const centroid = await buildCentroid(dto.destinationIds);

    const trip = await tripRepository.create({
      ...dto,
      userId,
      source: "manual",
      status: "draft",
      centroid,
      itinerary: normalizeDays(dto.itinerary || []),
    });

    // 4) Save initial version snapshot
    await this._saveVersion(trip, userId, "user");

    // 5) Emit event
    tripEvents.emitTripCreated(trip, userId);

    return trip;
  }

  // ─────────────────────────────────────────────
  // Get User Trips
  // ─────────────────────────────────────────────

  async getUserTrips(userId, filters, options) {
    // Normalize tags from string → array
    if (filters.tags && typeof filters.tags === "string") {
      filters.tags = filters.tags.split(",").map((tag) => tag.trim());
    }
    return tripRepository.findUserTrips(userId, filters, options);
  }

  // ─────────────────────────────────────────────
  // Get Single Trip
  // ─────────────────────────────────────────────

  async getTripById(tripId, userId, lang = "en") {
    const trip = await tripRepository.findById(tripId, userId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    return trip;
  }

  async getTripByShareId(shareId, lang = "en") {
    const trip = await tripRepository.findByShareId(shareId);
    if (!trip) throw this._error(404, t("trip_not_public", lang));
    return trip;
  }

  // ─────────────────────────────────────────────
  // Update Trip
  // ─────────────────────────────────────────────

  async updateTrip(tripId, userId, dto, lang = "en") {
    const existing = await tripRepository.findByIdRaw(tripId);
    if (!existing) throw this._error(404, t("trip_not_found", lang));
    if (existing.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    // Validate refs if being updated
    if (dto.destinationIds || dto.hotelIds) {
      await this._validateExternalRefs(
        dto.destinationIds || existing.destinationIds,
        dto.hotelIds || existing.hotelIds,
        lang
      );
    }

    // Track which fields changed
    const changedFields = Object.keys(dto);

    // Save version BEFORE update if itinerary is changing
    if (dto.itinerary) {
      await this._saveVersion(existing, userId, "user", "Pre-edit snapshot");
      dto.itinerary = normalizeDays(dto.itinerary);
    }

    // Auto-advance status: draft → customized if user edits
    if (existing.status === "draft" || existing.status === "generated") {
      const statusHistory = existing.statusHistory || [];
      dto.status = "customized";
      dto.statusHistory = [
        ...statusHistory,
        {
          from: existing.status,
          to: "customized",
          changedBy: userId,
          reason: "User edit",
        },
      ];
    }

    // Increment version number on every update
    dto.version = (existing.version || 1) + 1;

    const updated = await tripRepository.update(tripId, userId, { $set: dto });
    tripEvents.emitTripUpdated(updated, userId, changedFields);

    return updated;
  }

  // ─────────────────────────────────────────────
  // Delete Trip (soft)
  // ─────────────────────────────────────────────

  async deleteTrip(tripId, userId, lang = "en") {
    const trip = await tripRepository.softDelete(tripId, userId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    tripEvents.emitTripDeleted(tripId, userId);
    return { message: "Trip deleted successfully" };
  }

  // ─────────────────────────────────────────────
  // Save AI Generated Trip
  // ─────────────────────────────────────────────

  async saveAITrip(userId, dto, lang = "en") {
    const { title, days, hotels, destinations, aiMetadata, startDate, endDate, ...rest } = dto;

    // 1) Validate external refs
    await this._validateExternalRefs(destinations, hotels, lang);

    // 2) Validate & normalize itinerary
    const normalizedDays = normalizeDays(days);

    // 3) Compute dates from itinerary if not provided
    const resolvedStart = startDate ? new Date(startDate) : new Date();
    const resolvedEnd = endDate
      ? new Date(endDate)
      : new Date(resolvedStart.getTime() + (days.length - 1) * 86400000);

    // 4) Auto-assign dates to each day if missing
    const itineraryWithDates = normalizedDays.map((day, idx) => ({
      ...day,
      date: day.date || new Date(resolvedStart.getTime() + idx * 86400000),
    }));

    // 5) Compute budget from activities if not provided
    const computedBudget = this._aggregateBudget(itineraryWithDates, rest.budget);

    // 6) Build centroid
    const centroid = await buildCentroid(destinations);

    // 7) Create Trip
    const trip = await tripRepository.create({
      title,
      userId,
      description: rest.description,
      destinationIds: destinations,
      hotelIds: hotels || [],
      startDate: resolvedStart,
      endDate: resolvedEnd,
      durationDays: days.length,
      travelersCount: rest.travelersCount || 1,
      travelType: rest.travelType || "solo",
      budget: computedBudget,
      itinerary: itineraryWithDates,
      source: "ai",
      status: "generated",
      tags: rest.tags || [],
      centroid,
      aiMetadata: {
        ...aiMetadata,
        generatedAt: new Date(),
      },
    });

    // 8) Save version snapshot
    await this._saveVersion(trip, userId, "ai", "Initial AI generation");

    // 9) Emit event
    tripEvents.emitAITripGenerated(trip, aiMetadata);

    return trip;
  }

  // ─────────────────────────────────────────────
  // Status Transition
  // ─────────────────────────────────────────────

  async changeStatus(tripId, userId, newStatus, reason = "", lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    trip.transitionTo(newStatus, userId, reason);
    await trip.save();

    tripEvents.emitTripStatusChanged(trip, trip.statusHistory.at(-1)?.from, newStatus, userId);

    if (newStatus === "booked") tripEvents.emitTripBooked(trip);
    if (newStatus === "completed") tripEvents.emitTripCompleted(trip);

    return trip;
  }

  // ─────────────────────────────────────────────
  // Share / Permissions
  // ─────────────────────────────────────────────

  async generateShareLink(tripId, userId, lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    const shareId = crypto.randomBytes(16).toString("hex");
    await tripRepository.update(tripId, userId, {
      $set: {
        "permissions.shareId": shareId,
        "permissions.visibility": "public",
      },
    });

    return { shareId, shareUrl: `/public/trips/${shareId}` };
  }

  async revokeShareLink(tripId, userId, lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    return tripRepository.update(tripId, userId, {
      $set: {
        "permissions.shareId": null,
        "permissions.visibility": "private",
      },
    });
  }

  async addCollaborator(tripId, ownerId, collaboratorUserId, role = "viewer", lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== ownerId) throw this._error(403, t("forbidden", lang));

    const alreadyExists = trip.permissions?.collaborators?.some(
      (c) => c.userId.toString() === collaboratorUserId
    );
    if (alreadyExists) throw this._error(409, t("collaborator_exists", lang));

    return tripRepository.update(tripId, ownerId, {
      $set: { "permissions.visibility": "collaborative" },
      $push: {
        "permissions.collaborators": {
          userId: collaboratorUserId,
          role,
          addedAt: new Date(),
        },
      },
    });
  }

  // ─────────────────────────────────────────────
  // Versioning
  // ─────────────────────────────────────────────

  async getTripVersions(tripId, userId, lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));
    return tripRepository.getVersions(tripId);
  }

  async restoreVersion(tripId, userId, versionNumber, lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    const version = await tripRepository.getVersion(tripId, versionNumber);
    if (!version) throw this._error(404, t("version_not_found", lang));

    // Save current as new version before restoring
    await this._saveVersion(trip, userId, "user", `Pre-restore backup (v${trip.version})`);

    return tripRepository.update(tripId, userId, {
      $set: {
        itinerary: version.itinerarySnapshot,
        version: trip.version + 1,
      },
    });
  }

  // ─────────────────────────────────────────────
  // Duplicate / Template
  // ─────────────────────────────────────────────

  async duplicateTrip(tripId, userId, lang = "en") {
    const original = await tripRepository.findById(tripId, userId);
    if (!original) throw this._error(404, t("trip_not_found", lang));

    const { _id, createdAt, updatedAt, currentVersionId, permissions, ...rest } = original;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultEnd = new Date(tomorrow);
    defaultEnd.setDate(defaultEnd.getDate() + (original.durationDays || 1) - 1);

    // ✅ استخرج IDs بس في حالة الـ populate رجع objects
    const hotelIds = original.hotelIds?.map((h) => h._id || h) || [];
    const destinationIds = original.destinationIds?.map((d) => d._id || d) || [];

    const duplicate = await tripRepository.create({
      ...rest,
      userId,
      hotelIds,
      destinationIds,
      title: {
        en: `${original.title?.en || ""} (Copy)`,
        ar: `${original.title?.ar || ""} (نسخة)`,
      },
      status: "draft",
      source: "manual",
      startDate: tomorrow,
      endDate: defaultEnd,
      templateId: tripId,
      permissions: { visibility: "private" },
      version: 1,
    });

    await this._saveVersion(duplicate, userId, "user", "Duplicated from original");
    return duplicate;
  }

  // ─────────────────────────────────────────────
  // Favorite
  // ─────────────────────────────────────────────

  async toggleFavorite(tripId, userId, lang = "en") {
    const trip = await tripRepository.findByIdRaw(tripId);
    if (!trip) throw this._error(404, t("trip_not_found", lang));
    if (trip.userId.toString() !== userId) throw this._error(403, t("forbidden", lang));

    const newFav = !trip.isFavorite;
    return tripRepository.update(tripId, userId, {
      $set: {
        isFavorite: newFav,
        favoritedAt: newFav ? new Date() : null,
      },
    });
  }

  // ─────────────────────────────────────────────
  // Public Trips
  // ─────────────────────────────────────────────

  async getPublicTrips(filters, options) {
    return tripRepository.findPublicTrips(filters, options);
  }

  // ─────────────────────────────────────────────
  // Nearby Trips (Geospatial)
  // ─────────────────────────────────────────────

  async getNearbyTrips(lat, lng, radiusKm = 50) {
    return tripRepository.findNearby([lng, lat], radiusKm);
  }

  // ─────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────

  async getUserStats(userId) {
    return tripRepository.getUserTripStats(userId);
  }

  // ─────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────

  /**
   * Check if a user can edit a trip (owner OR editor collaborator).
   */
  _canEditTrip(trip, userId) {
    if (trip.userId.toString() === userId) return true;
    const collaborator = trip.permissions?.collaborators?.find(
      (c) => c.userId.toString() === userId && c.role === "editor"
    );
    return !!collaborator;
  }

  async _validateExternalRefs(destinationIds = [], hotelIds = [], lang = "en") {
    const errors = [];

    if (destinationIds.length) {
      const invalidDest = await validateDestinationsExist(destinationIds);
      if (invalidDest.length) {
        errors.push(t("destinations_not_found", lang, { ids: invalidDest.join(", ") }));
      }
    }

    if (hotelIds.length) {
      const invalidHotels = await validateHotelsExist(hotelIds);
      if (invalidHotels.length) {
        errors.push(t("hotels_not_found", lang, { ids: invalidHotels.join(", ") }));
      }
    }

    if (errors.length) throw this._error(400, errors.join(". "));
  }

  async _saveVersion(trip, userId, source, summary = "") {
    try {
      const version = await TripVersion.create({
        tripId: trip._id,
        version: trip.version || 1,
        itinerarySnapshot: trip.itinerary,
        changesSummary: summary,
        createdBy: userId,
        source,
        aiMetadata: trip.aiMetadata,
      });

      await trip.updateOne({ currentVersionId: version._id });
      return version;
    } catch (err) {
      // Non-critical: don't fail the main operation
      console.error("[TripService] Failed to save version snapshot:", err.message);
    }
  }

  _computeExpectedDays(startDate, endDate) {
    const diff = new Date(endDate) - new Date(startDate);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  _aggregateBudget(days, existingBudget) {
    if (existingBudget?.total) return existingBudget;

    let accommodation = 0;
    let transportation = 0;
    let activities = 0;

    for (const day of days) {
      accommodation += day.dailyCost?.amount || 0;
      for (const act of day.activities || []) {
        activities += act.estimatedCost?.amount || 0;
        transportation += act.transportation?.cost?.amount || 0;
      }
    }

    const total = accommodation + transportation + activities;
    return {
      total,
      currency: "USD",
      breakdown: { accommodation, transportation, activities, food: 0, other: 0 },
    };
  }

  _error(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
  }
}

export default new TripService();