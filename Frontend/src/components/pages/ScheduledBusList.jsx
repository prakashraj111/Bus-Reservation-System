import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/scheduledBus.css";
import api from "../../services/api";
import busFallbackImage from "../../assets/bus5.png";
import { useNotification } from "../notifications/NotificationProvider";

function ScheduledBusList() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [cancelledTrips, setCancelledTrips] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [openMenuId, setOpenMenuId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTripGroup = async (endpoint) => {
      try {
        const response = await api.get(endpoint);
        return response.data?.data || [];
      } catch (error) {
        if (error?.response?.status === 404) {
          return [];
        }
        throw error;
      }
    };

    const fetchTrips = async () => {
      setStatus({ type: "", message: "" });

      try {
        const [scheduled, cancelled, completed] = await Promise.all([
          fetchTripGroup("/api/trip/scheduled"),
          fetchTripGroup("/api/trip/cancelled"),
          fetchTripGroup("/api/trip/completed")
        ]);

        if (!isMounted) return;

        setScheduledTrips(scheduled);
        setCancelledTrips(cancelled);
        setCompletedTrips(completed);
      } catch (error) {
        if (!isMounted) return;

        setScheduledTrips([]);
        setCancelledTrips([]);
        setCompletedTrips([]);
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load bus schedules"
        });
      }
    };

    fetchTrips();

    return () => {
      isMounted = false;
    };
  }, []);

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return busFallbackImage;
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = api.defaults.baseURL || "";
    return `${baseUrl}/${imageUrl}`;
  };

  const formatDate = (value) => {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getBookedSeatCount = (trip) => {
    if (typeof trip?.bookedSeatCount === "number") {
      return trip.bookedSeatCount;
    }

    if (Array.isArray(trip?.bookedSeats)) {
      return trip.bookedSeats.length;
    }

    if (
      typeof trip?.totalSeats === "number" &&
      typeof trip?.availableSeats === "number"
    ) {
      return Math.max(trip.totalSeats - trip.availableSeats, 0);
    }

    return 0;
  };

  const handleEdit = (trip) => {
    navigate("/schedule-trip", {
      state: {
        tripId: trip._id,
        trip,
        busId: trip.busId?._id,
        routeId: trip.routeId?._id
      }
    });
  };

  const handleCancel = async (tripId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this scheduled bus?"
    );

    if (!confirmed) return;

    try {
      const response = await api.patch(`/api/trip/${tripId}/cancel`);

      let cancelledTrip = null;
      setScheduledTrips((currentTrips) =>
        currentTrips.filter((trip) => {
          if (trip._id === tripId) {
            cancelledTrip = { ...trip, status: "cancelled" };
            return false;
          }
          return true;
        })
      );

      if (cancelledTrip) {
        setCancelledTrips((currentTrips) => [cancelledTrip, ...currentTrips]);
      }

      setOpenMenuId("");
      setStatus({
        type: "success",
        message: response.data?.message || "Schedule cancelled successfully"
      });
      showSuccess(response.data?.message || "Schedule cancelled successfully");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to cancel schedule";

      setStatus({ type: "error", message });
      showError(message);
    }
  };

  const renderTripCard = (trip, sectionKey) => {
    const bus = trip.busId || {};
    const bookedSeats = getBookedSeatCount(trip);
    const menuKey = `${sectionKey}-${trip._id}`;
    const isMenuOpen = openMenuId === menuKey;

    return (
      <article key={trip._id} className="scheduled-bus-card">
        <div className="scheduled-bus-main">
          <button
            type="button"
            className="scheduled-bus-menu"
            onClick={() => setOpenMenuId(isMenuOpen ? "" : menuKey)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle schedule actions"
          >
            ...
          </button>

          <div className="scheduled-bus-image-box">
            <img
              src={resolveImageUrl(bus.imageUrl)}
              alt={bus.busName || "Bus"}
            />
          </div>

          <div className="scheduled-bus-center">
            <div>
              <p className="scheduled-bus-field-label">bus name</p>
              <div className="scheduled-bus-field-value">
                {bus.busName || "Unknown Bus"}
              </div>
            </div>

            <div>
              <p className="scheduled-bus-field-label">travel date</p>
              <div className="scheduled-bus-field-value">
                {formatDate(trip.travelDate)}
              </div>
            </div>
          </div>

          <div className="scheduled-bus-stat">
            <div className="scheduled-bus-stat-label">booked seats</div>
            <div className="scheduled-bus-stat-value">{bookedSeats}</div>
          </div>

          <div className="scheduled-bus-stat">
            <div className="scheduled-bus-stat-label">total seats</div>
            <div className="scheduled-bus-stat-value">
              {trip.totalSeats || bus.totalSeats || 0}
            </div>
          </div>
        </div>

        {isMenuOpen ? (
          <div className="scheduled-bus-actions">
            {sectionKey === "scheduled" ? (
              <>
                <button type="button" onClick={() => handleEdit(trip)}>
                  Update Schedule
                </button>
                <button
                  type="button"
                  onClick={() => handleCancel(trip._id)}
                >
                  Cancel Schedule
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() =>
                navigate("/view-my-bus", {
                  state: { busId: bus._id }
                })
              }
            >
              View Bus Info
            </button>
            <button
              type="button"
              onClick={() =>
                navigate("/bus-route", {
                  state: { busId: bus._id, trip }
                })
              }
            >
              View Bus Route
            </button>
            <button
              type="button"
              onClick={() => navigate(`/trip/${trip._id}/payments`)}
            >
              View Payments
            </button>
          </div>
        ) : null}
      </article>
    );
  };

  const renderSection = (title, trips, sectionKey, emptyMessage) => (
    <section className="scheduled-bus-section">
      <div className="scheduled-bus-section-head">
        <h3>{title}</h3>
        <span>{trips.length}</span>
      </div>

      {trips.length ? (
        <div className="scheduled-bus-list">
          {trips.map((trip) => renderTripCard(trip, sectionKey))}
        </div>
      ) : (
        <div className="scheduled-bus-empty">{emptyMessage}</div>
      )}
    </section>
  );

  return (
    <section className="scheduled-bus-page">
      <div className="scheduled-bus-header">
        <h2>Scheduled Buses</h2>
      </div>

      {status.message ? (
        <div className={`scheduled-bus-status ${status.type}`}>
          {status.message}
        </div>
      ) : null}

      {renderSection(
        "Scheduled Buses List",
        scheduledTrips,
        "scheduled",
        "No scheduled buses to show right now."
      )}

      {renderSection(
        "Cancelled Buses List",
        cancelledTrips,
        "cancelled",
        "No cancelled buses to show right now."
      )}

      {renderSection(
        "Completed Buses List",
        completedTrips,
        "completed",
        "No completed buses to show right now."
      )}
    </section>
  );
}

export default ScheduledBusList;
