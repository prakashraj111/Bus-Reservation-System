const express = require("express");
const router = express.Router();
const isAuthenticated = require("../../middleware/isAuthenticated");
const {
  downloadBookingTicketsPdf,
  getBookingDetails,
  getBookingTickets,
  getMyBookingHistory,
  releaseBookingHold,
  upsertBookingTickets
} = require("../../controller/user/userTicketController");

router.use(isAuthenticated);

router.get("/", getMyBookingHistory);
router.get("/:bookingId", getBookingDetails);
router.post("/:bookingId/release", releaseBookingHold);
router.put("/:bookingId/tickets", upsertBookingTickets);
router.get("/:bookingId/tickets", getBookingTickets);
router.get("/:bookingId/tickets/pdf", downloadBookingTicketsPdf);

module.exports = router;
