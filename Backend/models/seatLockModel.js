const mongoose = require("mongoose");

const passengerDetailSchema = new mongoose.Schema(
  {
    seatNumber: { type: Number, required: true },
    seatLabel: { type: String, required: true },
    passengerName: { type: String, default: "", trim: true },
    passengerAge: { type: Number, default: null },
    passengerGender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: ""
    },
    passengerPhone: { type: String, default: "", trim: true },
    boardingPoint: { type: String, default: "", trim: true },
    droppingPoint: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const seatLockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    seatNumbers: { type: [Number], required: true },
    seatCount: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    holdExpiresAt: { type: Date, default: null },
    detailsCompletedAt: { type: Date, default: null },
    passengerDetails: { type: [passengerDetailSchema], default: [] },
    lockStatus: {
      type: String,
      enum: ["pending", "details_completed", "payment_initiated", "paid", "cancelled", "expired", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeatLock", seatLockSchema);
