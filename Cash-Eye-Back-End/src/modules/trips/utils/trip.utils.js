import Destination from "../../destinations/destination.model.js";
import Hotel from "../../hotels/hotel.model.js"

// ─────────────────────────────────────────────
// External Reference Validators
// ─────────────────────────────────────────────

/**
 * Returns the IDs that do NOT exist in the Destination collection.
 * @param {string[]} ids
 * @returns {Promise<string[]>} invalid IDs
 */
export async function validateDestinationsExist(ids = []) {
  if (!ids.length) return [];
  const found = await Destination.find({ _id: { $in: ids } }).select("_id").lean();
  const foundIds = found.map((d) => d._id.toString());
  return ids.filter((id) => !foundIds.includes(id.toString()));
}

/**
 * Returns the IDs that do NOT exist in the Hotel collection.
 * @param {string[]} ids
 * @returns {Promise<string[]>} invalid IDs
 */
export async function validateHotelsExist(ids = []) {
  if (!ids.length) return [];
  const found = await Hotel.find({ _id: { $in: ids } }).select("_id").lean();
  const foundIds = found.map((h) => h._id.toString());
  return ids.filter((id) => !foundIds.includes(id.toString()));
}

// ─────────────────────────────────────────────
// Itinerary Helpers
// ─────────────────────────────────────────────

/**
 * Ensure every day has an `order` field and activities are sorted.
 * Also guarantees `day` numbers are sequential starting from 1.
 * @param {object[]} days
 * @returns {object[]}
 */
export function normalizeDays(days = []) {
  return days
    .map((day, idx) => ({
      ...day,
      day: day.day ?? idx + 1,
      order: day.order ?? idx,
      activities: (day.activities || [])
        .map((act, aIdx) => ({
          ...act,
          order: act.order ?? aIdx,
        }))
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.day - b.day);
}

/**
 * Compute the number of days from the itinerary array.
 * @param {object[]} itinerary
 * @returns {number}
 */
export function computeItineraryDuration(itinerary = []) {
  return itinerary.length;
}

/**
 * Compute a simple diff between two itineraries.
 * Returns an object describing added, removed, and modified days.
 * @param {object[]} oldItinerary
 * @param {object[]} newItinerary
 * @returns {{ added: number[], removed: number[], modified: number[] }}
 */
export function diffItineraries(oldItinerary = [], newItinerary = []) {
  const oldDays = new Map(oldItinerary.map((d) => [d.day, d]));
  const newDays = new Map(newItinerary.map((d) => [d.day, d]));

  const added = [];
  const removed = [];
  const modified = [];

  for (const [day, newDay] of newDays) {
    if (!oldDays.has(day)) {
      added.push(day);
    } else {
      const oldDay = oldDays.get(day);
      if (JSON.stringify(oldDay) !== JSON.stringify(newDay)) {
        modified.push(day);
      }
    }
  }

  for (const day of oldDays.keys()) {
    if (!newDays.has(day)) removed.push(day);
  }

  return { added, removed, modified };
}

// ─────────────────────────────────────────────
// Geospatial Helpers
// ─────────────────────────────────────────────

/**
 * Build a GeoJSON Point centroid from destination IDs.
 * Fetches each destination's location and averages the coordinates.
 * Returns null if no coordinates found.
 * @param {string[]} destinationIds
 * @returns {Promise<object|null>}
 */
export async function buildCentroid(destinationIds = []) {
  if (!destinationIds.length) return null;

  try {
    const destinations = await Destination.find({ _id: { $in: destinationIds } })
      .select("location")
      .lean();

    const coordsList = destinations
      .map((d) => d.location?.coordinates)
      .filter((c) => Array.isArray(c) && c.length === 2);

    if (!coordsList.length) return null;

    const avgLng = coordsList.reduce((sum, c) => sum + c[0], 0) / coordsList.length;
    const avgLat = coordsList.reduce((sum, c) => sum + c[1], 0) / coordsList.length;

    return { type: "Point", coordinates: [avgLng, avgLat] };
  } catch {
    // Non-critical — don't fail the whole operation
    return null;
  }
}
