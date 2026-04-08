const Trip = require("../../models/tripModel");
const Ticket = require("../../models/ticketModel");
const SeatLock = require("../../models/seatLockModel");
const catchAsync = require("../../utils/catchAsync");
const { validateSearchPayload, validateSuggestionQuery } = require("../../utils/validation");

exports.searchTripsAdvanced = catchAsync(async (req, res, next) => {
  const validation = validateSearchPayload(req.query);
  if (validation.error) {
    return res.status(400).json({
      status: "fail",
      message: validation.error,
    });
  }

  let { from, to, travelDate } = validation.value;

  // Normalize input (basic fuzzy improvement)
  from = from.trim().toLowerCase();
  to = to.trim().toLowerCase();

  // Date range
  const startDate = new Date(travelDate);
  const endDate = new Date(travelDate);
  endDate.setHours(23, 59, 59, 999);

  const trips = await Trip.aggregate([
    // 1️⃣ Match Trip (Indexed)
    {
      $match: {
        travelDate: { $gte: startDate, $lte: endDate },
        status: "scheduled",
      },
    },

    // 2️⃣ Join Route
    {
      $lookup: {
        from: "routes",
        localField: "routeId",
        foreignField: "_id",
        as: "route",
      },
    },
    { $unwind: "$route" },

    // 3️⃣ Normalize route fields (LOWERCASE)
    {
      $addFields: {
        "route.fromLower": { $toLower: "$route.from.stopName" },
        "route.toLower": { $toLower: "$route.to.stopName" },
        stopsLower: {
          $map: {
            input: "$route.stops",
            as: "stop",
            in: { $toLower: "$$stop.stopName" },
          },
        },
      },
    },

    // 4️⃣ SMART MATCH (from/to + stops)
    {
      $match: {
        $and: [
          {
            $or: [
              { "route.fromLower": { $regex: from } },
              { stopsLower: { $elemMatch: { $regex: from } } },
            ],
          },
          {
            $or: [
              { "route.toLower": { $regex: to } },
              { stopsLower: { $elemMatch: { $regex: to } } },
            ],
          },
        ],
      },
    },

    // 5️⃣ ADD MATCH QUALITY FLAGS
    {
      $addFields: {
        exactFromMatch: {
          $cond: [{ $eq: ["$route.fromLower", from] }, 1, 0],
        },
        exactToMatch: {
          $cond: [{ $eq: ["$route.toLower", to] }, 1, 0],
        },
        fromInStops: {
          $cond: [{ $in: [from, "$stopsLower"] }, 1, 0],
        },
        toInStops: {
          $cond: [{ $in: [to, "$stopsLower"] }, 1, 0],
        },
      },
    },

    // 6️⃣ HEURISTIC SCORING 🧠
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$exactFromMatch", 10] },
            { $multiply: ["$exactToMatch", 10] },
            { $multiply: ["$fromInStops", 5] },
            { $multiply: ["$toInStops", 5] },

            // More seats = better
            { $divide: ["$availableSeats", 5] },

            // Lower price = better
            { $divide: [1000, "$seatPrice"] },
          ],
        },
      },
    },

    // 7️⃣ SORT BEST RESULTS
    { $sort: { score: -1 } },

    // 8️⃣ Populate Bus (optional)
    {
      $lookup: {
        from: "buses",
        localField: "busId",
        foreignField: "_id",
        as: "bus",
      },
    },
    { $unwind: { path: "$bus", preserveNullAndEmptyArrays: true } },

    // 9️⃣ FINAL RESPONSE
    {
      $project: {
        travelDate: 1,
        departureTime: 1,
        arrivalTime: 1,
        seatPrice: 1,
        totalSeats: 1,
        availableSeats: 1,
        score: 1,
        "route.from": 1,
        "route.to": 1,
        "route.stops": 1,
        bus: 1,
      },
    },
  ]);

  const tripIds = trips.map((trip) => trip._id);
  const now = new Date();

  const [ticketCounts, lockCounts] = await Promise.all([
    Ticket.aggregate([
      {
        $match: {
          tripId: { $in: tripIds },
          ticketStatus: "confirmed"
        }
      },
      {
        $group: {
          _id: "$tripId",
          bookedSeatCount: { $sum: 1 }
        }
      }
    ]),
    SeatLock.aggregate([
      {
        $match: {
          tripId: { $in: tripIds },
          lockStatus: { $in: ["pending", "details_completed", "payment_initiated"] },
          holdExpiresAt: { $gt: now }
        }
      },
      {
        $project: {
          tripId: 1,
          lockedSeatCount: { $size: "$seatNumbers" }
        }
      },
      {
        $group: {
          _id: "$tripId",
          lockedSeatCount: { $sum: "$lockedSeatCount" }
        }
      }
    ])
  ]);

  const bookedMap = new Map(
    ticketCounts.map((item) => [item._id.toString(), item.bookedSeatCount])
  );
  const lockedMap = new Map(
    lockCounts.map((item) => [item._id.toString(), item.lockedSeatCount])
  );

  const tripsWithLiveSeats = trips.map((trip) => {
    const bookedSeatCount = bookedMap.get(trip._id.toString()) || 0;
    const lockedSeatCount = lockedMap.get(trip._id.toString()) || 0;
    const totalSeats = Number(trip.totalSeats || trip.bus?.totalSeats || 0);

    return {
      ...trip,
      bookedSeatCount,
      lockedSeatCount,
      availableSeatCount: Math.max(totalSeats - bookedSeatCount - lockedSeatCount, 0)
    };
  });

  res.status(200).json({
    status: "success",
    results: tripsWithLiveSeats.length,
    data: tripsWithLiveSeats,
  });
});

exports.getSuggestions = async (req, res) => {
  const Route = require("../../models/busRoutemodel");
  const validation = validateSuggestionQuery(req.query.query);

  if (validation.error) {
    return res.status(400).json({
      status: "fail",
      message: validation.error
    });
  }

  const query = validation.value;

  const suggestions = await Route.aggregate([
    {
      $project: {
        locations: {
          $setUnion: [
            ["$from.stopName"],
            ["$to.stopName"],
            "$stops.stopName",
          ],
        },
      },
    },
    { $unwind: "$locations" },
    {
      $match: {
        locations: { $regex: query, $options: "i" },
      },
    },
    {
      $group: { _id: "$locations" },
    },
    { $limit: 8 },
    {
      $project: { _id: 0, name: "$_id" },
    },
  ]);

  res.json({
    status: "success",
    data: suggestions,
  });
};
