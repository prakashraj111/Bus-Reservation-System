import "./navbar.css";
import { FaPhoneAlt } from "react-icons/fa";
import logo from "../../assets/logo.png";
import React from "react";
import { NavLink } from "react-router-dom";
import { getAuthToken } from "../../utils/auth";

function Navbar() {
  const isAuthed = Boolean(getAuthToken());

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <img src={logo} alt="GBus logo" className="brand-logo" />

        <nav className="menu">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/category">Bus</NavLink>
          <NavLink to="/bus-service">Services</NavLink>
          <NavLink to="/my-profile">My Profile</NavLink>
          {!isAuthed ? <NavLink to="/login">Login</NavLink> : null}
          {!isAuthed ? <NavLink to="/register">Register</NavLink> : null}
          {isAuthed ? <NavLink to="/logout">Logout</NavLink> : null}
        </nav>

        <div className="topbar-actions">
          <div className="contact-pill">
            <span className="contact-icon">
              <FaPhoneAlt />
            </span>
            <div>
              <p>Contact Us</p>
              <p>+977 9800000000</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
