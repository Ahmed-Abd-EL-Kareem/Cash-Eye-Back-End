import { EventEmitter } from "events";

class TripEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitTripCreated(trip, userId) {
    this.emit("trip.created", { trip, userId, timestamp: new Date() });
  }

  emitTripUpdated(trip, userId, changedFields) {
    this.emit("trip.updated", { trip, userId, changedFields, timestamp: new Date() });
  }

  emitTripDeleted(tripId, userId) {
    this.emit("trip.deleted", { tripId, userId, timestamp: new Date() });
  }

  emitAITripGenerated(trip, aiMetadata) {
    this.emit("trip.ai.generated", { trip, aiMetadata, timestamp: new Date() });
  }

  emitTripStatusChanged(trip, from, to, userId) {
    this.emit("trip.status.changed", { trip, from, to, userId, timestamp: new Date() });
  }

  emitTripBooked(trip) {
    this.emit("trip.booked", { trip, timestamp: new Date() });
  }

  emitTripCompleted(trip) {
    this.emit("trip.completed", { trip, timestamp: new Date() });
  }
}

const tripEvents = new TripEventEmitter();

// ─── Default Listeners ───────────────────────────────────────────────────────

tripEvents.on("trip.created", ({ trip, userId }) => {
  console.log(`[Event] trip.created | tripId=${trip._id} | userId=${userId}`);
  // TODO: notify analytics, recommendation engine, etc.
});

tripEvents.on("trip.ai.generated", ({ trip, aiMetadata }) => {
  console.log(`[Event] trip.ai.generated | tripId=${trip._id} | model=${aiMetadata?.model}`);
  // TODO: track AI usage, push to analytics queue
});

tripEvents.on("trip.status.changed", ({ trip, from, to, userId }) => {
  console.log(`[Event] trip.status.changed | ${from} → ${to} | userId=${userId}`);
  // TODO: send notification to user
});

tripEvents.on("trip.booked", ({ trip }) => {
  console.log(`[Event] trip.booked | tripId=${trip._id}`);
  // TODO: trigger booking service
});

tripEvents.on("trip.completed", ({ trip }) => {
  console.log(`[Event] trip.completed | tripId=${trip._id}`);
  // TODO: prompt for review, update stats
});

export default tripEvents;
