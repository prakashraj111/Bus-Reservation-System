const express = require("express");
const router = express.Router();
const isAuthenticated = require("../../middleware/isAuthenticated");
const {
  downloadBookingTicketsPdf,
  getBookingDetails,
  getBookingTickets,
  getMyBookingHistory
} = require("../../controller/user/userTicketController");

router.use(isAuthenticated);

router.get("/", getMyBookingHistory);
router.get("/:bookingId", getBookingDetails);
router.get("/:bookingId/tickets", getBookingTickets);
router.get("/:bookingId/tickets/pdf", downloadBookingTicketsPdf);

module.exports = router;
