const Booking = require("../models/bookingModel");
const Trip = require("../models/tripModel");
const Ticket = require("../models/ticketModel");
const { emitTripSeatUpdate } = require("./socket");

const SEAT_LOCK_MINUTES = Number(process.env.SEAT_LOCK_MINUTES || 5);

const getSeatLockExpiry = () =>
  new Date(Date.now() + SEAT_LOCK_MINUTES * 60 * 1000);

const syncTripAvailability = (trip) => {
  trip.bookedSeats = [...new Set((trip.bookedSeats || []).sort((a, b) => a - b))];
  trip.availableSeats = Math.max(trip.totalSeats - trip.bookedSeats.length, 0);
};

const getTripSeatSnapshot = async (tripId) => {
  const trip = await Trip.findById(tripId).lean();

  if (!trip) return null;

  const activeBookings = await Booking.find({
    tripId,
    bookingStatus: { $in: ["pending", "details_completed", "confirmed"] }
  }).lean();

  const now = new Date();
  const pendingBookings = activeBookings.filter(
    (booking) =>
      ["pending", "details_completed"].includes(booking.bookingStatus) &&
      booking.holdExpiresAt &&
      new Date(booking.holdExpiresAt) > now
  );
  const confirmedBookings = activeBookings.filter(
    (booking) => booking.bookingStatus === "confirmed"
  );

  const lockedSeats = pendingBookings.flatMap((booking) => booking.seatNumbers || []);
  const confirmedSeats = confirmedBookings.flatMap((booking) => booking.seatNumbers || []);

  return {
    tripId: trip._id,
    totalSeats: trip.totalSeats,
    availableSeats: trip.availableSeats,
    seatPrice: trip.seatPrice,
    bookedSeats: trip.bookedSeats || [],
    lockedSeats: [...new Set(lockedSeats)].sort((a, b) => a - b),
    confirmedSeats: [...new Set(confirmedSeats)].sort((a, b) => a - b),
    pendingBookings: pendingBookings.map((booking) => ({
      bookingId: booking._id,
      seatNumbers: booking.seatNumbers,
      holdExpiresAt: booking.holdExpiresAt
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

const releaseSeatsForBooking = async (booking, nextStatus = "expired") => {
  if (!booking || !booking.tripId) return null;

  const trip = await Trip.findById(booking.tripId);
  if (!trip) return null;

  const seatSet = new Set(booking.seatNumbers || []);
  trip.bookedSeats = (trip.bookedSeats || []).filter((seat) => !seatSet.has(seat));
  syncTripAvailability(trip);
  await trip.save();

  booking.bookingStatus = nextStatus;
  booking.holdExpiresAt = null;
  booking.detailsCompletedAt = null;
  await booking.save();

  await Ticket.updateMany(
    { bookingId: booking._id, ticketStatus: { $in: ["pending", "confirmed"] } },
    {
      ticketStatus: nextStatus === "confirmed" ? "confirmed" : nextStatus,
      issuedAt: nextStatus === "confirmed" ? new Date() : null
    }
  );

  await emitTripSeatSnapshot(booking.tripId);

  return trip;
};

const releaseExpiredSeatLocksForTrip = async (tripId) => {
  const expiredBookings = await Booking.find({
    tripId,
    bookingStatus: { $in: ["pending", "details_completed"] },
    holdExpiresAt: { $ne: null, $lt: new Date() }
  });

  for (const booking of expiredBookings) {
    await releaseSeatsForBooking(booking, "expired");
  }

  return expiredBookings.length;
};

const releaseExpiredSeatLocks = async () => {
  const expiredBookings = await Booking.find({
    bookingStatus: { $in: ["pending", "details_completed"] },
    holdExpiresAt: { $ne: null, $lt: new Date() }
  });

  for (const booking of expiredBookings) {
    await releaseSeatsForBooking(booking, "expired");
  }

  return expiredBookings.length;
};

module.exports = {
  SEAT_LOCK_MINUTES,
  emitTripSeatSnapshot,
  getSeatLockExpiry,
  getTripSeatSnapshot,
  releaseExpiredSeatLocks,
  releaseExpiredSeatLocksForTrip,
  releaseSeatsForBooking,
  syncTripAvailability
};
