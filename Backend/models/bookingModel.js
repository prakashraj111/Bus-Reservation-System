const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    bookingCode: { type: String, required: true, unique: true },
    seatCount: { type: Number, required: true, min: 1 },
    seatNumbers: { type: [Number], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    detailsCompletedAt: { type: Date, default: null },
    bookingStatus: {
      type: String,
      enum: ["pending", "details_completed", "confirmed", "cancelled", "expired", "failed"],
      default: "pending",
    },
    holdExpiresAt: { type: Date, default: null },
    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
