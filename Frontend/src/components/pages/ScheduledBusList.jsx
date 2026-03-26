import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/scheduledBus.css";
import api from "../../services/api";
import busFallbackImage from "../../assets/bus5.png";

function ScheduledBusList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const fetchTrips = async () => {
      setStatus({ type: "", message: "" });

      try {
        const response = await api.get("/api/trip/scheduled");
        const tripList = response.data?.data || [];

        if (isMounted) {
          setTrips(tripList);
        }
      } catch (error) {
        const message =
          error?.response?.status === 404
            ? "No scheduled buses found yet."
            : error?.response?.data?.message ||
              error?.message ||
              "Failed to load scheduled buses";

        if (isMounted) {
          setTrips([]);
          setStatus({
            type: error?.response?.status === 404 ? "success" : "error",
            message
          });
        }
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

  const handleDelete = async (tripId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this scheduled bus?"
    );

    if (!confirmed) return;

    try {
      const response = await api.delete(`/api/trip/${tripId}`);

      setTrips((currentTrips) => currentTrips.filter((trip) => trip._id !== tripId));
      setStatus({
        type: "success",
        message: response.data?.message || "Schedule deleted successfully"
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete schedule";

      setStatus({ type: "error", message });
    }
  };

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

      {trips.length ? (
        <div className="scheduled-bus-list">
          {trips.map((trip) => {
            const bus = trip.busId || {};
            const bookedSeats = getBookedSeatCount(trip);

            return (
              <article key={trip._id} className="scheduled-bus-card">
                <div className="scheduled-bus-main">
                  <div className="scheduled-bus-menu">...</div>

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

                <div className="scheduled-bus-actions">
                  <button type="button" onClick={() => handleEdit(trip)}>
                    Update Schedule
                  </button>
                  <button type="button" onClick={() => handleDelete(trip._id)}>
                    Delete Schedule
                  </button>
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
                        state: { busId: bus._id }
                      })
                    }
                  >
                    View Bus Route
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="scheduled-bus-empty">
          No scheduled buses to show right now.
        </div>
      )}
    </section>
  );
}

export default ScheduledBusList;
