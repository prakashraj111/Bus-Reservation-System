const SeatLock = require("../../models/seatLockModel");
const catchAsync = require("../../utils/catchAsync");
const { getSeatLabel } = require("../../utils/ticketHelpers");
const { releaseSeatsForSeatLock } = require("../../utils/seatLockService");
const { isValidObjectId, validatePassengerTickets } = require("../../utils/validation");

const isOwnerOrAdmin = (resourceUserId, user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return resourceUserId && resourceUserId.toString() === user.id;
};

const getAuthorizedSeatLock = async (seatLockId, req) => {
  const seatLock = await SeatLock.findById(seatLockId)
    .populate({
      path: "tripId",
      populate: [{ path: "busId" }, { path: "routeId" }]
    })
    .populate("userId", "username email");

  if (!seatLock) return null;

  if (!isOwnerOrAdmin(seatLock.userId?._id || seatLock.userId, req.user)) {
    return "FORBIDDEN";
  }

  return seatLock;
};

exports.getSeatLockDetails = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.seatLockId)) {
    return res.status(400).json({ success: false, message: "Invalid seat lock ID" });
  }

  const seatLock = await getAuthorizedSeatLock(req.params.seatLockId, req);

  if (!seatLock) {
    return res.status(404).json({ success: false, message: "Seat lock not found" });
  }
  if (seatLock === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.status(200).json({
    success: true,
    data: { seatLock }
  });
});

exports.upsertSeatLockDetails = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.seatLockId)) {
    return res.status(400).json({ success: false, message: "Invalid seat lock ID" });
  }

  const seatLock = await getAuthorizedSeatLock(req.params.seatLockId, req);

  if (!seatLock) {
    return res.status(404).json({ success: false, message: "Seat lock not found" });
  }
  if (seatLock === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (!seatLock.holdExpiresAt || new Date(seatLock.holdExpiresAt) <= new Date()) {
    return res.status(409).json({
      success: false,
      message: "Seat hold expired. Please select seats again."
    });
  }

  if (!["pending", "details_completed"].includes(seatLock.lockStatus)) {
    return res.status(400).json({
      success: false,
      message: "Passenger details cannot be changed for this seat lock"
    });
  }

  const ticketInputs = req.body?.tickets || [];
  const validation = validatePassengerTickets(ticketInputs, seatLock.seatNumbers);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  seatLock.passengerDetails = validation.value.map((ticket) => ({
    seatNumber: ticket.seatNumber,
    seatLabel: getSeatLabel(ticket.seatNumber),
    passengerName: ticket.passengerName,
    passengerAge: ticket.passengerAge,
    passengerGender: ticket.passengerGender,
    passengerPhone: ticket.passengerPhone,
    boardingPoint: ticket.boardingPoint,
    droppingPoint: ticket.droppingPoint
  }));
  seatLock.detailsCompletedAt = new Date();
  seatLock.lockStatus = "details_completed";
  await seatLock.save();

  res.status(200).json({
    success: true,
    message: "Passenger details saved successfully",
    data: { seatLock }
  });
});

exports.releaseSeatLock = catchAsync(async (req, res) => {
  if (!isValidObjectId(req.params.seatLockId)) {
    return res.status(400).json({ success: false, message: "Invalid seat lock ID" });
  }

  const seatLock = await getAuthorizedSeatLock(req.params.seatLockId, req);

  if (!seatLock) {
    return res.status(404).json({ success: false, message: "Seat lock not found" });
  }
  if (seatLock === "FORBIDDEN") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (seatLock.lockStatus === "paid") {
    return res.status(400).json({
      success: false,
      message: "Paid seat locks cannot be released"
    });
  }

  await releaseSeatsForSeatLock(seatLock, "cancelled");

  res.status(200).json({
    success: true,
    message: "Seat hold released successfully"
  });
});
