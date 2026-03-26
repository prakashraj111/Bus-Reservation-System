import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../css/myBookings.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

function MyBookings() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await api.get("/api/booking");
        if (!isMounted) return;
        setItems(response.data?.data || []);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load your bookings"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="my-bookings-page">
      <section className="my-bookings-shell">
        <div className="my-bookings-header">
          <div>
            <p className="my-bookings-kicker">My bookings</p>
            <h1>Your booking history</h1>
          </div>
          <Link className="my-bookings-cta" to="/bus-service">
            Book New Trip
          </Link>
        </div>

        {status.message ? (
          <div className={`my-bookings-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isLoading ? (
          <div className="my-bookings-empty">Loading bookings...</div>
        ) : items.length ? (
          <div className="my-bookings-list">
            {items.map((item) => {
              const booking = item.booking;
              const trip = booking?.tripId;
              const route = trip?.routeId;

              return (
                <article key={booking._id} className="my-booking-card">
                  <div>
                    <p className="code">{booking.bookingCode}</p>
                    <h3>
                      {route?.from?.stopName || "Origin"} to {route?.to?.stopName || "Destination"}
                    </h3>
                    <p>{formatDate(trip?.travelDate)}</p>
                  </div>

                  <div className="meta">
                    <span>{booking.seatCount} seats</span>
                    <span>{booking.bookingStatus}</span>
                    <span>{item.payment?.paymentStatus || "payment pending"}</span>
                  </div>

                  <div className="actions">
                    <Link to={`/booking/${booking._id}/details`}>Passenger Details</Link>
                    <Link to={`/booking/${booking._id}/tickets`}>View Tickets</Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="my-bookings-empty">No bookings found yet.</div>
        )}
      </section>
    </main>
  );
}

export default MyBookings;
