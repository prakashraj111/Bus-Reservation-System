const Trip = require("../../models/tripModel");
const Ticket = require("../../models/ticketModel");
const Payment = require("../../models/paymentModel");
const SeatLock = require("../../models/seatLockModel");
const catchAsync = require("../../utils/catchAsync");
const mongoose = require("mongoose");
const Bus = require("../../models/busModel");
const Route = require("../../models/busRoutemodel");
const { validateTripPayload, isValidObjectId } = require("../../utils/validation");

const attachLiveSeatStats = async (trips) => {
  if (!trips?.length) return trips;

  const tripIds = trips.map((trip) => trip._id);
  const now = new Date();
  const [ticketCounts, lockCounts] = await Promise.all([
    Ticket.aggregate([
      {
        $match: {
          tripId: { $in: tripIds },
          ticketStatus: "confirmed"
        }
      },
      {
        $group: {
          _id: "$tripId",
          bookedSeatCount: { $sum: 1 }
        }
      }
    ]),
    SeatLock.aggregate([
      {
        $match: {
          tripId: { $in: tripIds },
          lockStatus: { $in: ["pending", "details_completed", "payment_initiated"] },
          holdExpiresAt: { $gt: now }
        }
      },
      {
        $project: {
          tripId: 1,
          lockedSeatCount: { $size: "$seatNumbers" }
        }
      },
      {
        $group: {
          _id: "$tripId",
          lockedSeatCount: { $sum: "$lockedSeatCount" }
        }
      }
    ])
  ]);

  const countMap = new Map(
    ticketCounts.map((item) => [item._id.toString(), item.bookedSeatCount])
  );
  const lockMap = new Map(
    lockCounts.map((item) => [item._id.toString(), item.lockedSeatCount])
  );

  return trips.map((trip) => {
    const tripObject = trip.toObject ? trip.toObject() : trip;
    const bookedSeatCount = countMap.get(trip._id.toString()) || 0;
    const lockedSeatCount = lockMap.get(trip._id.toString()) || 0;
    const availableSeatCount = Math.max((tripObject.totalSeats || 0) - bookedSeatCount - lockedSeatCount, 0);

    return {
      ...tripObject,
      bookedSeatCount,
      lockedSeatCount,
      availableSeatCount
    };
  });
};

exports.createTrip = catchAsync(async (req, res, next) => {
  const { busId, routeId } = req.params;
  const driverId = req.user.id;

  if (
    !mongoose.Types.ObjectId.isValid(busId) ||
    !mongoose.Types.ObjectId.isValid(driverId) ||
    !mongoose.Types.ObjectId.isValid(routeId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid busId, driverId, or routeId" });
  }

  const bus = await Bus.findById(busId);
  if (!bus) {
    return res.status(404).json({ success: false, message: "Bus not found" });
  }
  if (req.user.role !== "admin" && bus.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to schedule trips for this bus" });
  }

  const route = await Route.findById(routeId);
  if (!route || route.busId?.toString() !== busId) {
    return res.status(404).json({ success: false, message: "Route not found for this bus" });
  }

  const validation = validateTripPayload(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { travelDate, departureTime, arrivalTime, seatPrice, totalSeats } = validation.value;
  const travelDateObj = new Date(travelDate);

  const newTrip = await Trip.create({
    busId,
    driverId,
    routeId,
    travelDate: travelDateObj,
    departureTime,
    arrivalTime,
    seatPrice,
    totalSeats,
    availableSeats : totalSeats,
    bookedSeats: []
  });

  res.status(201).json({
    success: true,
    message: "Trip created successfully",
    data: newTrip
  });
});



// =======================================
// GET SINGLE TRIP
// =======================================
exports.getSingleTrip = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  const trip = await Trip.findById(req.params.id)
    .populate("busId")
    .populate("driverId", "username email role")
    .populate("routeId");

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found"
    });
  }

  res.status(200).json({
    success: true,
    data: trip
  });
});

// get All scheduled trips
exports.getAllTrips = catchAsync(async (req, res, next) => {
  // Optional: Filtering, pagination, sorting
  const { page = 1, limit = 10, sort = "-createdAt" } = req.query;

  const skip = (page - 1) * limit;

  // Query scheduled trips only
  const trips = await Trip.find({ status: "scheduled" })
    .populate("busId")
    .populate("driverId", "username email role")
    .populate("routeId")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Count total scheduled trips (for pagination)
  const totalTrips = await Trip.countDocuments({ status: "scheduled" });
  const tripsWithCounts = await attachLiveSeatStats(trips);

  res.status(200).json({
    success: true,
    results: tripsWithCounts.length,
    totalTrips,
    currentPage: Number(page),
    totalPages: Math.ceil(totalTrips / limit),
    data: tripsWithCounts
  });
});

// =======================================
// UPDATE TRIP
// =======================================
exports.updateTrip = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  const existingTrip = await Trip.findById(req.params.id);
  if (!existingTrip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found"
    });
  }

  if (req.user.role !== "admin" && existingTrip.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to update this trip" });
  }

  const payload = { ...req.body };

  delete payload.driverId;
  delete payload.busId;
  delete payload.routeId;
  delete payload.bookedSeats;

  const validation = validateTripPayload(
    {
      travelDate: payload.travelDate ?? existingTrip.travelDate.toISOString().split("T")[0],
      departureTime: payload.departureTime ?? existingTrip.departureTime,
      arrivalTime: payload.arrivalTime ?? existingTrip.arrivalTime,
      seatPrice: payload.seatPrice ?? existingTrip.seatPrice,
      totalSeats: payload.totalSeats ?? existingTrip.totalSeats,
      status: payload.status ?? existingTrip.status
    },
    { isPartial: true }
  );

  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const mergedPayload = validation.value;
  if (mergedPayload.totalSeats < (existingTrip.bookedSeats || []).length) {
    return res.status(400).json({
      success: false,
      message: "Total seats cannot be less than the number of already locked or booked seats"
    });
  }

  payload.travelDate = new Date(mergedPayload.travelDate);
  payload.departureTime = mergedPayload.departureTime;
  payload.arrivalTime = mergedPayload.arrivalTime;
  payload.seatPrice = mergedPayload.seatPrice;
  payload.totalSeats = mergedPayload.totalSeats;
  payload.status = mergedPayload.status;
  payload.availableSeats = Math.max(
    mergedPayload.totalSeats - (existingTrip.bookedSeats || []).length,
    0
  );

  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    payload,
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: "Trip updated successfully",
    data: trip
  });
});


// =======================================
// DELETE TRIP
// =======================================
exports.deleteTrip = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found"
    });
  }

  if (req.user.role !== "admin" && trip.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to delete this trip" });
  }

  await Trip.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Trip deleted successfully"
  });
});

// find scheduled buses
exports.findYourScheduledTrips = catchAsync(async (req, res, next) => {
  const driverId = req.user.id;

  const trips = await Trip.find({
    driverId: driverId,
    status: "scheduled",
  })
    .populate("busId")
    .populate("routeId")
    .sort({ travelDate: 1, departureTime: 1 });

  if (!trips || trips.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No scheduled trips found for this driver",
    });
  }

  const tripsWithCounts = await attachLiveSeatStats(trips);

  res.status(200).json({
    success: true,
    count: tripsWithCounts.length,
    data: tripsWithCounts,
  });
});

// find cancelled buses
exports.findYourCancelledTrips = catchAsync(async (req, res, next) => {
  const driverId = req.user.id;

  const trips = await Trip.find({
    driverId: driverId,
    status: "cancelled",
  })
    .populate("busId")
    .populate("routeId")
    .sort({ travelDate: 1, departureTime: 1 });

  if (!trips || trips.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No cancelled trips found for this driver",
    });
  }

  const tripsWithCounts = await attachLiveSeatStats(trips);

  res.status(200).json({
    success: true,
    count: tripsWithCounts.length,
    data: tripsWithCounts,
  });
});

// find completed buses
exports.findYourCompletedTrips = catchAsync(async (req, res, next) => {
  const driverId = req.user.id;

  const trips = await Trip.find({
    driverId: driverId,
    status: "completed",
  })
    .populate("busId")
    .populate("routeId")
    .sort({ travelDate: 1, departureTime: 1 });

  if (!trips || trips.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No completed trips found for this driver",
    });
  }

  const tripsWithCounts = await attachLiveSeatStats(trips);

  res.status(200).json({
    success: true,
    count: tripsWithCounts.length,
    data: tripsWithCounts,
  });
});

exports.getTripPaymentsBySeat = catchAsync(async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate("busId")
    .populate("routeId")
    .populate("driverId", "username email role");

  if (!trip) {
    return res.status(404).json({ success: false, message: "Trip not found" });
  }

  if (req.user.role !== "admin" && trip.driverId?._id?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const tickets = await Ticket.find({
    tripId: trip._id,
    ticketStatus: "confirmed"
  })
    .populate("bookingId", "bookingCode")
    .populate("userId", "username email")
    .sort({ seatNumber: 1 });

  const bookingIds = tickets
    .map((ticket) => ticket.bookingId?._id)
    .filter(Boolean);

  const payments = await Payment.find({
    bookingId: { $in: bookingIds }
  });

  const paymentByBookingId = new Map();
  payments.forEach((payment) => {
    if (payment.bookingId) {
      paymentByBookingId.set(payment.bookingId.toString(), payment);
    }
  });

  const paymentsBySeat = tickets.map((ticket) => {
    const payment = paymentByBookingId.get(ticket.bookingId?._id?.toString() || "");

    return {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      seatNumber: ticket.seatNumber,
      seatLabel: ticket.seatLabel,
      passengerName: ticket.passengerName,
      bookingCode: ticket.bookingId?.bookingCode || "N/A",
      user: ticket.userId || null,
      amount: payment?.amount ?? 0,
      paymentStatus: payment?.paymentStatus || "unknown",
      paymentMethod: payment?.method || "N/A",
      transactionId: payment?.transactionId || "",
      paidAt: payment?.paidAt || null
    };
  });

  res.status(200).json({
    success: true,
    results: paymentsBySeat.length,
    data: {
      trip,
      paymentsBySeat
    }
  });
});

// =======================================
// ✅ MANUAL CANCEL TRIP
// =======================================
exports.cancelTrip = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid trip ID" });
  }

  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

  if (req.user.role !== "admin" && trip.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to cancel this trip" });
  }

  if (trip.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "Trip is already cancelled"
    });
  }

  if (trip.status === "completed") {
    return res.status(400).json({
      success: false,
      message: "Completed trips cannot be cancelled"
    });
  }

  trip.status = "cancelled";
  await trip.save();

  res.status(200).json({ success: true, message: "Trip cancelled", data: trip });
});
