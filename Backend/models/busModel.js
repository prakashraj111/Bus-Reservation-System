const mongoose = require("mongoose");

const containsNumber = (value) => /\d/.test(String(value ?? ""));

const busSchema = new mongoose.Schema(
  {
    busName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      validate: {
        validator: (value) => !containsNumber(value),
        message: "Bus name cannot contain numbers"
      }
    },
    description: {
      type: String,
      default: "",
      trim: true,
      minlength: 10,
      maxlength: 500,
      validate: {
        validator: (value) => !containsNumber(value),
        message: "Description cannot contain numbers"
      }
    },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    operator: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) => !containsNumber(value),
        message: "Operator name cannot contain numbers"
      }
    },
    busNumberPlate: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Bus number plate must contain numbers only"
      }
    },
    type: { type: String, enum: ["ac", "nonac", "mini", "luxury", "tourist"], default: "nonac" },
    imageUrl: { type: String, default: "" },
    totalSeats: { type: Number, required: true, min: 1 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", busSchema);
