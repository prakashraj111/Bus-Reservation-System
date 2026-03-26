
import React from "react";

import { Link } from "react-router-dom";
import "../css/profile.css";
import { getAuthUser } from "../../utils/auth";

function MyProfile() {
  const user = getAuthUser();
  const displayName = user?.username || "Guest User";
  const displayEmail = user?.email || "guest@example.com";
  const displayRole = user?.role || "guest";

  return (
    <section className="profile-page">
      <div className="profile-card">
        <h2>My Profile</h2>
        <p><strong>Name:</strong> {displayName}</p>
        <p><strong>Email:</strong> {displayEmail}</p>
        <p><strong>Role:</strong> {displayRole}</p>
        <div className="profile-actions">
          <Link to="/logout" className="profile-btn">Logout</Link>
          {!user ? (
            <Link to="/login" className="profile-btn">Login</Link>
          ) : null}
        </div>
      </div>
      <div className="profile-card">
        <h3>My Buses</h3>
        <Link to="/create-post">Upload Your Bus Infromation</Link>
      </div>
      <div>
          <Link to="/my-bus">Get Your Bus List</Link>
      </div>
      <div>
          <Link to="/my-scheduled-bus">Your Scheduled Bus </Link>
      </div>

      <div className="profile-card">
        <h3>My Bookings</h3>
        <div className="profile-actions">
          <Link to="/my-bookings" className="profile-btn secondary">View Tickets</Link>
          <Link to="/bus-service" className="profile-btn">Book More</Link>
        </div>
      </div>
    </section>
  );
}

export default MyProfile;
