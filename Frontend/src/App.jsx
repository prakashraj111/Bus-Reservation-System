import React from "react";
import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";
import BookSeat from "./components/pages/BookSeat";
import Home from "./components/pages/Home";
import { Route, Routes } from "react-router-dom";
import AdminDashboard from "./components/pages/AdminDashboard";
import Services from "./components/pages/Services";
import BusRoute from "./components/pages/BusRoute";
import BusService from "./components/pages/BusService";
import MyProfile from "./components/pages/MyProfile";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Logout from "./components/pages/Logout";
import ProtectedRoute from "./components/ProtectedRoute";
import CreatePost from "./components/pages/CreatePostForm";
import AddBusRoute from "./components/pages/AddBusRouteForm";
import TripForm from "./components/pages/ScheduleTripForm";
import UpdateBusPost from "./components/pages/UpdatePostForm";
import MyBus from "./components/pages/MyBus";
import ViewMyBus from "./components/pages/ViewMyBus";
import UpdateBusRoute from "./components/pages/UpdateBusRouteForm";
import ScheduledBusList from "./components/pages/ScheduledBusList";
import BookingDetails from "./components/pages/BookingDetails";
import BookingTickets from "./components/pages/BookingTickets";
import MyBookings from "./components/pages/MyBookings";
import TripPayments from "./components/pages/TripPayments";
import MyPayments from "./components/pages/MyPayments";
import { NotificationProvider } from "./components/notifications/NotificationProvider";


function App() {
  return (
    <NotificationProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/services" element={<Services />} />
        <Route path="/book-seat" element={<BookSeat />} />
        <Route path="/book-seat/:tripId" element={<BookSeat />} />
        <Route
          path="/seat-lock/:seatLockId/details"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seat-lock/:seatLockId/details/esewa/:paymentOutcome"
          element={
            <ProtectedRoute>
              <BookingDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/:bookingId/tickets"
          element={
            <ProtectedRoute>
              <BookingTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-payments"
          element={
            <ProtectedRoute>
              <MyPayments />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<MyProfile />} />
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/bus-route" element={<BusRoute />} />
        <Route path="/bus-service" element={<BusService />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/edit-post" element={<UpdateBusPost />} />
        <Route path="/my-bus" element={<MyBus />} />
        <Route path="/view-my-bus" element={<ViewMyBus />} />
        <Route path="/my-scheduled-bus" element={<ScheduledBusList />} />
        <Route
          path="/trip/:tripId/payments"
          element={
            <ProtectedRoute>
              <TripPayments />
            </ProtectedRoute>
          }
        />
        <Route path="/add-bus-route" element={<AddBusRoute />} />
        <Route path="/update-bus-route" element={<UpdateBusRoute />} />
        <Route path="/schedule-trip" element={<TripForm />} />
      </Routes>
      <Footer />
    </NotificationProvider>
  );
}

export default App;
