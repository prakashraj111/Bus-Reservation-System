const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seatNumber: { type: Number, required: true },
    seatLabel: { type: String, required: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    passengerName: { type: String, required: true, trim: true },
    passengerAge: { type: Number, required: true, min: 1, max: 120 },
    passengerGender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true
    },
    passengerPhone: { type: String, required: true, trim: true },
    boardingPoint: { type: String, required: true, trim: true },
    droppingPoint: { type: String, required: true, trim: true },
    ticketStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired", "failed"],
      default: "pending"
    },
    issuedAt: { type: Date, default: null },
    snapshot: {
      busName: { type: String, default: "" },
      busType: { type: String, default: "" },
      busNumber: { type: String, default: "" },
      routeFrom: { type: String, default: "" },
      routeTo: { type: String, default: "" },
      travelDate: { type: Date, default: null },
      departureTime: { type: String, default: "" },
      arrivalTime: { type: String, default: "" },
      seatPrice: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

ticketSchema.index({ bookingId: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model("Ticket", ticketSchema);
