
const Route = require("../../models/busRoutemodel");
const Bus = require("../../models/busModel");
const catchAsync = require("../../utils/catchAsync");
const { validateRoutePayload, isValidObjectId } = require("../../utils/validation");


// =======================================
// ✅ CREATE ROUTE
// =======================================
exports.createRoute = catchAsync(async (req, res, next) => {
  const validation = validateRoutePayload(req.body);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const { busId, from, to, distanceKm, estimatedDurationMin, stops } = validation.value;
  const bus = await Bus.findById(busId);

  if (!bus) {
    return res.status(404).json({ success: false, message: "Bus not found" });
  }

  if (req.user.role !== "admin" && bus.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to manage this bus route" });
  }

  const newRoute = await Route.create({
    busId,
    from,
    to,
    distanceKm,
    estimatedDurationMin,
    stops 
  });

  res.status(201).json({
    success: true,
    message: "Route created successfully",
    data: newRoute
  });
});


// =======================================
// ✅ GET ALL ROUTES
// =======================================
// exports.getAllRoutes = catchAsync(async (req, res, next) => {

//   const routes = await Route.find();

//   res.status(200).json({
//     success: true,
//     results: routes.length,
//     data: routes
//   });
// });


// =======================================
// ✅ GET SINGLE ROUTE
// =======================================
exports.getSingleRoute = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid route ID" });
  }

  const route = await Route.findById(req.params.id);

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }

  res.status(200).json({
    success: true,
    data: route
  });
});

// =======================================
// ✅ GET ROUTE BY BUS ID
// =======================================
exports.getRouteByBusId = catchAsync(async (req, res, next) => {
  const { busId } = req.params;
  if (!isValidObjectId(busId)) {
    return res.status(400).json({ success: false, message: "Invalid bus ID" });
  }

  const route = await Route.findOne({ busId });

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found for this bus"
    });
  }

  res.status(200).json({
    success: true,
    data: route
  });
});


// =======================================
// ✅ UPDATE ROUTE
// =======================================
exports.updateRoute = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid route ID" });
  }

  const route = await Route.findById(req.params.id);

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }

  const bus = await Bus.findById(route.busId);
  if (!bus) {
    return res.status(404).json({ success: false, message: "Bus not found" });
  }
  if (req.user.role !== "admin" && bus.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to update this route" });
  }

  const validation = validateRoutePayload(
    {
      busId: route.busId?.toString(),
      from: req.body.from ?? route.from,
      to: req.body.to ?? route.to,
      distanceKm: req.body.distanceKm ?? route.distanceKm,
      estimatedDurationMin: req.body.estimatedDurationMin ?? route.estimatedDurationMin,
      stops: req.body.stops ?? route.stops
    },
    { requireBusId: true }
  );

  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const updatedRoute = await Route.findByIdAndUpdate(
    req.params.id,
    validation.value,
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: "Route updated successfully",
    data: updatedRoute
  });
});


// =======================================
// ✅ DELETE ROUTE
// =======================================
exports.deleteRoute = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid route ID" });
  }

  const route = await Route.findById(req.params.id);

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }

  const bus = await Bus.findById(route.busId);
  if (!bus) {
    return res.status(404).json({ success: false, message: "Bus not found" });
  }
  if (req.user.role !== "admin" && bus.driverId?.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: "You do not have permission to delete this route" });
  }

  await Route.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Route deleted successfully"
  });
});
