const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const { connectDatabase } = require("./database");
const { getTripRoom, setSocketServer } = require("./utils/socket");
const { releaseExpiredSeatLocks } = require("./utils/seatLockService");
require("dotenv").config();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./uploads"));

const authRoute = require("./routes/auth/authRoute");
const adminRoutes = require("./routes/admin/adminRoute");
const driverRoutes = require("./routes/driver/driverRoute");
const driverBusRoute = require("./routes/driver/driverBusRoute");
const driverBusTripRoute = require("./routes/driver/busTripRoute");
const userBookingRoutes = require("./routes/user/userBookingRoute");
const userPaymentRoutes = require("./routes/user/userPaymentRoute");
const userReviewRoutes = require("./routes/user/userReviewRoute");
const userSeatLockRoutes = require("./routes/user/userSeatLockRoute");
const userTicketRoutes = require("./routes/user/userTicketRoute");
const errorHandler = require("./middleware/errorMiddleware");

connectDatabase(process.env.MONGO_URI);

app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/bus", driverRoutes);
app.use("/api/bus/route", driverBusRoute);
app.use("/api/trip", driverBusTripRoute);
app.use("/api/bus/:busId/route/:routeId/trip", driverBusTripRoute);
app.use("/api/trip/:tripId/book", userBookingRoutes);
app.use("/api/bus/:id/review", userReviewRoutes);
app.use("/api/seat-lock", userSeatLockRoutes);
app.use("/api/seat-lock/:seatLockId/pay", userPaymentRoutes);
app.use("/api/payment", userPaymentRoutes);
app.use("/api/booking", userTicketRoutes);

app.use(errorHandler);

const cron = require("node-cron");
const Trip = require("./models/tripModel");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }
});

setSocketServer(io);

io.on("connection", (socket) => {
  socket.on("trip:join", (tripId) => {
    if (!tripId) return;
    socket.join(getTripRoom(tripId));
  });

  socket.on("trip:leave", (tripId) => {
    if (!tripId) return;
    socket.leave(getTripRoom(tripId));
  });
});

cron.schedule("* * * * *", async () => {
  try {
    await releaseExpiredSeatLocks();

    const now = new Date();
    const trips = await Trip.find({ status: "scheduled" });

    for (const trip of trips) {
      const [hours, minutes] = trip.arrivalTime.split(":");
      const arrivalDateTime = new Date(trip.travelDate);
      arrivalDateTime.setHours(Number(hours), Number(minutes), 0, 0);

      if (now >= arrivalDateTime) {
        trip.status = "completed";
        await trip.save();
        console.log(`Trip ${trip._id} marked as completed`);
      }
    }
  } catch (error) {
    console.error("Cron job failed:", error.message);
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server is listening to PORT ${process.env.PORT}`);
});
