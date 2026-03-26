import React from "react";
import Footer from "./components/footer/Footer";
import Navbar from "./components/navbar/Navbar";
import BookSeat from "./components/pages/BookSeat";
import Home from "./components/pages/Home";
import { Route, Routes } from "react-router-dom";
import About from "./components/pages/About";
import Services from "./components/pages/Services";
import ViewBusCategory from "./components/pages/ViewBusCategory";
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


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book-seat" element={<BookSeat />} />
        <Route path="/book-seat/:tripId" element={<BookSeat />} />
        <Route
          path="/booking/:bookingId/details"
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
        <Route path="/category" element={<ViewBusCategory />} />
        <Route path="/bus-route" element={<BusRoute />} />
        <Route path="/bus-service" element={<BusService />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/edit-post" element={<UpdateBusPost />} />
        <Route path="/my-bus" element={<MyBus />} />
        <Route path="/view-my-bus" element={<ViewMyBus />} />
        <Route path="/my-scheduled-bus" element={<ScheduledBusList />} />
        <Route path="/add-bus-route" element={<AddBusRoute />} />
        <Route path="/update-bus-route" element={<UpdateBusRoute />} />
        <Route path="/schedule-trip" element={<TripForm />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
