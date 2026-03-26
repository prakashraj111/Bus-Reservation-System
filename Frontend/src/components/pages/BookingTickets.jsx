import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaDownload, FaFilePdf } from "react-icons/fa";
import api from "../../services/api";
import "../css/bookingTickets.css";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

function BookingTickets() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verificationRef = useRef("");

  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const response = await api.get(`/api/booking/${bookingId}/tickets`);
        if (!isMounted) return;
        setPayload(response.data?.data);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load confirmed tickets"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const paymentStatus = searchParams.get("payment");

    if (!bookingId || !paymentId || !paymentStatus) return;

    const verificationKey = `${bookingId}:${paymentId}:${paymentStatus}:${searchParams.get("data") || ""}`;
    if (verificationRef.current === verificationKey) return;
    verificationRef.current = verificationKey;

    const verifyPayment = async () => {
      setStatus({ type: "", message: "" });
      setIsLoading(true);

      try {
        const response = await api.post(
          `/api/book/${bookingId}/pay/${paymentId}/verify`,
          { data: searchParams.get("data") || "" },
          { params: { payment: paymentStatus } }
        );

        setStatus({
          type: response.data?.success ? "success" : "error",
          message: response.data?.message || "Payment verification completed"
        });
      } catch (error) {
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to verify payment"
        });
      } finally {
        await api
          .get(`/api/booking/${bookingId}/tickets`)
          .then((response) => setPayload(response.data?.data))
          .catch(() => {});
        setIsLoading(false);
        navigate(`/booking/${bookingId}/tickets`, { replace: true });
      }
    };

    verifyPayment();
  }, [bookingId, navigate, searchParams]);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const response = await api.get(`/api/booking/${bookingId}/tickets/pdf`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `booking-${payload?.booking?.bookingCode || bookingId}-tickets.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to download ticket PDF"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const booking = payload?.booking;
  const tickets = payload?.tickets ?? [];
  const payment = payload?.payment;
  const trip = booking?.tripId;
  const firstTicket = tickets[0];
  const snapshot = firstTicket?.snapshot || {};
  const summary = {
    busName: snapshot.busName || trip?.busId?.busName || "Bus Service",
    route: `${snapshot.routeFrom || trip?.routeId?.from?.stopName || "Origin"} to ${
      snapshot.routeTo || trip?.routeId?.to?.stopName || "Destination"
    }`,
    travelDate: formatDate(snapshot.travelDate || trip?.travelDate),
    departureTime: snapshot.departureTime || trip?.departureTime || "N/A"
  };

  return (
    <main className="booking-tickets-page">
      <section className="booking-tickets-shell">
        <div className="booking-tickets-header">
          <div>
            <p className="booking-tickets-kicker">Confirmed tickets</p>
            <h1>{summary.busName}</h1>
            <p>{summary.route}</p>
            <p>{summary.travelDate} at {summary.departureTime}</p>
          </div>
          <div className="booking-tickets-actions">
            <button
              type="button"
              className="ticket-download-btn"
              onClick={handleDownload}
              disabled={isDownloading || booking?.bookingStatus !== "confirmed"}
            >
              <FaDownload />
              <span>{isDownloading ? "Preparing PDF..." : "Download PDF"}</span>
            </button>
            <Link className="ticket-secondary-btn" to="/bus-service">
              Book More
            </Link>
          </div>
        </div>

        {status.message ? (
          <div className={`booking-tickets-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isLoading ? (
          <div className="booking-tickets-empty">Loading tickets...</div>
        ) : (
          <>
            <div className="booking-ticket-topbar">
              <div>
                <strong>{tickets.length}</strong>
                <span>Tickets</span>
              </div>
              <div>
                <strong>{booking?.bookingCode || "N/A"}</strong>
                <span>Booking Code</span>
              </div>
              <div>
                <strong>{payment?.paymentStatus || "pending"}</strong>
                <span>Payment Status</span>
              </div>
            </div>

            <div className="ticket-list">
              {tickets.map((ticket) => (
                <article key={ticket._id} className="ticket-card">
                  <div className="ticket-card-band">
                    <FaFilePdf />
                    <span>{ticket.ticketNumber}</span>
                  </div>
                  <div className="ticket-card-body">
                    <div className="ticket-card-main">
                      <div>
                        <p className="label">Passenger</p>
                        <strong>{ticket.passengerName}</strong>
                      </div>
                      <div>
                        <p className="label">Seat</p>
                        <strong>{ticket.seatLabel}</strong>
                      </div>
                      <div>
                        <p className="label">Status</p>
                        <strong className="status-confirmed">
                          <FaCheckCircle /> {ticket.ticketStatus}
                        </strong>
                      </div>
                    </div>

                    <div className="ticket-card-grid">
                      <div>
                        <p className="label">Age</p>
                        <span>{ticket.passengerAge}</span>
                      </div>
                      <div>
                        <p className="label">Gender</p>
                        <span>{ticket.passengerGender}</span>
                      </div>
                      <div>
                        <p className="label">Phone</p>
                        <span>{ticket.passengerPhone}</span>
                      </div>
                      <div>
                        <p className="label">Boarding</p>
                        <span>{ticket.boardingPoint}</span>
                      </div>
                      <div>
                        <p className="label">Dropping</p>
                        <span>{ticket.droppingPoint}</span>
                      </div>
                      <div>
                        <p className="label">Fare</p>
                        <span>Rs. {ticket.snapshot?.seatPrice || 0}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default BookingTickets;
