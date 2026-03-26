
const Route = require("../../models/busRoutemodel");
const catchAsync = require("../../utils/catchAsync");


// =======================================
// ✅ CREATE ROUTE
// =======================================
exports.createRoute = catchAsync(async (req, res, next) => {

  const {
    busId,
    from,
    to,
    distanceKm,
    estimatedDurationMin,
    stops
  } = req.body;

  if (!busId) {
    return res.status(400).json({
      success: false,
      message: "Bus ID is required"
    });
  }

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "From and To locations are required"
    });
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

  const route = await Route.findById(req.params.id);

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }

  const updatedRoute = await Route.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
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

  const route = await Route.findById(req.params.id);

  if (!route) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }

  await Route.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Route deleted successfully"
  });
});
