import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/tripForm.css";
import api from "../../services/api";

function TripForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const busId = location.state?.busId || "";
  const routeId = location.state?.routeId || "";
  const tripId = location.state?.tripId || "";
  const initialTrip = location.state?.trip || null;
  const isEditMode = Boolean(tripId);

  const [formData, setFormData] = useState({
    travelDate: initialTrip?.travelDate
      ? new Date(initialTrip.travelDate).toISOString().split("T")[0]
      : "",
    departureTime: initialTrip?.departureTime || "",
    arrivalTime: initialTrip?.arrivalTime || "",
    seatPrice: initialTrip?.seatPrice || 750,
    totalSeats: initialTrip?.totalSeats || "",
    status: initialTrip?.status || "scheduled"
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditMode && (!busId || !routeId)) {
      setStatus({ type: "error", message: "Bus ID and Route ID are required" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const payload = {
      travelDate: formData.travelDate,
      departureTime: formData.departureTime,
      arrivalTime: formData.arrivalTime,
      seatPrice: Number(formData.seatPrice) || 0,
      totalSeats: Number(formData.totalSeats)
    };

    try {
      const response = isEditMode
        ? await api.put(`/api/trip/${tripId}`, {
            ...payload,
            status: formData.status
          })
        : await api.post(`/api/bus/${busId}/route/${routeId}/trip`, payload);

      setStatus({
        type: "success",
        message:
          response.data?.message ||
          (isEditMode ? "Trip updated successfully" : "Trip created successfully")
      });
      navigate(isEditMode ? "/my-scheduled-bus" : "/bus-route", {
        state: isEditMode ? undefined : { busId }
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        (isEditMode ? "Failed to update trip" : "Failed to create trip");
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="trip-form-container">

      <h2>{isEditMode ? "Update Schedule" : "Schedule Trip"}</h2>

      <form className="trip-form" onSubmit={handleSubmit}>

        {status.message ? (
          <div className={`form-status ${status.type}`}>
            {status.message}
          </div>
        ) : null}

        <div className="form-group">
          <label>Travel Date</label>
          <input
            type="date"
            name="travelDate"
            value={formData.travelDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Departure Time</label>
          <input
            type="time"
            name="departureTime"
            value={formData.departureTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Arrival Time</label>
          <input
            type="time"
            name="arrivalTime"
            value={formData.arrivalTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Seat Price</label>
          <input
            type="number"
            name="seatPrice"
            value={formData.seatPrice}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Total Seats</label>
          <input
            type="number"
            name="totalSeats"
            value={formData.totalSeats}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting
            ? (isEditMode ? "Updating..." : "Publishing...")
            : (isEditMode ? "Update Trip" : "Publish Trip")}
        </button>

      </form>

    </div>
  );
}

export default TripForm;
