import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaClock } from "react-icons/fa";
import api from "../../services/api";
import { getAuthToken } from "../../utils/auth";
import "../css/bookingDetails.css";
import { sanitizeText, validatePassengerForms } from "../../utils/validation";
import { useNotification } from "../notifications/NotificationProvider";

const getSeatLabel = (seatNumber) => {
  const rowIndex = Math.floor((seatNumber - 1) / 10);
  const rowLabel = String.fromCharCode(65 + rowIndex);
  const seatIndex = ((seatNumber - 1) % 10) + 1;
  return `${rowLabel}${seatIndex}`;
};

const buildFormsFromSeatLock = (seatLock) => {
  const trip = seatLock?.tripId;
  const defaultBoarding = trip?.routeId?.from?.stopName || "";
  const defaultDropping = trip?.routeId?.to?.stopName || "";
  const savedDetails = seatLock?.passengerDetails || [];

  return (seatLock?.seatNumbers || []).map((seatNumber) => {
    const detail = savedDetails.find((item) => Number(item.seatNumber) === Number(seatNumber));

    return {
      seatNumber,
      seatLabel: detail?.seatLabel || getSeatLabel(seatNumber),
      passengerName: detail?.passengerName || "",
      passengerAge: detail?.passengerAge || "",
      passengerGender: detail?.passengerGender || "male",
      passengerPhone: detail?.passengerPhone || "",
      boardingPoint: detail?.boardingPoint || defaultBoarding,
      droppingPoint: detail?.droppingPoint || defaultDropping
    };
  });
};

const getEsewaCallbackParams = (searchParams) => {
  const rawPaymentId = searchParams.get("paymentId") || "";
  let paymentId = rawPaymentId;
  let encodedEsewaData = searchParams.get("data") || "";

  if (rawPaymentId.includes("?data=")) {
    const [cleanPaymentId, embeddedData] = rawPaymentId.split("?data=");
    paymentId = cleanPaymentId;
    encodedEsewaData = encodedEsewaData || embeddedData || "";
  }

  return {
    paymentId,
    encodedEsewaData
  };
};

function BookingDetails() {
  const { seatLockId, paymentOutcome } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess, showInfo } = useNotification();
  const [searchParams] = useSearchParams();
  const verificationRef = useRef("");
  const skipReleaseRef = useRef(false);

  const [seatLock, setSeatLock] = useState(null);
  const [forms, setForms] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  const trip = seatLock?.tripId;
  const holdSeconds = seatLock?.holdExpiresAt
    ? Math.max(Math.ceil((new Date(seatLock.holdExpiresAt).getTime() - now) / 1000), 0)
    : 0;

  const canEdit = Boolean(
    seatLock &&
      ["pending", "details_completed"].includes(seatLock.lockStatus) &&
      seatLock.holdExpiresAt &&
      new Date(seatLock.holdExpiresAt) > new Date()
  );

  const fromStop = trip?.routeId?.from?.stopName || "Origin";
  const toStop = trip?.routeId?.to?.stopName || "Destination";

  const hydrateSeatLock = (data) => {
    const nextSeatLock = data?.seatLock || null;
    setSeatLock(nextSeatLock);
    setForms(buildFormsFromSeatLock(nextSeatLock));
  };

  useEffect(() => {
    let isMounted = true;

    const loadSeatLock = async () => {
      setIsLoading(true);

      try {
        const response = await api.get(`/api/seat-lock/${seatLockId}`);
        if (!isMounted) return;
        hydrateSeatLock(response.data?.data);
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load seat lock details"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSeatLock();

    return () => {
      isMounted = false;
    };
  }, [seatLockId]);

  useEffect(() => {
    const releaseHoldKeepalive = () => {
      if (skipReleaseRef.current) return;
      if (!seatLockId || !seatLock) return;
      if (!["pending", "details_completed", "payment_initiated"].includes(seatLock.lockStatus)) return;
      if (!seatLock.holdExpiresAt || new Date(seatLock.holdExpiresAt) <= new Date()) return;

      const token = getAuthToken();
      if (!token) return;

      fetch(`${api.defaults.baseURL}/api/seat-lock/${seatLockId}/release`, {
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
  }, [seatLock, seatLockId]);

  useEffect(() => {
    if (!seatLock?.holdExpiresAt) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [seatLock?.holdExpiresAt]);

  useEffect(() => {
    const { paymentId, encodedEsewaData } = getEsewaCallbackParams(searchParams);
    const paymentStatus = paymentOutcome || searchParams.get("payment");

    if (!seatLockId || !paymentId || !paymentStatus) return;

    const verificationKey = `${seatLockId}:${paymentId}:${paymentStatus}:${encodedEsewaData}`;
    if (verificationRef.current === verificationKey) return;
    verificationRef.current = verificationKey;

    const verifyPayment = async () => {
      let redirected = false;
      let nextBookingId = null;

      try {
        const response = await api.post(
          `/api/seat-lock/${seatLockId}/pay/${paymentId}/verify`,
          { data: encodedEsewaData },
          { params: { payment: paymentStatus } }
        );

        setStatus({
          type: response.data?.success ? "success" : "error",
          message: response.data?.message || "Payment verification completed"
        });
        if (response.data?.success) {
          showSuccess(response.data?.message || "Payment verification completed");
        } else {
          showError(response.data?.message || "Payment verification failed");
        }

        if (response.data?.success && response.data?.bookingId) {
          skipReleaseRef.current = true;
          redirected = true;
          nextBookingId = response.data.bookingId;
        }
      } catch (error) {
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to verify payment status"
        });
        showError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to verify payment status"
        );
      } finally {
        if (!redirected) {
          await api
            .get(`/api/seat-lock/${seatLockId}`)
            .then((response) => hydrateSeatLock(response.data?.data))
            .catch(() => {});

          navigate(`/seat-lock/${seatLockId}/details`, { replace: true, state: location.state });
        }
      }

      if (redirected && nextBookingId) {
        navigate(`/booking/${nextBookingId}/tickets`, { replace: true });
      }
    };

    verifyPayment();
  }, [location.state, navigate, paymentOutcome, searchParams, seatLockId]);

  const handleFieldChange = (seatNumber, field, value) => {
    setForms((current) =>
      current.map((form) =>
        form.seatNumber === seatNumber ? { ...form, [field]: value } : form
      )
    );
  };

  const saveSeatLockDetails = async () => {
    const response = await api.put(`/api/seat-lock/${seatLockId}`, {
      tickets: forms.map((form) => ({
        seatNumber: form.seatNumber,
        passengerName: sanitizeText(form.passengerName),
        passengerAge: Number(form.passengerAge),
        passengerGender: form.passengerGender,
        passengerPhone: sanitizeText(form.passengerPhone),
        boardingPoint: sanitizeText(form.boardingPoint),
        droppingPoint: sanitizeText(form.droppingPoint)
      }))
    });

    hydrateSeatLock(response.data?.data);
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
    const validationMessage = validatePassengerForms(forms);
    if (validationMessage) {
      setStatus({
        type: "error",
        message: validationMessage
      });
      showError(validationMessage);
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await saveSeatLockDetails();

      const paymentResponse = await api.post(`/api/seat-lock/${seatLockId}/pay`, {
        amount: seatLock?.totalAmount || 0,
        method: "esewa"
      });

      setStatus({
        type: "success",
        message: "Passenger details saved. Redirecting to eSewa..."
      });
      showInfo("Passenger details saved. Redirecting to eSewa...");

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
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to continue to payment"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToSeatSelection = async () => {
    setIsSaving(true);

    try {
      await api.post(`/api/seat-lock/${seatLockId}/release`);
      skipReleaseRef.current = true;
      navigate(`/book-seat/${seatLock?.tripId?._id || seatLock?.tripId}`);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to release seat hold"
      });
      showError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to release seat hold"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(
    () => ({
      totalAmount: seatLock?.totalAmount || 0,
      seatCount: seatLock?.seatCount || 0,
      lockId: seatLock?._id || ""
    }),
    [seatLock]
  );

  return (
    <main className="booking-details-page">
      <section className="booking-details-shell">
        <div className="booking-details-header">
          <div>
            <p className="booking-details-kicker">Passenger details</p>
            <h1>Complete one form for each selected seat</h1>
            <p>
              Every seat in lock <strong>{summary.lockId}</strong> needs its own passenger details before payment.
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
          <div className="booking-details-empty">Loading seat lock details...</div>
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
                    <span>{summary.lockId}</span>
                  </div>

                  <div className="ticket-form-grid">
                    <label>
                      Passenger Name
                      <input
                        value={form.passengerName}
                        onChange={(event) =>
                          handleFieldChange(form.seatNumber, "passengerName", event.target.value)
                        }
                        maxLength={60}
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
                        maxLength={15}
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
                        maxLength={60}
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
                        maxLength={60}
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
                  <li>No booking record is created until payment is successful.</li>
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
