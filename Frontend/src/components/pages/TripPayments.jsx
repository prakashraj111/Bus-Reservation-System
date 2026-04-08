import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import "../css/tripPayments.css";

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

function TripPayments() {
  const { tripId } = useParams();
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPayments = async () => {
      try {
        const response = await api.get(`/api/trip/${tripId}/payments`);
        if (!isMounted) return;
        setPayload(response.data?.data || null);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load seat payment history"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const trip = payload?.trip;
  const payments = payload?.paymentsBySeat || [];
  const bus = trip?.busId || {};
  const route = trip?.routeId || {};

  return (
    <main className="trip-payments-page">
      <section className="trip-payments-shell">
        <div className="trip-payments-header">
          <div>
            <p className="trip-payments-kicker">Seat payment history</p>
            <h1>{bus.busName || "Trip Payments"}</h1>
            <p>
              {route?.from?.stopName || "Origin"} to {route?.to?.stopName || "Destination"}
            </p>
          </div>
          <Link className="trip-payments-back" to="/my-scheduled-bus">
            Back to Schedules
          </Link>
        </div>

        {status.message ? (
          <div className={`trip-payments-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isLoading ? (
          <div className="trip-payments-empty">Loading payment history...</div>
        ) : payments.length ? (
          <div className="trip-payments-table-wrap">
            <table className="trip-payments-table">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Passenger</th>
                  <th>Ticket No.</th>
                  <th>Booking Code</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((item) => (
                  <tr key={item.ticketId}>
                    <td>{item.seatLabel}</td>
                    <td>{item.passengerName}</td>
                    <td>{item.ticketNumber}</td>
                    <td>{item.bookingCode}</td>
                    <td>Rs. {item.amount}</td>
                    <td>{item.paymentStatus}</td>
                    <td>{item.paymentMethod}</td>
                    <td>{item.transactionId || "N/A"}</td>
                    <td>{formatDate(item.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="trip-payments-empty">
            No confirmed seat payments found for this trip yet.
          </div>
        )}
      </section>
    </main>
  );
}

export default TripPayments;
