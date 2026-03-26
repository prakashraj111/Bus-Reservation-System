const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getSeatAvailability,
  createBooking,
  getAllBookings,
  getSingleBooking
} = require("../../controller/user/userBookingController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");

router.get("/seats", getSeatAvailability);

router.use(isAuthenticated);

router.route("/").post(createBooking);
router.route("/all").get(restrictTo("admin"), getAllBookings);

router
  .route("/:id")
  .get(getSingleBooking)
  // .put(updateBooking)
  // .delete(deleteBooking);

module.exports = router;
