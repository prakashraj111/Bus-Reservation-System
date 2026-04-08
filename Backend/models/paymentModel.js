const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    seatLockId: { type: mongoose.Schema.Types.ObjectId, ref: "SeatLock", required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["khalti", "esewa"], default: "esewa" },
    transactionId: { type: String, default: "" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
