import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../css/busService.css";

const today = new Date().toISOString().slice(0, 10);

function BusService() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    travelDate: today
  });
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [suggestions, setSuggestions] = useState({ from: [], to: [] });
  const [activeSuggestionField, setActiveSuggestionField] = useState("");

  const loadAllTrips = async () => {
    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await api.get("/api/trip/all");
      const tripList = response.data?.data || [];
      setTrips(tripList);
      setStatus({
        type: tripList.length ? "success" : "",
        message: tripList.length ? "" : "No trips available right now."
      });
    } catch (error) {
      setTrips([]);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load trips"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchTrips = async (params) => {
    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await api.get("/api/trip/search", { params });
      const tripList = response.data?.data || [];
      setTrips(tripList);
      setStatus({
        type: tripList.length ? "success" : "",
        message: tripList.length ? "" : "No trips found for this route and date."
      });
    } catch (error) {
      setTrips([]);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to search trips"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllTrips();
  }, []);

  useEffect(() => {
    if (!activeSuggestionField) return undefined;

    const query = formData[activeSuggestionField].trim();

    if (query.length < 2) {
      setSuggestions((current) => ({
        ...current,
        [activeSuggestionField]: []
      }));
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/api/trip/suggestions", {
          params: { query }
        });

        setSuggestions((current) => ({
          ...current,
          [activeSuggestionField]: (response.data?.data || []).map(
            (item) => item.name
          )
        }));
      } catch {
        setSuggestions((current) => ({
          ...current,
          [activeSuggestionField]: []
        }));
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [activeSuggestionField, formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSuggestionSelect = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      [fieldName]: value
    }));
    setSuggestions({ from: [], to: [] });
    setActiveSuggestionField("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.from.trim() || !formData.to.trim() || !formData.travelDate) {
      loadAllTrips();
      return;
    }

    searchTrips(formData);
  };

  const formatTime = (value) => {
    if (!value) return "Not set";

    const timeMatch = /^(\d{1,2}):(\d{2})/.exec(value);

    if (!timeMatch) return value;

    const hours = Number(timeMatch[1]);
    const minutes = timeMatch[2];
    const period = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;

    return `${formattedHours}:${minutes} ${period}`;
  };

  const formatTravelDate = (value) => {
    if (!value) return "Travel Date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getTripDetails = (trip) => {
    const bus = trip.bus || trip.busId || {};
    const route = trip.route || trip.routeId || {};

    return {
      bus,
      route,
      fromName: route.from?.stopName || formData.from || "Starting Point",
      toName: route.to?.stopName || formData.to || "Destination"
    };
  };

  return (
    <section className="bus-service-page">
      <form className="bus-search-card" onSubmit={handleSubmit}>
        <div className="bus-search-row">
          <div className="bus-search-field">
            <input
              type="text"
              name="from"
              placeholder="From"
              value={formData.from}
              onChange={handleChange}
              onFocus={() => setActiveSuggestionField("from")}
              autoComplete="off"
            />
            {activeSuggestionField === "from" && suggestions.from.length ? (
              <div className="bus-suggestions">
                {suggestions.from.map((item) => (
                  <button
                    key={`from-${item}`}
                    type="button"
                    className="bus-suggestion-item"
                    onClick={() => handleSuggestionSelect("from", item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="bus-search-field">
            <input
              type="text"
              name="to"
              placeholder="To"
              value={formData.to}
              onChange={handleChange}
              onFocus={() => setActiveSuggestionField("to")}
              autoComplete="off"
            />
            {activeSuggestionField === "to" && suggestions.to.length ? (
              <div className="bus-suggestions">
                {suggestions.to.map((item) => (
                  <button
                    key={`to-${item}`}
                    type="button"
                    className="bus-suggestion-item"
                    onClick={() => handleSuggestionSelect("to", item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <input
            type="date"
            name="travelDate"
            value={formData.travelDate}
            onChange={handleChange}
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Check Availability"}
          </button>
        </div>
      </form>

      {status.message ? (
        <p className={`bus-search-status ${status.type}`}>{status.message}</p>
      ) : null}

      <div className="bus-list">
        {trips.map((trip) => {
          const { bus, route, fromName, toName } = getTripDetails(trip);

          return (
            <article key={trip._id} className="bus-item-card">
              <div className="bus-card-main">
                <div className="bus-card-left">
                  <div className="bus-detail-box">
                    {bus.busName || bus.operator || "Available Bus"}
                  </div>
                  <div className="bus-detail-box">
                    {bus.type || "Standard Bus"}
                  </div>
                </div>

                <div className="bus-card-center">
                  <div className="bus-date-box">
                    {formatTravelDate(trip.travelDate)}
                  </div>

                  <div className="bus-time-col">
                    <h4>Departure</h4>
                    <p className="time">{formatTime(trip.departureTime)}</p>
                    <p className="city">{fromName}</p>
                  </div>

                  <div className="bus-arrow" aria-hidden="true">
                    <span className="bus-arrow-line" />
                    <span className="bus-arrow-head">{">"}</span>
                  </div>

                  <div className="bus-time-col">
                    <h4>Arrival</h4>
                    <p className="time">{formatTime(trip.arrivalTime)}</p>
                    <p className="city">{toName}</p>
                  </div>
                </div>

                <div className="bus-seat-box">
                  <p>Available Seats</p>
                  <strong>{trip.availableSeats ?? 0}</strong>
                  <span>Rs. {trip.seatPrice ?? 0}</span>
                </div>
              </div>

              <div className="bus-card-actions">
                <button
                  type="button"
                  className="bus-inline-btn"
                  onClick={() =>
                    navigate("/view-my-bus", {
                      state: { busId: bus._id }
                    })
                  }
                  disabled={!bus._id}
                >
                  View Bus Info
                </button>
                <button
                    type="button"
                    className="bus-inline-btn"
                    onClick={() =>
                      navigate("/bus-route", {
                        state: { busId: bus._id }
                      })
                    }
                    disabled={!bus._id}
                  >
                  View Route
                </button>
                <Link
                  className="book-btn"
                  to={`/book-seat/${trip._id}`}
                  state={{ trip: { ...trip, bus, route } }}
                >
                  Book
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default BusService;
