const express = require("express");
const router = express.Router();
const {
  createRoute,
  getSingleRoute,
  getRouteByBusId,
  updateRoute,
  deleteRoute
} = require("../../controller/driver/busRouteController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");

router
  .route("/")
  .post(isAuthenticated, restrictTo("driver", "admin"), createRoute);

router
  .route("/bus/:busId")
  .get(getRouteByBusId);

router
  .route("/:id")
  .get(getSingleRoute)
  .put(isAuthenticated, restrictTo("driver", "admin"), updateRoute)
  .delete(isAuthenticated, restrictTo("driver", "admin"), deleteRoute);

module.exports = router;
