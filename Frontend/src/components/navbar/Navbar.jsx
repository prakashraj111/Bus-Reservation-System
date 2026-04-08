import "./navbar.css";
import { FaPhoneAlt } from "react-icons/fa";
import logo from "../../assets/logo.png";
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { AUTH_STATE_EVENT, getAuthToken } from "../../utils/auth";

function Navbar() {
  const [isAuthed, setIsAuthed] = useState(Boolean(getAuthToken()));

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthed(Boolean(getAuthToken()));
    };

    window.addEventListener(AUTH_STATE_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <img src={logo} alt="GBus logo" className="brand-logo" />

        <nav className="menu">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/bus-service">Services</NavLink>
          <NavLink to={isAuthed ? "/my-profile" : "/login"}>
            {isAuthed ? "My Profile" : "Sign In"}
          </NavLink>
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
