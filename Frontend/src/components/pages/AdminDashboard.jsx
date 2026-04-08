import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getAuthUser } from "../../utils/auth";
import "../css/adminDashboard.css";
import { useNotification } from "../notifications/NotificationProvider";

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-NP")}`;

const formatRouteLabel = (route) => {
  const from = route?.from?.stopName || "Origin";
  const to = route?.to?.stopName || "Destination";
  return `${from} to ${to}`;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useNotification();
  const user = getAuthUser();
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("buses");
  const [actionState, setActionState] = useState({ key: "", label: "" });
  useEffect(() => {
    if (user?.role !== "admin") return undefined;

    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setStatus({ type: "", message: "" });

      try {
        const response = await api.get("/api/admin/dashboard");
        if (!isMounted) return;
        setPayload(response.data?.data || null);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load admin dashboard data"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.role]);
  const refreshDashboard = async (successMessage = "") => {
    try {
      const response = await api.get("/api/admin/dashboard");
      setPayload(response.data?.data || null);
      if (successMessage) {
        setStatus({ type: "success", message: successMessage });
        showSuccess(successMessage);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to refresh dashboard data";
      setStatus({ type: "error", message });
      showError(message);
    }
  };
  const setRunningAction = (key, label) => {
    setActionState({ key, label });
    setStatus({ type: "", message: "" });
  };
  const clearRunningAction = () => {
    setActionState({ key: "", label: "" });
  };
  const handleDeleteBus = async (bus) => {
    if (!bus?._id) return;

    const confirmed = window.confirm(`Delete "${bus.busName || "this bus"}"?`);
    if (!confirmed) return;

    setRunningAction(`delete-bus-${bus._id}`, "Deleting...");

    try {
      await api.delete(`/api/bus/${bus._id}`);
      await refreshDashboard("Bus deleted successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to delete bus";
      setStatus({ type: "error", message });
      showError(message);
    } finally {
      clearRunningAction();
    }
  };
  const handleCancelTrip = async (trip) => {
    if (!trip?._id) return;

    const confirmed = window.confirm("Cancel this trip schedule?");
    if (!confirmed) return;

    setRunningAction(`cancel-trip-${trip._id}`, "Cancelling...");

    try {
      await api.patch(`/api/trip/${trip._id}/cancel`);
      await refreshDashboard("Trip cancelled successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to cancel trip";
      setStatus({ type: "error", message });
      showError(message);
    } finally {
      clearRunningAction();
    }
  };
  const handlePaymentStatusUpdate = async (payment, nextStatus) => {
    if (!payment?._id) return;

    const endpoint = nextStatus === "paid" ? "paid" : "failed";
    setRunningAction(`${endpoint}-payment-${payment._id}`, nextStatus === "paid" ? "Marking paid..." : "Marking failed...");

    try {
      await api.patch(`/api/payment/${payment._id}/${endpoint}`, {
        transactionId: payment.transactionId
      });
      await refreshDashboard(`Payment marked as ${nextStatus}.`);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to update payment status";
      setStatus({ type: "error", message });
      showError(message);
    } finally {
      clearRunningAction();
    }
  };
  const stats = payload?.stats || {};
  const buses = payload?.buses || [];
  const trips = payload?.trips || [];
  const bookings = payload?.bookings || [];
  const payments = payload?.payments || [];
  const statsCards = useMemo(
    () => [
      { label: "Total buses", value: stats.totalBuses || 0 },
      { label: "Total trips", value: stats.totalTrips || 0 },
      { label: "Scheduled trips", value: stats.scheduledTrips || 0 },
      { label: "Confirmed bookings", value: stats.confirmedBookings || 0 },
      { label: "Paid payments", value: stats.paidPayments || 0 }
    ],
    [stats]
  );
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/my-profile" replace />;
  }
  return (
    <main className="admin-dashboard-page">
      <section className="admin-dashboard-shell">
        <div className="admin-dashboard-hero">
          <div>
            <p className="admin-kicker">System control</p>
            <h1>Admin Dashboard</h1>
            <p className="admin-hero-copy">
              Manage buses, trips, bookings, and payment records from one operational workspace.
            </p>
          </div>

          <div className="admin-hero-actions">
            <Link to="/create-post" className="admin-hero-btn primary">
              Add Bus
            </Link>
            <button
              type="button"
              className="admin-hero-btn secondary"
              onClick={() => {
                showInfo("Refreshing dashboard data");
                refreshDashboard("Dashboard refreshed successfully.");
              }}
            >
              Refresh Data
            </button>
          </div>
        </div>

        {status.message ? (
          <div className={`admin-status ${status.type}`}>{status.message}</div>
        ) : null}

        <div className="admin-stats-grid">
          {statsCards.map((card) => (
            <article key={card.label} className="admin-stat-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>

        <div className="admin-section-tabs">
          {[
            { id: "buses", label: `Buses (${buses.length})` },
            { id: "trips", label: `Trips (${trips.length})` },
            { id: "bookings", label: `Bookings (${bookings.length})` },
            { id: "payments", label: `Payments (${payments.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab-btn ${activeSection === tab.id ? "active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? <div className="admin-panel-empty">Loading dashboard...</div> : null}

        {!isLoading && activeSection === "buses" ? (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-kicker">Bus registry</p>
                <h2>All buses</h2>
              </div>
            </div>

            {buses.length ? (
              <div className="admin-record-grid">
                {buses.map((bus) => (
                  <article key={bus._id} className="admin-record-card">
                    <div className="admin-record-top">
                      <div>
                        <h3>{bus.busName || "Unnamed bus"}</h3>
                        <p>{bus.operator || "No operator"}</p>
                      </div>
                      <span className="admin-badge neutral">{bus.type || "bus"}</span>
                    </div>

                    <div className="admin-record-meta">
                      <span>Plate: {bus.busNumberPlate || "N/A"}</span>
                      <span>Seats: {bus.totalSeats || 0}</span>
                      <span>Driver: {bus.driverId?.username || bus.driverId?.email || "Unassigned"}</span>
                    </div>

                    <div className="admin-record-actions">
                      <button
                        type="button"
                        onClick={() => navigate("/view-my-bus", { state: { busId: bus._id } })}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/edit-post", { state: { busId: bus._id, bus } })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/bus-route", { state: { busId: bus._id } })}
                      >
                        Route
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/bus-route", { state: { busId: bus._id, intent: "schedule-trip" } })}
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteBus(bus)}
                        disabled={actionState.key === `delete-bus-${bus._id}`}
                      >
                        {actionState.key === `delete-bus-${bus._id}` ? actionState.label : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-panel-empty">No buses found in the system.</div>
            )}
          </section>
        ) : null}

        {!isLoading && activeSection === "trips" ? (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-kicker">Trip operations</p>
                <h2>All trips</h2>
              </div>
            </div>

            {trips.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Bus</th>
                      <th>Route</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Seats</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip._id}>
                        <td>{trip.busId?.busName || "Bus"}</td>
                        <td>{formatRouteLabel(trip.routeId)}</td>
                        <td>{formatDate(trip.travelDate)}</td>
                        <td>
                          <span className={`admin-badge ${trip.status || "neutral"}`}>{trip.status || "unknown"}</span>
                        </td>
                        <td>{trip.availableSeatCount ?? trip.availableSeats ?? 0} / {trip.totalSeats || 0}</td>
                        <td>
                          <div className="admin-inline-actions">
                            <button
                              type="button"
                              onClick={() =>
                                navigate("/schedule-trip", {
                                  state: {
                                    tripId: trip._id,
                                    trip,
                                    busId: trip.busId?._id,
                                    routeId: trip.routeId?._id
                                  }
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/trip/${trip._id}/payments`)}
                            >
                              Payments
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleCancelTrip(trip)}
                              disabled={trip.status !== "scheduled" || actionState.key === `cancel-trip-${trip._id}`}
                            >
                              {actionState.key === `cancel-trip-${trip._id}` ? actionState.label : "Cancel"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-panel-empty">No trips found in the system.</div>
            )}
          </section>
        ) : null}

        {!isLoading && activeSection === "bookings" ? (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-kicker">Booking history</p>
                <h2>All bookings</h2>
              </div>
            </div>

            {bookings.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>User</th>
                      <th>Trip</th>
                      <th>Seats</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id}>
                        <td>{booking.bookingCode || "N/A"}</td>
                        <td>{booking.userId?.username || booking.userId?.email || "Unknown user"}</td>
                        <td>
                          {(booking.tripId?.busId?.busName || "Bus")} <br />
                          <span className="admin-muted">{formatDate(booking.tripId?.travelDate)}</span>
                        </td>
                        <td>{booking.seatCount || 0}</td>
                        <td>
                          <span className={`admin-badge ${booking.bookingStatus || "neutral"}`}>
                            {booking.bookingStatus || "unknown"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-inline-actions">
                            <button
                              type="button"
                              onClick={() => navigate(`/booking/${booking._id}/tickets`)}
                            >
                              Tickets
                            </button>
                            {booking.tripId?.busId?._id ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/view-my-bus", {
                                    state: { busId: booking.tripId.busId._id }
                                  })
                                }
                              >
                                Bus
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-panel-empty">No bookings found in the system.</div>
            )}
          </section>
        ) : null}

        {!isLoading && activeSection === "payments" ? (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <p className="admin-kicker">Payment operations</p>
                <h2>All payments</h2>
              </div>
            </div>

            {payments.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Trip</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const trip = payment.seatLockId?.tripId;

                      return (
                        <tr key={payment._id}>
                          <td>{payment.transactionId || "No transaction id"}</td>
                          <td>
                            {(trip?.busId?.busName || "Bus")} <br />
                            <span className="admin-muted">{formatDate(trip?.travelDate)}</span>
                          </td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>
                            <span className={`admin-badge ${payment.paymentStatus || "neutral"}`}>
                              {payment.paymentStatus || "unknown"}
                            </span>
                          </td>
                          <td>{payment.method || "N/A"}</td>
                          <td>
                            <div className="admin-inline-actions">
                              {trip?._id ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/trip/${trip._id}/payments`)}
                                >
                                  Trip
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handlePaymentStatusUpdate(payment, "paid")}
                                disabled={payment.paymentStatus === "paid" || actionState.key === `paid-payment-${payment._id}`}
                              >
                                {actionState.key === `paid-payment-${payment._id}` ? actionState.label : "Mark Paid"}
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handlePaymentStatusUpdate(payment, "failed")}
                                disabled={payment.paymentStatus === "failed" || actionState.key === `failed-payment-${payment._id}`}
                              >
                                {actionState.key === `failed-payment-${payment._id}` ? actionState.label : "Mark Failed"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-panel-empty">No payments found in the system.</div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
export default AdminDashboard;
