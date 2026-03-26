const Ticket = require("../models/ticketModel");

const SEATS_PER_ROW = 10;

const getSeatLabel = (seatNumber) => {
  const rowIndex = Math.floor((seatNumber - 1) / SEATS_PER_ROW);
  const rowLabel = String.fromCharCode(65 + rowIndex);
  const seatIndex = ((seatNumber - 1) % SEATS_PER_ROW) + 1;
  return `${rowLabel}${seatIndex}`;
};

const generateTicketNumber = () =>
  `TKT${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

const buildTripSnapshot = (trip) => ({
  busName: trip?.busId?.busName || trip?.busId?.operator || "Bus Service",
  busType: trip?.busId?.type || "",
  busNumber: trip?.busId?.busNumber || trip?.busId?.plateNumber || "",
  routeFrom: trip?.routeId?.from?.stopName || "",
  routeTo: trip?.routeId?.to?.stopName || "",
  travelDate: trip?.travelDate || null,
  departureTime: trip?.departureTime || "",
  arrivalTime: trip?.arrivalTime || "",
  seatPrice: trip?.seatPrice || 0
});

const syncTicketStatuses = async (bookingId, ticketStatus) => {
  const update = { ticketStatus };
  if (ticketStatus === "confirmed") {
    update.issuedAt = new Date();
  }

  await Ticket.updateMany({ bookingId }, update);
};

module.exports = {
  buildTripSnapshot,
  generateTicketNumber,
  getSeatLabel,
  syncTicketStatuses
};
