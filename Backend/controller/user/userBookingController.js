const Booking = require("../../models/bookingModel");
const Trip = require("../../models/tripModel");
const catchAsync = require("../../utils/catchAsync");
const {
  emitTripSeatSnapshot,
  getSeatLockExpiry,
  getTripSeatSnapshot,
  releaseExpiredSeatLocksForTrip
} = require("../../utils/seatLockService");

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

const normalizeSeatNumbers = (seatNumbers) =>
  [...new Set(seatNumbers)].sort((a, b) => a - b);

exports.getSeatAvailability = catchAsync(async (req, res) => {
  const tripId = req.params.tripId;

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
  const { seatNumbers, totalAmount } = req.body;

  if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0 || totalAmount == null) {
    return res.status(400).json({
      success: false,
      message: "tripId, seatNumbers(array), and totalAmount are required"
    });
  }

  if (seatNumbers.length > 5) {
    return res.status(400).json({
      success: false,
      message: "You can select a maximum of 5 seats at once"
    });
  }

  const invalidSeat = seatNumbers.some((seat) => !Number.isInteger(seat) || seat <= 0);
  if (invalidSeat) {
    return res.status(400).json({
      success: false,
      message: "Seat numbers must be positive integers"
    });
  }

  const uniqueSeats = normalizeSeatNumbers(seatNumbers);
  if (uniqueSeats.length !== seatNumbers.length) {
    return res.status(400).json({
      success: false,
      message: "Duplicate seat numbers are not allowed"
    });
  }

  await releaseExpiredSeatLocksForTrip(tripId);

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  const outOfRangeSeat = uniqueSeats.some((seat) => seat > trip.totalSeats);
  if (outOfRangeSeat) {
    return res.status(400).json({
      success: false,
      message: "One or more seat numbers exceed total seats"
    });
  }

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
    { new: true }
  );

  if (!lockedTrip) {
    return res.status(409).json({
      success: false,
      message: "One or more selected seats were just locked or booked by another user"
    });
  }

  const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const booking = await Booking.create({
    userId: req.user.id,
    tripId,
    seatNumbers: uniqueSeats,
    seatCount: uniqueSeats.length,
    totalAmount,
    bookingCode,
    bookingStatus: "pending",
    holdExpiresAt: getSeatLockExpiry()
  });

  const seatSnapshot = await emitTripSeatSnapshot(tripId);

  res.status(201).json({
    success: true,
    message: "Seat lock created. Complete payment before the hold expires.",
    data: booking,
    seatLock: {
      expiresAt: booking.holdExpiresAt,
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
