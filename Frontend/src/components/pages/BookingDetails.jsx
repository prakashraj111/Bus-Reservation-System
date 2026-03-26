import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaClock, FaCreditCard, FaUser } from "react-icons/fa";
import api from "../../services/api";
import { getAuthToken } from "../../utils/auth";
import "../css/bookingDetails.css";

const getSeatLabel = (seatNumber) => {
  const rowIndex = Math.floor((seatNumber - 1) / 10);
  const rowLabel = String.fromCharCode(65 + rowIndex);
  const seatIndex = ((seatNumber - 1) % 10) + 1;
  return `${rowLabel}${seatIndex}`;
};

const createBlankTicket = (seatNumber, booking, trip) => ({
  seatNumber,
  seatLabel: getSeatLabel(seatNumber),
  passengerName: "",
  passengerAge: "",
  passengerGender: "male",
  passengerPhone: "",
  boardingPoint: trip?.routeId?.from?.stopName || "",
  droppingPoint: trip?.routeId?.to?.stopName || "",
  bookingCode: booking?.bookingCode || ""
});

const mapPayloadToForms = (data) => {
  const booking = data?.booking;
  const trip = booking?.tripId;
  const existingTickets = data?.tickets || [];
  const defaultBoarding = trip?.routeId?.from?.stopName || "";
  const defaultDropping = trip?.routeId?.to?.stopName || "";

  return (booking?.seatNumbers || []).map((seatNumber) => {
    const existing = existingTickets.find((ticket) => ticket.seatNumber === seatNumber);
    return existing
      ? {
          seatNumber,
          seatLabel: existing.seatLabel || getSeatLabel(seatNumber),
          passengerName: existing.passengerName || "",
          passengerAge: existing.passengerAge || "",
          passengerGender: existing.passengerGender || "male",
          passengerPhone: existing.passengerPhone || "",
          boardingPoint: existing.boardingPoint || defaultBoarding,
          droppingPoint: existing.droppingPoint || defaultDropping,
          bookingCode: booking?.bookingCode || ""
        }
      : createBlankTicket(seatNumber, booking, trip);
  });
};

function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const verificationRef = useRef("");

  const [payload, setPayload] = useState(null);
  const [forms, setForms] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const skipReleaseRef = useRef(false);

  const booking = payload?.booking;
  const trip = booking?.tripId;
  const holdSeconds = booking?.holdExpiresAt
    ? Math.max(Math.ceil((new Date(booking.holdExpiresAt).getTime() - now) / 1000), 0)
    : 0;

  const canEdit = Boolean(
    booking &&
      ["pending", "details_completed"].includes(booking.bookingStatus) &&
      booking.holdExpiresAt &&
      new Date(booking.holdExpiresAt) > new Date()
  );

  const fromStop = trip?.routeId?.from?.stopName || "Origin";
  const toStop = trip?.routeId?.to?.stopName || "Destination";

  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      setIsLoading(true);

      try {
        const response = await api.get(`/api/booking/${bookingId}`);
        if (!isMounted) return;

        const data = response.data?.data;
        setPayload(data);
        setForms(mapPayloadToForms(data));
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load booking details"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  useEffect(() => {
    const releaseHoldKeepalive = () => {
      if (skipReleaseRef.current) return;
      if (!bookingId || !booking) return;
      if (!["pending", "details_completed"].includes(booking.bookingStatus)) return;
      if (!booking.holdExpiresAt || new Date(booking.holdExpiresAt) <= new Date()) return;

      const token = getAuthToken();
      if (!token) return;

      fetch(`${api.defaults.baseURL}/api/booking/${bookingId}/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        keepalive: true
      }).catch(() => {});
    };

    const handleBeforeUnload = () => {
      releaseHoldKeepalive();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      releaseHoldKeepalive();
    };
  }, [booking, bookingId]);

  useEffect(() => {
    if (!booking?.holdExpiresAt) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [booking?.holdExpiresAt]);

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const paymentStatus = searchParams.get("payment");

    if (!bookingId || !paymentId || !paymentStatus) return;

    const verificationKey = `${bookingId}:${paymentId}:${paymentStatus}:${searchParams.get("data") || ""}`;
    if (verificationRef.current === verificationKey) return;
    verificationRef.current = verificationKey;

    const verifyPaymentFailure = async () => {
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
            "Unable to verify payment status"
        });
      } finally {
        await api
          .get(`/api/booking/${bookingId}`)
          .then((response) => {
            const data = response.data?.data;
            setPayload(data);
            setForms(mapPayloadToForms(data));
          })
          .catch(() => {});
        navigate(`/booking/${bookingId}/details`, { replace: true, state: location.state });
      }
    };

    verifyPaymentFailure();
  }, [bookingId, location.state, navigate, searchParams]);

  const handleFieldChange = (seatNumber, field, value) => {
    setForms((current) =>
      current.map((form) =>
        form.seatNumber === seatNumber ? { ...form, [field]: value } : form
      )
    );
  };

  const validateForms = () => {
    return forms.every((form) => {
      return (
        form.passengerName.trim() &&
        Number(form.passengerAge) > 0 &&
        form.passengerGender &&
        form.passengerPhone.trim() &&
        form.boardingPoint.trim() &&
        form.droppingPoint.trim()
      );
    });
  };

  const saveTicketDetails = async () => {
    const response = await api.put(`/api/booking/${bookingId}/tickets`, {
      tickets: forms.map((form) => ({
        seatNumber: form.seatNumber,
        passengerName: form.passengerName,
        passengerAge: Number(form.passengerAge),
        passengerGender: form.passengerGender,
        passengerPhone: form.passengerPhone,
        boardingPoint: form.boardingPoint,
        droppingPoint: form.droppingPoint
      }))
    });

    setPayload(response.data?.data);
  };

  const submitEsewaForm = (paymentData) => {
    const form = document.createElement("form");
    form.method = paymentData.method || "POST";
    form.action = paymentData.action;

    Object.entries(paymentData.fields || {}).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleSaveAndPay = async () => {
    if (!validateForms()) {
      setStatus({
        type: "error",
        message: "Please complete every passenger ticket form before payment."
      });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await saveTicketDetails();

      const paymentResponse = await api.post(`/api/book/${bookingId}/pay`, {
        amount: booking?.totalAmount || 0,
        method: "esewa"
      });

      setStatus({
        type: "success",
        message: "Passenger details saved. Redirecting to eSewa..."
      });

      skipReleaseRef.current = true;
      submitEsewaForm(paymentResponse.data?.esewa);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to continue to payment"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToSeatSelection = async () => {
    setIsSaving(true);

    try {
      await api.post(`/api/booking/${bookingId}/release`);
      skipReleaseRef.current = true;
      navigate(`/book-seat/${booking?.tripId?._id || booking?.tripId}`);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to release seat hold"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(
    () => ({
      totalAmount: booking?.totalAmount || 0,
      seatCount: booking?.seatCount || 0,
      bookingCode: booking?.bookingCode || ""
    }),
    [booking]
  );

  return (
    <main className="booking-details-page">
      <section className="booking-details-shell">
        <div className="booking-details-header">
          <div>
            <p className="booking-details-kicker">Passenger details</p>
            <h1>Complete one form for each selected seat</h1>
            <p>
              Every seat in booking <strong>{summary.bookingCode}</strong> needs its own passenger details before payment.
            </p>
          </div>
          <div className="booking-details-hold">
            <FaClock />
            <div>
              <strong>{holdSeconds}s</strong>
              <span>Seat hold remaining</span>
            </div>
          </div>
        </div>

        {status.message ? (
          <div className={`booking-details-status ${status.type}`}>{status.message}</div>
        ) : null}

        {isLoading ? (
          <div className="booking-details-empty">Loading booking details...</div>
        ) : (
          <div className="booking-details-content">
            <section className="booking-details-forms">
              {forms.map((form, index) => (
                <article key={form.seatNumber} className="ticket-form-card">
                  <div className="ticket-form-head">
                    <div>
                      <p>Ticket {index + 1}</p>
                      <h3>{form.seatLabel}</h3>
                    </div>
                    <span>{summary.bookingCode}</span>
                  </div>

                  <div className="ticket-form-grid">
                    <label>
                      Passenger Name
                      <input
                        value={form.passengerName}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "passengerName", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label>
                      Passenger Age
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={form.passengerAge}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "passengerAge", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label>
                      Gender
                      <select
                        value={form.passengerGender}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "passengerGender", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label>
                      Phone Number
                      <input
                        value={form.passengerPhone}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "passengerPhone", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label>
                      Boarding Point
                      <input
                        value={form.boardingPoint}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "boardingPoint", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label>
                      Dropping Point
                      <input
                        value={form.droppingPoint}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "droppingPoint", event.target.value)
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </section>

            <aside className="booking-details-sidebar">
              <div className="booking-summary-card">
                <p className="booking-details-kicker">Trip summary</p>
                <h3>{trip?.busId?.busName || "Bus Service"}</h3>
                <p>{fromStop} to {toStop}</p>

                <div className="booking-summary-line">
                  <span>Selected Seats</span>
                  <strong>{summary.seatCount}</strong>
                </div>
                <div className="booking-summary-line">
                  <span>Total Fare</span>
                  <strong>Rs. {summary.totalAmount}</strong>
                </div>

                <button
                  type="button"
                  className="booking-pay-btn"
                  onClick={handleSaveAndPay}
                  disabled={!canEdit || isSaving}
                >
                  {isSaving ? "Saving..." : "Pay with eSewa"}
                </button>
                <button
                  type="button"
                  className="booking-back-btn"
                  onClick={handleBackToSeatSelection}
                  disabled={isSaving}
                >
                  Back and release seats
                </button>
              </div>

              <div className="booking-summary-card muted">
                <h3>Before payment</h3>
                <ul>
                  <li>One form is required for each seat.</li>
                  <li>All passenger details must be completed before payment.</li>
                  <li>If the hold expires, the locked seats will be released.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default BookingDetails;
