const Booking = require("../../models/bookingModel");
const SeatLock = require("../../models/seatLockModel");
const Trip = require("../../models/tripModel");
const catchAsync = require("../../utils/catchAsync");
const {
  emitTripSeatSnapshot,
  getSeatLockExpiry,
  getTripSeatSnapshot,
  releaseExpiredSeatLocksForTrip
} = require("../../utils/seatLockService");
const { isValidObjectId, validateSeatSelection } = require("../../utils/validation");

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

exports.getSeatAvailability = catchAsync(async (req, res) => {
  const tripId = req.params.tripId;
  if (!isValidObjectId(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  await releaseExpiredSeatLocksForTrip(tripId);

  const trip = await Trip.findById(tripId)
    .populate("busId")
    .populate("routeId");

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  const seats = await getTripSeatSnapshot(tripId);

  res.status(200).json({
    success: true,
    data: {
      trip,
      seats
    }
  });
});

exports.createBooking = catchAsync(async (req, res) => {
  const tripId = req.params.tripId;
  if (!isValidObjectId(tripId)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  await releaseExpiredSeatLocksForTrip(tripId);

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  const validation = validateSeatSelection(req.body, trip);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { seatNumbers: uniqueSeats, totalAmount } = validation.value;

  const lockedTrip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      availableSeats: { $gte: uniqueSeats.length },
      bookedSeats: { $nin: uniqueSeats }
    },
    {
      $addToSet: { bookedSeats: { $each: uniqueSeats } },
      $inc: { availableSeats: -uniqueSeats.length }
    },
    { returnDocument: "after" }
  );

  if (!lockedTrip) {
    return res.status(409).json({
      success: false,
      message: "One or more selected seats were just locked or booked by another user"
    });
  }

  const seatLock = await SeatLock.create({
    userId: req.user.id,
    tripId,
    seatNumbers: uniqueSeats,
    seatCount: uniqueSeats.length,
    totalAmount,
    holdExpiresAt: getSeatLockExpiry()
  });

  const seatSnapshot = await emitTripSeatSnapshot(tripId);

  res.status(201).json({
    success: true,
    message: "Seat lock created. Complete payment before the hold expires.",
    data: seatLock,
    seatLock: {
      expiresAt: seatLock.holdExpiresAt,
      seats: seatSnapshot
    }
  });
});

exports.getAllBookings = catchAsync(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: req.user.id };

  const bookings = await Booking.find(filter)
    .populate("userId")
    .populate("tripId");

  res.status(200).json({
    success: true,
    results: bookings.length,
    data: bookings
  });
});

exports.getSingleBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("userId")
    .populate("tripId");

  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  if (!isOwnerOrAdmin(booking.userId?._id || booking.userId, req.user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.status(200).json({ success: true, data: booking });
});
