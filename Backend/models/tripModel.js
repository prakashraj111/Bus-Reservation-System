const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    travelDate: { type: Date, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    seatPrice: { type: Number, default: 750 },
    totalSeats: { type: Number, required: true, min: 40, max: 60 },
    availableSeats: { type: Number, default: 40 },
    bookedSeats: { type: [Number], default: [] },
    status: { type: String, enum: ["scheduled", "cancelled", "completed"], default: "scheduled" },
  },
  { timestamps: true }
);

// INDEXES
tripSchema.index({ travelDate: 1, status: 1 });
tripSchema.index({ routeId: 1 });

module.exports = mongoose.model("Trip", tripSchema);
