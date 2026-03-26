import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaLock, FaWifi } from "react-icons/fa";
import busImage from "../../assets/bus10.png";
import api from "../../services/api";
import { getAuthToken } from "../../utils/auth";
import "../css/bookSeat.css";

const SEATS_PER_ROW = 10;

const getRowLabel = (rowIndex) => String.fromCharCode(65 + rowIndex);

const getSeatLabel = (seatNumber) => {
  const rowIndex = Math.floor((seatNumber - 1) / SEATS_PER_ROW);
  const seatIndex = ((seatNumber - 1) % SEATS_PER_ROW) + 1;
  return `${getRowLabel(rowIndex)}${seatIndex}`;
};

const createSeatRows = (totalSeats) => {
  const seatCount = totalSeats === 60 ? 60 : 40;
  const rowCount = Math.ceil(seatCount / SEATS_PER_ROW);

  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: SEATS_PER_ROW }, (_, seatIndex) => {
      const seatNumber = rowIndex * SEATS_PER_ROW + seatIndex + 1;
      return {
        number: seatNumber,
        label: getSeatLabel(seatNumber)
      };
    }).filter((seat) => seat.number <= seatCount)
  );
};

const formatDate = (value) => {
  if (!value) return "Travel date not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const formatTime = (value) => {
  if (!value) return "Not set";

  const [hoursValue, minutes] = value.split(":");
  const hours = Number(hoursValue);
  if (Number.isNaN(hours)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
};

function BookSeat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tripId: routeTripId } = useParams();
  const [searchParams] = useSearchParams();

  const stateTrip = location.state?.trip || null;
  const resolvedTripId = routeTripId || stateTrip?._id || searchParams.get("tripId") || "";

  const [trip, setTrip] = useState(stateTrip);
  const [seatState, setSeatState] = useState({
    totalSeats: stateTrip?.totalSeats || 40,
    availableSeats: stateTrip?.availableSeats || 0,
    bookedSeats: stateTrip?.bookedSeats || [],
    lockedSeats: [],
    confirmedSeats: []
  });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const totalSeats = trip?.totalSeats === 60 ? 60 : 40;
  const seatRows = useMemo(() => createSeatRows(totalSeats), [totalSeats]);
  const selectedSeatLabels = selectedSeats.map(getSeatLabel);
  const totalFare = selectedSeats.length * Number(trip?.seatPrice || 0);
  const holdCountdown = activeBooking?.expiresAt
    ? Math.max(new Date(activeBooking.expiresAt).getTime() - currentTime, 0)
    : 0;

  useEffect(() => {
    if (!resolvedTripId) {
      setIsLoading(false);
      setStatus({
        type: "error",
        message: "Trip information is missing. Please select a bus again."
      });
      return undefined;
    }

    let isMounted = true;

    const loadTripSeats = async () => {
      setIsLoading(true);

      try {
        const response = await api.get(`/api/trip/${resolvedTripId}/book/seats`);
        const payload = response.data?.data;

        if (!isMounted || !payload) return;

        setTrip(payload.trip);
        setSeatState(payload.seats);
        setStatus({ type: "", message: "" });
      } catch (error) {
        if (!isMounted) return;

        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load seat availability"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTripSeats();

    return () => {
      isMounted = false;
    };
  }, [resolvedTripId]);

  useEffect(() => {
    if (!resolvedTripId) return undefined;

    const socket = io(api.defaults.baseURL, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      setIsSocketConnected(true);
      socket.emit("trip:join", resolvedTripId);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("trip:seats-updated", (payload) => {
      setSeatState(payload);
    });

    return () => {
      socket.emit("trip:leave", resolvedTripId);
      socket.disconnect();
    };
  }, [resolvedTripId]);

  useEffect(() => {
    if (!activeBooking?.expiresAt) return undefined;

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());

      if (new Date(activeBooking.expiresAt).getTime() <= Date.now()) {
        setActiveBooking(null);
        setSelectedSeats([]);
        setStatus({
          type: "error",
          message: "Your seat hold expired. Please choose seats again."
        });
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeBooking]);

  const handleSeatToggle = (seatNumber) => {
    if (activeBooking) return;

    const isUnavailable =
      seatState.confirmedSeats.includes(seatNumber) ||
      seatState.lockedSeats.includes(seatNumber);

    if (isUnavailable) return;

    setSelectedSeats((currentSeats) => {
      if (currentSeats.includes(seatNumber)) {
        return currentSeats.filter((seat) => seat !== seatNumber);
      }

      if (currentSeats.length >= 5) {
        setStatus({
          type: "error",
          message: "You can select a maximum of 5 seats at once."
        });
        return currentSeats;
      }

      setStatus((currentStatus) =>
        currentStatus.message === "You can select a maximum of 5 seats at once."
          ? { type: "", message: "" }
          : currentStatus
      );

      return [...currentSeats, seatNumber].sort((a, b) => a - b);
    });
  };

  const handleCheckout = async () => {
    if (!selectedSeats.length) {
      setStatus({ type: "error", message: "Please select at least one seat." });
      return;
    }

    if (!getAuthToken()) {
      navigate("/login", {
        state: {
          from: `/book-seat/${resolvedTripId}`,
          trip: trip || stateTrip
        }
      });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: "", message: "" });

    try {
      const bookingResponse = await api.post(`/api/trip/${resolvedTripId}/book`, {
        seatNumbers: selectedSeats,
        totalAmount: totalFare
      });

      const booking = bookingResponse.data?.data;
      const lockExpiresAt = bookingResponse.data?.seatLock?.expiresAt;

      setActiveBooking({
        bookingId: booking?._id,
        expiresAt: lockExpiresAt
      });
      setSeatState((current) => bookingResponse.data?.seatLock?.seats || current);

      navigate(`/booking/${booking?._id}/details`, {
        state: { trip: trip || stateTrip }
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to start booking"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeatVariant = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) return "selected";
    if (seatState.confirmedSeats.includes(seatNumber)) return "confirmed";
    if (seatState.lockedSeats.includes(seatNumber)) return "locked";
    return "available";
  };

  const bus = trip?.busId || trip?.bus || {};
  const route = trip?.routeId || trip?.route || {};
  const fromStop = route?.from?.stopName || "Origin";
  const toStop = route?.to?.stopName || "Destination";
  const busImageSrc = bus?.imageUrl
    ? bus.imageUrl.startsWith("http")
      ? bus.imageUrl
      : `${api.defaults.baseURL}/${bus.imageUrl}`
    : busImage;

  return (
    <main className="book-seat-page">
      <section className="book-seat-shell">
        <div className="book-seat-hero">
          <div className="book-seat-hero-copy">
            <p className="book-seat-kicker">Live seat booking</p>
            <h1>{bus.busName || "Bus Seat Reservation"}</h1>
            <p className="book-seat-subtitle">
              Choose your seats, lock them briefly, and complete payment through eSewa before the hold expires.
            </p>

            <div className="book-seat-meta-grid">
              <div className="book-seat-meta-card">
                <span>Route</span>
                <strong>{fromStop} to {toStop}</strong>
              </div>
              <div className="book-seat-meta-card">
                <span>Date</span>
                <strong>{formatDate(trip?.travelDate)}</strong>
              </div>
              <div className="book-seat-meta-card">
                <span>Departure</span>
                <strong>{formatTime(trip?.departureTime)}</strong>
              </div>
              <div className="book-seat-meta-card">
                <span>Total Seats</span>
                <strong>{totalSeats}</strong>
              </div>
            </div>
          </div>

          <div className="book-seat-hero-visual">
            <img src={busImageSrc} alt={bus.busName || "Bus"} />
            <div className="book-seat-live-pill">
              <FaWifi />
              <span>{isSocketConnected ? "Live updates on" : "Reconnecting..."}</span>
            </div>
          </div>
        </div>

        {status.message ? (
          <div className={`book-seat-status ${status.type}`}>{status.message}</div>
        ) : null}

        <div className="book-seat-content">
          <section className="book-seat-board">
            <div className="book-seat-board-head">
              <div>
                <p className="book-seat-section-label">Seat map</p>
                <h2>Select your seats</h2>
              </div>
              <div className="book-seat-availability">
                <strong>{seatState.availableSeats ?? 0}</strong>
                <span>Seats available now</span>
              </div>
            </div>

            <div className="book-seat-legend">
              <span className="available">Available</span>
              <span className="selected">Selected</span>
              <span className="locked">Locked</span>
              <span className="confirmed">Booked</span>
            </div>

            {isLoading ? (
              <div className="book-seat-empty">Loading seats...</div>
            ) : (
              <div className="book-seat-grid-shell">
                {seatRows.map((row, rowIndex) => (
                  <div key={getRowLabel(rowIndex)} className="book-seat-row">
                    <div className="book-seat-row-label">{getRowLabel(rowIndex)}</div>
                    <div className="book-seat-row-grid">
                      {row.map((seat) => {
                        const variant = getSeatVariant(seat.number);

                        return (
                          <button
                            key={seat.number}
                            type="button"
                            className={`book-seat-tile ${variant}`}
                            onClick={() => handleSeatToggle(seat.number)}
                            disabled={variant === "locked" || variant === "confirmed" || Boolean(activeBooking)}
                          >
                            {seat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="book-seat-summary">
            <div className="book-seat-summary-card">
              <p className="book-seat-section-label">Booking summary</p>
              <h3>Your selection</h3>

              <div className="book-seat-pill-list">
                {selectedSeatLabels.length ? (
                  selectedSeatLabels.map((label) => <span key={label}>{label}</span>)
                ) : (
                  <span className="empty">No seats selected</span>
                )}
              </div>

              <div className="book-seat-summary-line">
                <span>Price per seat</span>
                <strong>Rs. {trip?.seatPrice ?? 0}</strong>
              </div>
              <div className="book-seat-summary-line">
                <span>Seat count</span>
                <strong>{selectedSeats.length} / 5</strong>
              </div>
              <div className="book-seat-summary-line total">
                <span>Total fare</span>
                <strong>Rs. {totalFare}</strong>
              </div>

              {activeBooking?.expiresAt ? (
                <div className="book-seat-hold-box">
                  <FaLock />
                  <div>
                    <strong>Seats locked</strong>
                    <p>
                      Complete payment within {Math.ceil(holdCountdown / 1000)} seconds.
                    </p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="book-seat-pay-btn"
                onClick={handleCheckout}
                disabled={isLoading || isProcessing || !selectedSeats.length}
              >
                {isProcessing ? "Processing..." : "Lock seats and pay with eSewa"}
              </button>
            </div>

            <div className="book-seat-summary-card secondary">
              <p className="book-seat-section-label">Protection</p>
              <ul className="book-seat-feature-list">
                <li>
                  <FaLock />
                  <span>Seat locking prevents double booking during checkout.</span>
                </li>
                <li>
                  <FaCheckCircle />
                  <span>Booking confirms only after successful eSewa verification.</span>
                </li>
                <li>
                  <FaWifi />
                  <span>Seat status refreshes live through Socket.io room updates.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default BookSeat;
