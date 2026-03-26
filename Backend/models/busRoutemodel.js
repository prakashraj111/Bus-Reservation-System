const mongoose = require("mongoose");

const routeStopSchema = new mongoose.Schema(
  {
    stopName: { type: String, required: true, trim: true },
    // stopOrder: { type: Number, required: true },
    arrivalTime: { type: String, default: "" },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema({
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus"
    },
    from: {
      stopName: {
      type: String,
      required: true
    },
     departureTime: {
      type: String,
      required: true
    }
    },
    to: {
      stopName: {
      type: String,
      required: true
    },
     arrivalTime: {
      type: String,
      required: true
    }
    },
    distanceKm: { type: Number, default: 0 },
    estimatedDurationMin: { type: Number, default: 0 },
    stops: { type: [routeStopSchema], default: [] },
  },
  { timestamps: true }
);

// INDEXES
routeSchema.index({ "from.stopName": 1 });
routeSchema.index({ "to.stopName": 1 });
routeSchema.index({ "stops.stopName": 1 });

// OPTIONAL (better search)
routeSchema.index({
  "from.stopName": "text",
  "to.stopName": "text",
  "stops.stopName": "text",
});

module.exports = mongoose.model("Route", routeSchema);
