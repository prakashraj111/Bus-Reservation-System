const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createTrip,
  getSingleTrip,
  updateTrip,
  deleteTrip,
  getAllTrips,
  cancelTrip,
  findYourScheduledTrips,
  findYourCancelledTrips,
  findYourCompletedTrips,
  getTripPaymentsBySeat
} = require("../../controller/driver/busTripController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");
const { searchTripsAdvanced, getSuggestions } = require("../../controller/user/advanceSearchController");
const protectTripMutation = [isAuthenticated, restrictTo("driver", "admin")];

router
  .route("/")
  .post(...protectTripMutation, createTrip)
  .get(...protectTripMutation, findYourScheduledTrips);

router.get("/all", getAllTrips);

router.get("/search",searchTripsAdvanced);

// auto-suggest API
router.get("/suggestions",getSuggestions);

router
  .route("/scheduled")
  .get(...protectTripMutation, findYourScheduledTrips);

router
  .route("/cancelled")
  .get(...protectTripMutation, findYourCancelledTrips);

router
  .route("/completed")
  .get(...protectTripMutation, findYourCompletedTrips);

router
  .route("/:id")
  .get(getSingleTrip)
  .put(...protectTripMutation, updateTrip)
  .delete(...protectTripMutation, deleteTrip);

router
  .route("/:id/payments")
  .get(...protectTripMutation, getTripPaymentsBySeat);

router
  .route("/:id/cancel")
  .patch(...protectTripMutation, cancelTrip);

module.exports = router;
