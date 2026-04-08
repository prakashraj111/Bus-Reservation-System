import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/profile.css";
import api from "../../services/api";
import { getAuthUser, setAuth, getAuthToken } from "../../utils/auth";

function MyProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getAuthUser());
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isPromoting, setIsPromoting] = useState(false);
  const [showDriverPrompt, setShowDriverPrompt] = useState(true);
  const displayName = user?.username || "Guest User";
  const displayEmail = user?.email || "guest@example.com";
  const displayRole = user?.role || "guest";
  const isAdmin = displayRole === "admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GU";
  const isStandardUser = displayRole === "user";

  const actionGroups = useMemo(
    () => [
      ...(!isStandardUser
        ? [
            {
              title: "Bus Management",
              description: "Manage your buses, routes, and scheduled departures from one place.",
              links: [
                { to: "/create-post", label: "Add Bus", tone: "primary" },
                { to: "/my-bus", label: "My Bus List", tone: "secondary" },
                { to: "/my-scheduled-bus", label: "Scheduled Trips", tone: "secondary" }
              ]
            }
          ]
        : []),
      ...(isAdmin
        ? [
            {
              title: "Admin Operations",
              description: "Monitor the full system, moderate records, and act across buses, trips, bookings, and payments.",
              links: [{ to: "/admin-dashboard", label: "Open Admin Dashboard", tone: "primary" }]
            }
          ]
        : []),
      {
        title: "Bookings",
        description: "Track your reserved seats and jump back into the booking flow when needed.",
        links: [
          { to: "/my-bookings", label: "View Tickets", tone: "primary" },
          { to: "/bus-service", label: "Book More", tone: "secondary" }
        ]
      },
      {
        title: "Payments",
        description: "Review the payment records connected to your confirmed and pending trips.",
        links: [{ to: "/my-payments", label: "Payment History", tone: "primary" }]
      }
    ],
    [isAdmin, isStandardUser]
  );

  const handleBecomeDriver = async () => {
    setIsPromoting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await api.post("/api/auth/become-driver");
      const token = response.data?.token || getAuthToken();
      const nextUser = response.data?.data || null;

      if (nextUser) {
        setAuth(token, nextUser);
        setUser(nextUser);
      }

      setStatus({
        type: "success",
        message: response.data?.message || "Your profile is now ready for driver features."
      });

      navigate("/create-post");
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to enable driver features right now."
      });
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar">{initials}</div>
          <div>
            <p className="profile-kicker">Account dashboard</p>
            <h1>{displayName}</h1>
            <p className="profile-subtitle">
              Keep your trips, bookings, and payment history organized in one clean workspace.
            </p>
          </div>
        </div>

        <div className="profile-summary-grid">
          <div className="profile-summary-item">
            <span>Email</span>
            <strong>{displayEmail}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Role</span>
            <strong className="role-badge">{displayRole}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Status</span>
            <strong>{user ? "Signed in" : "Guest mode"}</strong>
          </div>
        </div>

        {status.message ? (
          <div className={`profile-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isStandardUser && showDriverPrompt ? (
          <div className="profile-driver-prompt">
            <div>
              <p className="profile-kicker">Driver onboarding</p>
              <h2>Do You Own a Bus?</h2>
              <p>
                Choose <strong>Yes</strong> to unlock the driver profile, add bus information, and manage routes,
                schedules, and operations from your account.
              </p>
            </div>
            <div className="profile-driver-actions">
              <button
                type="button"
                className="profile-btn primary"
                onClick={handleBecomeDriver}
                disabled={isPromoting}
              >
                {isPromoting ? "Switching..." : "Yes"}
              </button>
              <button
                type="button"
                className="profile-btn secondary"
                onClick={() => {
                  setStatus({ type: "", message: "" });
                  setShowDriverPrompt(false);
                }}
                disabled={isPromoting}
              >
                No
              </button>
            </div>
          </div>
        ) : null}

        <div className="profile-actions">
          {user ? (
            <Link to="/logout" className="profile-btn danger">
              Logout
            </Link>
          ) : (
            <Link to="/login" className="profile-btn primary">
              Login
            </Link>
          )}
          {!user ? (
            <Link to="/register" className="profile-btn secondary">
              Register
            </Link>
          ) : null}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-head">
          <p className="profile-kicker">Quick access</p>
          <h2>Everything you need</h2>
        </div>

        <div className="profile-card-grid">
          {actionGroups.map((group) => (
            <article key={group.title} className="profile-card">
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div className="profile-card-actions">
                {group.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`profile-btn ${link.tone}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default MyProfile;
