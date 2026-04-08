const Booking = require("../models/bookingModel");
const SeatLock = require("../models/seatLockModel");
const Trip = require("../models/tripModel");
const { emitTripSeatUpdate } = require("./socket");

const SEAT_LOCK_MINUTES = Number(process.env.SEAT_LOCK_MINUTES || 5);

const ACTIVE_LOCK_STATUSES = ["pending", "details_completed", "payment_initiated"];

const getSeatLockExpiry = () =>
  new Date(Date.now() + SEAT_LOCK_MINUTES * 60 * 1000);

const syncTripAvailability = (trip) => {
  trip.bookedSeats = [...new Set((trip.bookedSeats || []).sort((a, b) => a - b))];
  trip.availableSeats = Math.max(trip.totalSeats - trip.bookedSeats.length, 0);
};

const getTripSeatSnapshot = async (tripId) => {
  const trip = await Trip.findById(tripId).lean();

  if (!trip) return null;

  const [seatLocks, bookings] = await Promise.all([
    SeatLock.find({
      tripId,
      lockStatus: { $in: ACTIVE_LOCK_STATUSES }
    }).lean(),
    Booking.find({
      tripId,
      bookingStatus: "confirmed"
    }).lean()
  ]);

  const now = new Date();
  const activeLocks = seatLocks.filter(
    (lock) => lock.holdExpiresAt && new Date(lock.holdExpiresAt) > now
  );

  const lockedSeats = activeLocks.flatMap((lock) => lock.seatNumbers || []);
  const confirmedSeats = bookings.flatMap((booking) => booking.seatNumbers || []);
  const uniqueLockedSeats = [...new Set(lockedSeats)].sort((a, b) => a - b);
  const uniqueConfirmedSeats = [...new Set(confirmedSeats)].sort((a, b) => a - b);
  const availableSeats = Math.max(
    (trip.totalSeats || 0) - uniqueLockedSeats.length - uniqueConfirmedSeats.length,
    0
  );

  return {
    tripId: trip._id,
    totalSeats: trip.totalSeats,
    availableSeats,
    seatPrice: trip.seatPrice,
    bookedSeats: trip.bookedSeats || [],
    lockedSeats: uniqueLockedSeats,
    confirmedSeats: uniqueConfirmedSeats,
    pendingBookings: activeLocks.map((lock) => ({
      bookingId: lock._id,
      seatNumbers: lock.seatNumbers,
      holdExpiresAt: lock.holdExpiresAt
    }))
  };
};

const emitTripSeatSnapshot = async (tripId) => {
  const snapshot = await getTripSeatSnapshot(tripId);
  if (snapshot) {
    emitTripSeatUpdate(tripId, snapshot);
  }
  return snapshot;
};

const releaseSeatsForSeatLock = async (seatLock, nextStatus = "expired") => {
  if (!seatLock || !seatLock.tripId) return null;

  const trip = await Trip.findById(seatLock.tripId);
  if (!trip) return null;

  const seatSet = new Set(seatLock.seatNumbers || []);
  trip.bookedSeats = (trip.bookedSeats || []).filter((seat) => !seatSet.has(seat));
  syncTripAvailability(trip);
  await trip.save();

  seatLock.lockStatus = nextStatus;
  seatLock.detailsCompletedAt = null;
  seatLock.holdExpiresAt = null;
  await seatLock.save();

  await emitTripSeatSnapshot(seatLock.tripId);

  return trip;
};

const releaseExpiredSeatLocksForTrip = async (tripId) => {
  const expiredLocks = await SeatLock.find({
    tripId,
    lockStatus: { $in: ACTIVE_LOCK_STATUSES },
    holdExpiresAt: { $ne: null, $lt: new Date() }
  });

  for (const seatLock of expiredLocks) {
    await releaseSeatsForSeatLock(seatLock, "expired");
  }

  return expiredLocks.length;
};

const releaseExpiredSeatLocks = async () => {
  const expiredLocks = await SeatLock.find({
    lockStatus: { $in: ACTIVE_LOCK_STATUSES },
    holdExpiresAt: { $ne: null, $lt: new Date() }
  });

  for (const seatLock of expiredLocks) {
    await releaseSeatsForSeatLock(seatLock, "expired");
  }

  return expiredLocks.length;
};

module.exports = {
  ACTIVE_LOCK_STATUSES,
  SEAT_LOCK_MINUTES,
  emitTripSeatSnapshot,
  getSeatLockExpiry,
  getTripSeatSnapshot,
  releaseExpiredSeatLocks,
  releaseExpiredSeatLocksForTrip,
  releaseSeatsForSeatLock,
  syncTripAvailability
};
