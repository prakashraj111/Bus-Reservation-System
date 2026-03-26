import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { clearAuth } from "../../utils/auth";
import "../css/auth.css";

function Logout() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Logging out...");

  useEffect(() => {
    let isMounted = true;
    const performLogout = async () => {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // Ignore logout errors and still clear client state.
      } finally {
        clearAuth();
        if (isMounted) {
          setMessage("You have been logged out.");
          setTimeout(() => navigate("/login"), 500);
        }
      }
    };

    performLogout();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h2>Logout</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

export default Logout;
