export default {
  // ── General ───────────────────────────────────
  success: "Operation completed successfully",
  internal_error: "Internal server error",
  not_found: "Resource not found",
  forbidden: "You do not have permission to access this resource",
  unauthorized: "Authentication required",
  token_expired: "Session expired, please log in again",
  invalid_token: "Invalid authentication token",
  validation_failed: "Validation failed",
  duplicate_value: "Duplicate value for field: {{field}}",
  invalid_id: "Invalid identifier: {{value}}",
  too_many_requests: "Too many requests, please try again later",
  ai_save_limit: "AI trip save limit reached. Please wait before saving more trips",
  write_limit: "Too many write operations. Please slow down",
  route_not_found: "Route {{method}} {{url}} not found",

  // ── Trip ──────────────────────────────────────
  trip_not_found: "Trip not found",
  trip_deleted: "Trip deleted successfully",
  trip_share_revoked: "Share link revoked successfully",
  trip_not_public: "Trip not found or not publicly accessible",
  collaborator_exists: "This user is already a collaborator",
  invalid_transition: "Cannot transition from {{from}} to {{to}}",

  // ── Validation Messages ────────────────────────
  "string.min": "{{field}} must be at least {{limit}} characters",
  "string.max": "{{field}} must not exceed {{limit}} characters",
  "string.pattern.base": "{{field}} format is invalid",
  "any.required": "{{field}} is required",
  "array.min": "{{field}} must contain at least one item",
  "date.greater": "{{field}} date is invalid",
  "number.min": "{{field}} must be greater than or equal to {{limit}}",
  "number.max": "{{field}} must be less than or equal to {{limit}}",

  // ── Validation Field Names ─────────────────────
  fields: {
    title: "Title",
    description: "Description",
    startDate: "Start date",
    endDate: "End date",
    destinationIds: "Destinations",
    hotelIds: "Hotels",
    travelersCount: "Travelers count",
    travelType: "Travel type",
    budget: "Budget",
    itinerary: "Itinerary",
    days: "Days",
    activities: "Activities",
    time: "Time",
    status: "Status",
    visibility: "Visibility",
    tags: "Tags",
  },

  // ── Status Labels ──────────────────────────────
  status: {
    draft: "Draft",
    generated: "Generated",
    customized: "Customized",
    booked: "Booked",
    active: "Active",
    completed: "Completed",
    archived: "Archived",
    cancelled: "Cancelled",
  },

  // ── Travel Types ───────────────────────────────
  travelType: {
    solo: "Solo",
    couple: "Couple",
    family: "Family",
    group: "Group",
    business: "Business",
  },

  // ── External Services ──────────────────────────
  destinations_not_found: "Destinations not found: {{ids}}",
  hotels_not_found: "Hotels not found: {{ids}}",
  itinerary_days_mismatch:
    "Itinerary has {{actual}} day(s) but trip duration is only {{expected}} day(s)",

  // ── Versioning ────────────────────────────────
  version_not_found: "Version not found",

  // ── Share ─────────────────────────────────────
  share_url: "Share URL",
  lat_lng_required: "lat and lng query params are required",
};
