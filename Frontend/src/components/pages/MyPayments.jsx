import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../css/myPayments.css";

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "N/A";
  return `NPR ${amount.toLocaleString("en-US")}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

function MyPayments() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await api.get("/api/payment/my");
        if (!isMounted) return;
        setItems(response.data?.data || []);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load your payment history"
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
    <main className="my-payments-page">
      <section className="my-payments-shell">
        <div className="my-payments-header">
          <div>
            <p className="my-payments-kicker">My payments</p>
            <h1>Your payment history</h1>
            <p>All transactions created from your bookings are listed here.</p>
          </div>
          <Link className="my-payments-back" to="/my-profile">
            Back To Profile
          </Link>
        </div>

        {status.message ? (
          <div className={`my-payments-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isLoading ? (
          <div className="my-payments-empty">Loading payment history...</div>
        ) : items.length ? (
          <div className="my-payments-list">
            {items.map((payment) => {
              const seatLock = payment.seatLockId;
              const trip = seatLock?.tripId;
              const route = trip?.routeId;

              return (
                <article key={payment._id} className="my-payment-card">
                  <div className="my-payment-top">
                    <div>
                      <p className="transaction-code">{payment.transactionId || "No transaction id"}</p>
                      <h3>
                        {route?.from?.stopName || "Origin"} to {route?.to?.stopName || "Destination"}
                      </h3>
                      <p>{formatDate(trip?.travelDate)}</p>
                    </div>
                    <div className={`payment-badge ${payment.paymentStatus}`}>
                      {payment.paymentStatus}
                    </div>
                  </div>

                  <div className="my-payment-meta">
                    <span>{formatCurrency(payment.amount)}</span>
                    <span>{payment.method || "N/A"}</span>
                    <span>{seatLock?.seatCount || 0} seats</span>
                    <span>Paid: {formatDate(payment.paidAt)}</span>
                  </div>

                  <div className="my-payment-actions">
                    {payment.bookingId?._id ? (
                      <Link to={`/booking/${payment.bookingId._id}/tickets`}>View Tickets</Link>
                    ) : (
                      <span className="pending-note">Booking not confirmed yet</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="my-payments-empty">No payment transactions found for your account yet.</div>
        )}
      </section>
    </main>
  );
}

export default MyPayments;
