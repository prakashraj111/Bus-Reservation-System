const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busName: {type: String, required: true},
    description: { type: String, default: "" },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    operator: { type: String, required: true, trim: true },
    busNumberPlate: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["ac", "nonac", "mini", "luxury", "tourist"], default: "nonac" },
    imageUrl: { type: String, default: "" },
    totalSeats: { type: Number, required: true, min: 1 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", busSchema);
