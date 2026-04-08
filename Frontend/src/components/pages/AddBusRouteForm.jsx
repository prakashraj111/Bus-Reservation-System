import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/addBusRoute.css";
import api from "../../services/api";
import { sanitizeText, validateRouteForm } from "../../utils/validation";
import { useNotification } from "../notifications/NotificationProvider";

function AddBusRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const busId = location.state?.busId || "";
  const intent = location.state?.intent || "";

  const [formData, setFormData] = useState({
    from: {
      stopName: "",
      arrivalTime: "",
      departureTime: ""
    },
    to: {
      stopName: "",
      arrivalTime: "",
      departureTime: ""
    },
    distanceKm: "",
    estimatedDurationMin: ""
  });

  const [stops, setStops] = useState([
    { stopName: "", arrivalTime: "", departureTime: "" }
  ]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e, section) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [name]: value
      }
    });
  };

  const handleMainChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleStopChange = (index, e) => {
    const { name, value } = e.target;

    const newStops = [...stops];
    newStops[index][name] = value;

    setStops(newStops);
  };

  const addStop = () => {
    setStops([...stops, { stopName: "", arrivalTime: "", departureTime: "" }]);
  };

  const removeStop = (index) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!busId) {
      const message = "Bus ID is required";
      setStatus({ type: "error", message });
      showError(message);
      return;
    }

    const validationMessage = validateRouteForm({
      ...formData,
      stops
    });
    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      showError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const routeData = {
      busId,
      from: {
        stopName: sanitizeText(formData.from.stopName),
        departureTime: formData.from.departureTime
      },
      to: {
        stopName: sanitizeText(formData.to.stopName),
        arrivalTime: formData.to.arrivalTime
      },
      distanceKm: Number(formData.distanceKm) || 0,
      estimatedDurationMin: Number(formData.estimatedDurationMin),
      stops: stops
        .map((stop) => ({
          stopName: sanitizeText(stop.stopName),
          arrivalTime: stop.arrivalTime,
          departureTime: stop.departureTime
        }))
        .filter((stop) => stop.stopName)
    };

    try {
      const response = await api.post("/api/bus/route", routeData);
      const createdRoute = response.data?.data || null;
      showSuccess(response.data?.message || "Route created successfully");
      navigate("/bus-route", {
        state: { busId, routeId: createdRoute?._id, intent },
        replace: true
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create route";
      setStatus({ type: "error", message });
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="route-form-container">

      <h2>Create Route</h2>

      <form className="route-form" onSubmit={handleSubmit}>

        {status.message ? (
          <div className={`form-status ${status.type}`}>
            {status.message}
          </div>
        ) : null}

        {/* FROM */}

        <h3 className="section-title">From</h3>

        <div className="form-group">
          <label>Stop Name</label>
          <input
            type="text"
            name="stopName"
            value={formData.from.stopName}
            onChange={(e) => handleChange(e, "from")}
            maxLength={60}
            required
          />
        </div>


        <div className="form-group">
          <label>Departure Time</label>
          <input
            type="time"
            name="departureTime"
            value={formData.from.departureTime}
            onChange={(e) => handleChange(e, "from")}
            required
          />
        </div>

        {/* TO */}

        <h3 className="section-title full">To</h3>

        <div className="form-group">
          <label>Stop Name</label>
          <input
            type="text"
            name="stopName"
            value={formData.to.stopName}
            onChange={(e) => handleChange(e, "to")}
            maxLength={60}
            required
          />
        </div>

        <div className="form-group">
          <label>Arrival Time</label>
          <input
            type="time"
            name="arrivalTime"
            value={formData.to.arrivalTime}
            onChange={(e) => handleChange(e, "to")}
            required
          />
        </div>


        {/* ROUTE INFO */}

        <h3 className="section-title full">Route Info</h3>

        <div className="form-group">
          <label>Distance (KM)</label>
          <input
            type="number"
            name="distanceKm"
            value={formData.distanceKm}
            onChange={handleMainChange}
            min="0"
            step="0.1"
          />
        </div>

        <div className="form-group">
          <label>Estimated Duration (Minutes)</label>
          <input
            type="number"
            name="estimatedDurationMin"
            value={formData.estimatedDurationMin}
            onChange={handleMainChange}
            min="1"
            step="1"
            required
          />
        </div>

        {/* STOPS */}

        <h3 className="section-title full">Intermediate Stops</h3>

        {stops.map((stop, index) => (
          <div className="stop-card" key={index}>

            <input
              type="text"
              name="stopName"
              placeholder="Stop Name"
              value={stop.stopName}
              onChange={(e) => handleStopChange(index, e)}
              maxLength={60}
            />

            <input
              type="time"
              name="arrivalTime"
              value={stop.arrivalTime}
              onChange={(e) => handleStopChange(index, e)}
            />

            <button
              type="button"
              className="remove-stop"
              onClick={() => removeStop(index)}
            >
              Remove
            </button>

          </div>
        ))}

        <button type="button" className="add-stop" onClick={addStop}>
          + Add Stop
        </button>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Route"}
        </button>

      </form>

    </div>
  );
}

export default AddBusRoute;
