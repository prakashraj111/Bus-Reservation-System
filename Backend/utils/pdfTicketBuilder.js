const PDFDocument = require("pdfkit");

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const streamBookingTicketsPdf = ({ booking, tickets, res }) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const trip = booking?.tripId || {};
  const liveBus = trip?.busId || {};
  const liveRoute = trip?.routeId || {};

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"booking-${booking.bookingCode}-tickets.pdf\"`
  );

  doc.pipe(res);

  tickets.forEach((ticket, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const snapshot = ticket.snapshot || {};
    const routeFrom = liveRoute?.from?.stopName || snapshot.routeFrom || "Origin";
    const routeTo = liveRoute?.to?.stopName || snapshot.routeTo || "Destination";
    const travelDate = trip?.travelDate || snapshot.travelDate;
    const departureTime = trip?.departureTime || snapshot.departureTime || "N/A";
    const arrivalTime = trip?.arrivalTime || snapshot.arrivalTime || "N/A";
    const fare = trip?.seatPrice ?? snapshot.seatPrice ?? 0;
    const busName = liveBus?.busName || snapshot.busName || "Bus Service";
    const busType = liveBus?.type || snapshot.busType || "N/A";
    const busNumber = liveBus?.busNumberPlate || snapshot.busNumber || "N/A";

    doc
      .roundedRect(36, 36, 523, 760, 18)
      .fillAndStroke("#f8fafc", "#dbe4f0");

    doc
      .fillColor("#0f172a")
      .fontSize(24)
      .text("Bus Ticket", 56, 60);

    doc
      .fillColor("#475569")
      .fontSize(11)
      .text(`Booking Code: ${booking.bookingCode}`, 56, 94)
      .text(`Ticket Number: ${ticket.ticketNumber}`, 56, 110);

    doc
      .roundedRect(56, 144, 483, 92, 14)
      .fillAndStroke("#dbeafe", "#bfdbfe");

    doc
      .fillColor("#1e3a8a")
      .fontSize(18)
      .text(`${routeFrom} -> ${routeTo}`, 76, 168)
      .fillColor("#334155")
      .fontSize(12)
      .text(`Travel Date: ${formatDate(travelDate)}`, 76, 198)
      .text(`Departure: ${departureTime}    Arrival: ${arrivalTime}`, 290, 198);

    doc
      .fillColor("#0f172a")
      .fontSize(14)
      .text("Passenger Details", 56, 270);

    const leftX = 56;
    const rightX = 300;
    const startY = 300;
    const rowGap = 28;

    const detailPairs = [
      ["Passenger", ticket.passengerName],
      ["Age", String(ticket.passengerAge)],
      ["Gender", ticket.passengerGender],
      ["Phone", ticket.passengerPhone],
      ["Boarding", ticket.boardingPoint],
      ["Dropping", ticket.droppingPoint],
      ["Seat", ticket.seatLabel],
      ["Fare", `Rs. ${fare}`],
      ["Bus", busName],
      ["Bus Type", busType],
      ["Bus Number", busNumber],
      ["Status", ticket.ticketStatus]
    ];

    detailPairs.forEach(([label, value], idx) => {
      const x = idx % 2 === 0 ? leftX : rightX;
      const y = startY + Math.floor(idx / 2) * rowGap;

      doc
        .fillColor("#64748b")
        .fontSize(10)
        .text(label, x, y)
        .fillColor("#0f172a")
        .fontSize(13)
        .text(value || "N/A", x, y + 12, { width: 180 });
    });

    doc
      .roundedRect(56, 600, 483, 120, 14)
      .fillAndStroke("#eff6ff", "#dbeafe");

    doc
      .fillColor("#1d4ed8")
      .fontSize(14)
      .text("Important", 76, 622)
      .fillColor("#334155")
      .fontSize(11)
      .text(
        "Carry a valid identification document and present this ticket during boarding. Each ticket in this booking has its own unique ticket number and seat assignment.",
        76,
        646,
        { width: 440, lineGap: 4 }
      );
  });

  doc.end();
};

module.exports = { streamBookingTicketsPdf };
