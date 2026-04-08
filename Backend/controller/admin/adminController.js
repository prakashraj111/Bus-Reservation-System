const Bus = require("../../models/busModel");
const Booking = require("../../models/bookingModel");
const Payment = require("../../models/paymentModel");
const SeatLock = require("../../models/seatLockModel");
const Ticket = require("../../models/ticketModel");
const Trip = require("../../models/tripModel");
const catchAsync = require("../../utils/catchAsync");

const attachLiveSeatStats = async (trips) => {
  if (!trips?.length) return [];

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

  const ticketMap = new Map(
    ticketCounts.map((item) => [item._id.toString(), item.bookedSeatCount])
  );
  const lockMap = new Map(
    lockCounts.map((item) => [item._id.toString(), item.lockedSeatCount])
  );

  return trips.map((trip) => {
    const tripObject = trip.toObject ? trip.toObject() : trip;
    const bookedSeatCount = ticketMap.get(trip._id.toString()) || 0;
    const lockedSeatCount = lockMap.get(trip._id.toString()) || 0;

    return {
      ...tripObject,
      bookedSeatCount,
      lockedSeatCount,
      availableSeatCount: Math.max((tripObject.totalSeats || 0) - bookedSeatCount - lockedSeatCount, 0)
    };
  });
};

exports.getAdminDashboard = catchAsync(async (req, res) => {
  const [buses, tripsRaw, bookings, payments] = await Promise.all([
    Bus.find()
      .populate("driverId", "username email role")
      .sort({ createdAt: -1 }),
    Trip.find()
      .populate("busId")
      .populate("driverId", "username email role")
      .populate("routeId")
      .sort({ travelDate: -1, departureTime: -1 }),
    Booking.find()
      .populate("userId", "username email role")
      .populate({
        path: "tripId",
        populate: [{ path: "busId" }, { path: "routeId" }]
      })
      .sort({ createdAt: -1 }),
    Payment.find()
      .populate({
        path: "seatLockId",
        populate: {
          path: "tripId",
          populate: [{ path: "busId" }, { path: "routeId" }]
        }
      })
      .populate("bookingId")
      .sort({ createdAt: -1 })
  ]);

  const trips = await attachLiveSeatStats(tripsRaw);

  const stats = {
    totalBuses: buses.length,
    totalTrips: trips.length,
    scheduledTrips: trips.filter((trip) => trip.status === "scheduled").length,
    cancelledTrips: trips.filter((trip) => trip.status === "cancelled").length,
    completedTrips: trips.filter((trip) => trip.status === "completed").length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((booking) => booking.bookingStatus === "confirmed").length,
    totalPayments: payments.length,
    paidPayments: payments.filter((payment) => payment.paymentStatus === "paid").length,
    totalRevenue: payments
      .filter((payment) => payment.paymentStatus === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  };

  res.status(200).json({
    success: true,
    data: {
      stats,
      buses,
      trips,
      bookings,
      payments
    }
  });
});
