const Trip = require("../../models/tripModel");
const catchAsync = require("../../utils/catchAsync");
const mongoose = require("mongoose");

exports.createTrip = catchAsync(async (req, res, next) => {
  const { busId, routeId } = req.params;
  const driverId = req.user.id;

  const {
    travelDate,
    departureTime,
    arrivalTime,
    seatPrice,
    totalSeats,
    bookedSeats
  } = req.body;

  const hasMissingRequiredField =
    !busId ||
    !driverId ||
    !routeId ||
    !travelDate ||
    !departureTime ||
    !arrivalTime ||
    totalSeats === undefined;

  if (hasMissingRequiredField) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required trip details"
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(busId) ||
    !mongoose.Types.ObjectId.isValid(driverId) ||
    !mongoose.Types.ObjectId.isValid(routeId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid busId, driverId, or routeId" });
  }

  const travelDateObj = new Date(travelDate);
  if (Number.isNaN(travelDateObj.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid travel date" });
  }

  const newTrip = await Trip.create({
    busId,
    driverId,
    routeId,
    travelDate: travelDateObj,
    departureTime,
    arrivalTime,
    seatPrice: seatPrice || 750,
    totalSeats,
    availableSeats : totalSeats,
    bookedSeats: bookedSeats || []
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

// get All trips
exports.getAllTrips = catchAsync(async (req, res, next) => {
  // Optional: Filtering, pagination, sorting
  const { page = 1, limit = 10, sort = "-createdAt" } = req.query;

  const skip = (page - 1) * limit;

  // Query trips
  const trips = await Trip.find()
    .populate("busId")
    .populate("driverId", "username email role")
    .populate("routeId")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Count total trips (for pagination)
  const totalTrips = await Trip.countDocuments();

  res.status(200).json({
    success: true,
    results: trips.length,
    totalTrips,
    currentPage: Number(page),
    totalPages: Math.ceil(totalTrips / limit),
    data: trips
  });
});

// =======================================
// UPDATE TRIP
// =======================================
exports.updateTrip = catchAsync(async (req, res, next) => {
  const payload = { ...req.body };

  delete payload.driverId;

  if (payload.travelDate) {
    const travelDateObj = new Date(payload.travelDate);

    if (Number.isNaN(travelDateObj.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid travel date" });
    }

    payload.travelDate = travelDateObj;
  }

  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    payload,
    {
      new: true,
      runValidators: true
    }
  );

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found"
    });
  }

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

  const trip = await Trip.findByIdAndDelete(req.params.id);

  if (!trip) {
    return res.status(404).json({
      success: false,
      message: "Trip not found"
    });
  }

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

  res.status(200).json({
    success: true,
    count: trips.length,
    data: trips,
  });
});


// =======================================
// ✅ MANUAL CANCEL TRIP
// =======================================
exports.cancelTrip = catchAsync(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

  trip.status = "cancelled";
  await trip.save();

  res.status(200).json({ success: true, message: "Trip cancelled", data: trip });
});
