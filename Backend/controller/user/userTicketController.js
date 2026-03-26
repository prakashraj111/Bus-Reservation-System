const Booking = require("../../models/bookingModel");
const Payment = require("../../models/paymentModel");
const Ticket = require("../../models/ticketModel");
const Trip = require("../../models/tripModel");
const catchAsync = require("../../utils/catchAsync");
const { streamBookingTicketsPdf } = require("../../utils/pdfTicketBuilder");
const {
  buildTripSnapshot,
  generateTicketNumber,
  getSeatLabel
} = require("../../utils/ticketHelpers");

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

const getAuthorizedBooking = async (bookingId, req) => {
  const booking = await Booking.findById(bookingId)
    .populate({
      path: "tripId",
      populate: [{ path: "busId" }, { path: "routeId" }]
    })
    .populate("userId", "username email");

  if (!booking) return null;

  if (!isOwnerOrAdmin(booking.userId?._id || booking.userId, req.user)) {
    return "FORBIDDEN";
  }

  return booking;
};

const getBookingPayload = async (bookingId, req) => {
  const booking = await getAuthorizedBooking(bookingId, req);
  if (!booking) return null;
  if (booking === "FORBIDDEN") return "FORBIDDEN";

  const [tickets, payment] = await Promise.all([
    Ticket.find({ bookingId }).sort({ seatNumber: 1 }),
    Payment.findOne({ bookingId })
  ]);

  return { booking, tickets, payment };
};

const validateTicketInput = (tickets, booking) => {
  if (!Array.isArray(tickets) || tickets.length !== booking.seatCount) {
    return "Ticket details must be provided for every selected seat";
  }

  const bookingSeats = [...booking.seatNumbers].sort((a, b) => a - b);
  const submittedSeats = [...tickets.map((ticket) => Number(ticket.seatNumber))].sort((a, b) => a - b);

  if (JSON.stringify(bookingSeats) !== JSON.stringify(submittedSeats)) {
    return "Ticket seat numbers do not match the locked booking seats";
  }

  const hasInvalidTicket = tickets.some((ticket) => {
    return (
      !ticket.passengerName?.trim() ||
      !Number.isFinite(Number(ticket.passengerAge)) ||
      Number(ticket.passengerAge) <= 0 ||
      !["male", "female", "other"].includes(ticket.passengerGender) ||
      !ticket.passengerPhone?.trim() ||
      !ticket.boardingPoint?.trim() ||
      !ticket.droppingPoint?.trim()
    );
  });

  if (hasInvalidTicket) {
    return "Every ticket form must be completed with valid passenger details";
  }

  return null;
};

exports.getBookingDetails = catchAsync(async (req, res) => {
  const payload = await getBookingPayload(req.params.bookingId, req);

  if (!payload) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (payload === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.status(200).json({ success: true, data: payload });
});

exports.upsertBookingTickets = catchAsync(async (req, res) => {
  const payload = await getBookingPayload(req.params.bookingId, req);

  if (!payload) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (payload === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { booking } = payload;
  const ticketInputs = req.body?.tickets || [];

  if (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) <= new Date()) {
    return res.status(409).json({
      success: false,
      message: "Seat hold expired. Please select seats again."
    });
  }

  if (!["pending", "details_completed"].includes(booking.bookingStatus)) {
    return res.status(400).json({
      success: false,
      message: "Ticket details cannot be changed for this booking"
    });
  }

  const validationError = validateTicketInput(ticketInputs, booking);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const trip = await Trip.findById(booking.tripId)
    .populate("busId")
    .populate("routeId");
  const snapshot = buildTripSnapshot(trip);

  await Promise.all(
    ticketInputs.map(async (ticketInput) => {
      const seatNumber = Number(ticketInput.seatNumber);
      const currentTicket = await Ticket.findOne({
        bookingId: booking._id,
        seatNumber
      });

      const payloadToSave = {
        bookingId: booking._id,
        tripId: booking.tripId._id || booking.tripId,
        userId: booking.userId._id || booking.userId,
        seatNumber,
        seatLabel: getSeatLabel(seatNumber),
        passengerName: ticketInput.passengerName.trim(),
        passengerAge: Number(ticketInput.passengerAge),
        passengerGender: ticketInput.passengerGender,
        passengerPhone: ticketInput.passengerPhone.trim(),
        boardingPoint: ticketInput.boardingPoint.trim(),
        droppingPoint: ticketInput.droppingPoint.trim(),
        ticketStatus: "pending",
        snapshot
      };

      if (currentTicket) {
        Object.assign(currentTicket, payloadToSave);
        await currentTicket.save();
      } else {
        await Ticket.create({
          ...payloadToSave,
          ticketNumber: generateTicketNumber()
        });
      }
    })
  );

  booking.detailsCompletedAt = new Date();
  booking.bookingStatus = "details_completed";
  await booking.save();

  const updatedPayload = await getBookingPayload(req.params.bookingId, req);

  res.status(200).json({
    success: true,
    message: "Passenger details saved successfully",
    data: updatedPayload
  });
});

exports.getBookingTickets = catchAsync(async (req, res) => {
  const payload = await getBookingPayload(req.params.bookingId, req);

  if (!payload) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (payload === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.status(200).json({
    success: true,
    results: payload.tickets.length,
    data: payload
  });
});

exports.downloadBookingTicketsPdf = catchAsync(async (req, res) => {
  const payload = await getBookingPayload(req.params.bookingId, req);

  if (!payload) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (payload === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (payload.booking.bookingStatus !== "confirmed") {
    return res.status(400).json({
      success: false,
      message: "Tickets can be downloaded only after successful payment"
    });
  }

  streamBookingTicketsPdf({
    booking: payload.booking,
    tickets: payload.tickets,
    res
  });
});

exports.getMyBookingHistory = catchAsync(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: req.user.id };

  const bookings = await Booking.find(filter)
    .populate({
      path: "tripId",
      populate: [{ path: "busId" }, { path: "routeId" }]
    })
    .sort({ createdAt: -1 });

  const bookingIds = bookings.map((booking) => booking._id);
  const tickets = await Ticket.find({ bookingId: { $in: bookingIds } }).sort({ seatNumber: 1 });
  const payments = await Payment.find({ bookingId: { $in: bookingIds } });

  const ticketsByBooking = new Map();
  tickets.forEach((ticket) => {
    const key = ticket.bookingId.toString();
    const list = ticketsByBooking.get(key) || [];
    list.push(ticket);
    ticketsByBooking.set(key, list);
  });

  const paymentByBooking = new Map();
  payments.forEach((payment) => {
    paymentByBooking.set(payment.bookingId.toString(), payment);
  });

  const data = bookings.map((booking) => ({
    booking,
    tickets: ticketsByBooking.get(booking._id.toString()) || [],
    payment: paymentByBooking.get(booking._id.toString()) || null
  }));

  res.status(200).json({
    success: true,
    results: data.length,
    data
  });
});

exports.releaseBookingHold = catchAsync(async (req, res) => {
  const payload = await getBookingPayload(req.params.bookingId, req);

  if (!payload) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (payload === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { booking } = payload;

  if (booking.bookingStatus === "confirmed") {
    return res.status(400).json({
      success: false,
      message: "Confirmed bookings cannot be released"
    });
  }

  const { releaseSeatsForBooking } = require("../../utils/seatLockService");
  await releaseSeatsForBooking(booking, "cancelled");

  res.status(200).json({
    success: true,
    message: "Seat hold released successfully"
  });
});
