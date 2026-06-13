import tripService from "../services/trip.service.js";
import Trip from "../models/trip.model.js";
import asyncHandler from "../../../utils/asyncHandler.js"
// ─────────────────────────────────────────────

const respond = (res, data, status = 200) => res.status(status).json(data);

// const asyncHandler = (fn) => (req, res, next) =>
//   Promise.resolve(fn(req, res, next)).catch(next);

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

export const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.user.id, req.body, req.lang);
  respond(res, { success: true, message: req.t("success"), data: trip }, 201);
});

export const getUserTrips = asyncHandler(async (req, res) => {
  const { page, limit, sort, ...filters } = req.query;
  const result = await tripService.getUserTrips(req.user.id, filters, { page, limit, sort });
  respond(res, { success: true, ...result });
});

export const getTripById = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripById(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, data: trip });
});

export const updateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.id, req.user.id, req.body, req.lang);
  respond(res, { success: true, message: req.t("success"), data: trip });
});

export const deleteTrip = asyncHandler(async (req, res) => {
  await tripService.deleteTrip(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, message: req.t("trip_deleted") });
});

// ─────────────────────────────────────────────
// AI Save
// ─────────────────────────────────────────────

export const saveAITrip = asyncHandler(async (req, res) => {
  const trip = await tripService.saveAITrip(req.user.id, req.body, req.lang);
  respond(res, { success: true, message: req.t("success"), data: trip }, 201);
});

// ─────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────

export const changeStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const trip = await tripService.changeStatus(req.params.id, req.user.id, status, reason, req.lang);
  respond(res, { success: true, message: req.t("success"), data: trip });
});

// ─────────────────────────────────────────────
// Share / Public
// ─────────────────────────────────────────────

export const generateShareLink = asyncHandler(async (req, res) => {
  const result = await tripService.generateShareLink(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, data: result });
});

export const revokeShareLink = asyncHandler(async (req, res) => {
  await tripService.revokeShareLink(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, message: req.t("trip_share_revoked") });
});

export const getPublicTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripByShareId(req.params.shareId, req.lang);
  respond(res, { success: true, data: trip });
});

export const getPublicTrips = asyncHandler(async (req, res) => {
  const { page, limit, sort, ...filters } = req.query;
  const result = await tripService.getPublicTrips(filters, { page, limit, sort });
  respond(res, { success: true, ...result });
});

export const addCollaborator = asyncHandler(async (req, res) => {
  const trip = await tripService.addCollaborator(
    req.params.id,
    req.user.id,
    req.body.userId,
    req.body.role,
    req.lang
  );
  respond(res, { success: true, message: req.t("success"), data: trip });
});

// ─────────────────────────────────────────────
// Versioning
// ─────────────────────────────────────────────

export const getTripVersions = asyncHandler(async (req, res) => {
  const versions = await tripService.getTripVersions(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, data: versions });
});

export const restoreVersion = asyncHandler(async (req, res) => {
  const trip = await tripService.restoreVersion(
    req.params.id,
    req.user.id,
    Number(req.params.version),
    req.lang
  );
  respond(res, { success: true, message: req.t("success"), data: trip });
});

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────

export const duplicateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.duplicateTrip(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, message: req.t("success"), data: trip }, 201);
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const trip = await tripService.toggleFavorite(req.params.id, req.user.id, req.lang);
  respond(res, { success: true, data: trip });
});

export const getNearbyTrips = asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) {
    return respond(res, { success: false, message: req.t("lat_lng_required") }, 400);
  }
  const trips = await tripService.getNearbyTrips(
    parseFloat(lat),
    parseFloat(lng),
    radius ? parseFloat(radius) : 50
  );
  respond(res, { success: true, data: trips });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await tripService.getUserStats(req.user.id);
  respond(res, { success: true, data: stats[0] || {} });
});

export const getTemplates = asyncHandler(async (req, res) => {
  const tags = req.query.tags ? req.query.tags.split(",") : [];
  const templates = await Trip.findTemplates(tags);
  respond(res, { success: true, data: templates });
});
