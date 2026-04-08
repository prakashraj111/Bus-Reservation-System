import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/busRoute.css";
import busIcon from "./car.png";
import api from "../../services/api";
import { getAuthUser } from "../../utils/auth";
import { useNotification } from "../notifications/NotificationProvider";

const parseTimeToMinutes = (value) => {
  if (!value || typeof value !== "string" || !value.includes(":")) return null;
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const getNepalTimeSnapshot = () => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
    day: "2-digit",
    month: "short"
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const hours = Number(values.hour || 0);
  const minutes = Number(values.minute || 0);

  return {
    label: `${values.weekday || ""}, ${values.day || ""} ${values.month || ""} ${values.hour || "00"}:${values.minute || "00"} NPT`.trim(),
    minutesSinceMidnight: hours * 60 + minutes,
    dateKey: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date())
  };
};

const getNepalDateKey = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const getTrackerState = (stops, currentMinutes) => {
  const positions = stops.map((stop, index) => ({
    ...stop,
    positionPercent: stops.length > 1 ? (index / (stops.length - 1)) * 100 : 0
  }));

  const timedStops = positions.filter((stop) => stop.minutes != null);

  if (!timedStops.length) {
    return {
      carPositionPercent: 0,
      currentSegmentLabel: "Stop times are not available for live tracking yet.",
      phase: "unknown",
      isTrackActive: false
    };
  }

  if (currentMinutes <= timedStops[0].minutes) {
    return {
      carPositionPercent: timedStops[0].positionPercent,
      currentSegmentLabel: `Waiting to depart from ${timedStops[0].name}`,
      phase: "upcoming",
      isTrackActive: true
    };
  }

  const lastTimedStop = timedStops[timedStops.length - 1];
  if (currentMinutes >= lastTimedStop.minutes) {
    return {
      carPositionPercent: lastTimedStop.positionPercent,
      currentSegmentLabel: `Arrived at ${lastTimedStop.name}`,
      phase: "completed",
      isTrackActive: true
    };
  }

  for (let index = 0; index < timedStops.length - 1; index += 1) {
    const currentStop = timedStops[index];
    const nextStop = timedStops[index + 1];

    if (
      currentMinutes >= currentStop.minutes &&
      currentMinutes <= nextStop.minutes
    ) {
      const duration = nextStop.minutes - currentStop.minutes || 1;
      const progress = (currentMinutes - currentStop.minutes) / duration;
      const carPositionPercent =
        currentStop.positionPercent +
        (nextStop.positionPercent - currentStop.positionPercent) * progress;

      return {
        carPositionPercent,
        currentSegmentLabel: `Now moving from ${currentStop.name} to ${nextStop.name}`,
        phase: "in_transit",
        isTrackActive: true
      };
    }
  }

  return {
    carPositionPercent: 0,
    currentSegmentLabel: "Live route status is unavailable right now.",
    phase: "unknown",
    isTrackActive: false
  };
};

const getCompletedTrackerState = (stops, message) => {
  const finalPosition = stops.length > 1 ? 100 : 0;
  const finalStopName = stops[stops.length - 1]?.name || "the final stop";

  return {
    carPositionPercent: finalPosition,
    currentSegmentLabel: message || `Arrived at ${finalStopName}`,
    phase: "completed",
    isTrackActive: false
  };
};

const getUpcomingTrackerState = (stops, message) => {
  const initialPosition = 0;
  const firstStopName = stops[0]?.name || "the first stop";

  return {
    carPositionPercent: initialPosition,
    currentSegmentLabel: message || `Waiting to depart from ${firstStopName}`,
    phase: "upcoming",
    isTrackActive: false
  };
};

function BusRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo } = useNotification();
  const user = getAuthUser();
  const busId = location.state?.busId || "";
  const intent = location.state?.intent || "";
  const scheduledTrip = location.state?.trip || null;
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [nepalTime, setNepalTime] = useState(getNepalTimeSnapshot());
  const intentHandledRef = useRef(false);
  const canManageRoute = ["driver", "owner", "admin"].includes(user?.role || "");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNepalTime(getNepalTimeSnapshot());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      if (!busId) {
        const message = "Bus ID is required";
        setStatus({ type: "error", message });
        showError(message);
        return;
      }

      setStatus({ type: "", message: "" });
      try {
        const response = await api.get(`/api/bus/route/bus/${busId}`);
        if (isMounted) {
          const loadedRoute = response.data?.data || null;
          setRoute(loadedRoute);

          if (
            loadedRoute?._id &&
            intent === "schedule-trip" &&
            !intentHandledRef.current
          ) {
            intentHandledRef.current = true;
            navigate("/schedule-trip", {
              state: { busId, routeId: loadedRoute._id },
              replace: true
            });
          }
        }
      } catch (error) {
        if (error?.response?.status === 404) {
          navigate("/add-bus-route", { state: { busId, intent }, replace: true });
          return;
        }
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load route";
        if (isMounted) {
          setStatus({ type: "error", message });
          showError(message);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [busId, intent, navigate]);

  const handleUpdate = () => {
    if (!route?._id) return;
    showInfo("Opening route update form");
    navigate("/update-bus-route", { state: { routeId: route._id, busId, route } });
  };

  const handleScheduleTrip = () => {
    if (!route?._id) return;
    showInfo("Opening trip scheduling form");
    navigate("/schedule-trip", { state: { busId, routeId: route._id } });
  };

  const handleDelete = async () => {
    if (!route?._id) return;
    const confirmed = window.confirm("Are you sure you want to delete this route?");
    if (!confirmed) return;

    setStatus({ type: "", message: "" });
    try {
      const response = await api.delete(`/api/bus/route/${route._id}`);
      setStatus({
        type: "success",
        message: response.data?.message || "Route deleted successfully"
      });
      showSuccess(response.data?.message || "Route deleted successfully");
      navigate("/add-bus-route", { state: { busId } });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete route";
      setStatus({ type: "error", message });
      showError(message);
    }
  };

  const stops = [
    ...(route?.from?.stopName
      ? [
          {
            name: route.from.stopName,
            time: route.from.departureTime || "",
            kind: "origin"
          }
        ]
      : []),
    ...(route?.stops || []).map((stop) => ({
      name: stop.stopName,
      time: stop.arrivalTime || stop.departureTime || "",
      kind: "stop"
    })),
    ...(route?.to?.stopName
      ? [
          {
            name: route.to.stopName,
            time: route.to.arrivalTime || "",
            kind: "destination"
          }
        ]
      : [])
  ].map((stop) => ({
    ...stop,
    minutes: parseTimeToMinutes(stop.time)
  }));

  const scheduledDateKey = getNepalDateKey(scheduledTrip?.travelDate);
  let trackerState;

  if (!scheduledDateKey) {
    trackerState = getCompletedTrackerState(
      stops,
      "No scheduled travel date was provided, so the bus is shown at the final stop by default."
    );
  } else if (scheduledDateKey > nepalTime.dateKey) {
    trackerState = getUpcomingTrackerState(
      stops,
      "This trip has not started yet. The bus is shown at the first stop until the scheduled day begins."
    );
  } else if (scheduledDateKey < nepalTime.dateKey) {
    trackerState = getCompletedTrackerState(
      stops,
      "This trip date has passed, so the bus is shown at the final stop."
    );
  } else {
    trackerState = getTrackerState(stops, nepalTime.minutesSinceMidnight);
  }
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  return (
    <main className="route-page">
      <section className="route-shell">
        <div className="route-header">
          <div>
            <p className="route-kicker">Route tracker</p>
            <h1>
              {firstStop?.name || "Origin"} to {lastStop?.name || "Destination"}
            </h1>
            <p>
              Nepal time is used to estimate where the bus icon should appear across this route.
            </p>
          </div>

          <div className="route-time-card">
            <span className="route-time-label">Current Nepal time</span>
            <strong>{nepalTime.label}</strong>
          </div>
        </div>

        {status.message ? (
          <div className={`route-status ${status.type}`}>{status.message}</div>
        ) : null}

        {route ? (
          <>
            <div className="route-overview-grid">
              <div className="route-overview-card">
                <span className="route-card-label">Distance</span>
                <strong>{route.distanceKm ? `${route.distanceKm} km` : "Not set"}</strong>
              </div>
              <div className="route-overview-card">
                <span className="route-card-label">Duration</span>
                <strong>
                  {route.estimatedDurationMin
                    ? `${route.estimatedDurationMin} min`
                    : "Not set"}
                </strong>
              </div>
              <div className="route-overview-card">
                <span className="route-card-label">Scheduled date</span>
                <strong>{scheduledTrip?.travelDate ? getNepalDateKey(scheduledTrip.travelDate) : "Not available"}</strong>
              </div>
              <div className="route-overview-card">
                <span className="route-card-label">Live status</span>
                <strong>{trackerState.currentSegmentLabel}</strong>
              </div>
            </div>

            {canManageRoute ? (
              <div className="route-actions">
                <button type="button" onClick={handleUpdate} className="route-action-btn primary">
                  Update Route
                </button>
                <button
                  type="button"
                  onClick={handleScheduleTrip}
                  className="route-action-btn secondary"
                >
                  Schedule Trip
                </button>
                <button type="button" onClick={handleDelete} className="route-action-btn danger">
                  Delete Route
                </button>
              </div>
            ) : null}

            <div className="route-tracker-card">
              <div className="route-tracker-head">
                <div>
                  <p className="route-kicker">Live movement</p>
                  <h2>Bus position on the route</h2>
                </div>
                <div className={`route-phase-badge ${trackerState.phase}`}>
                  {trackerState.phase.replace("_", " ")}
                </div>
              </div>

              <div className="route-container" style={{ "--stops-count": stops.length || 1 }}>
                <div className="timeline">
                  {stops.map((stop, index) => (
                    <article key={`${stop.name}-${index}`} className="stop-card">
                      <span className="stop-index">{index + 1}</span>
                      <div className="stop-card-copy">
                        <span className="stop-name">{stop.name}</span>
                        <span className="stop-time">{stop.time || "Time not set"}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="bus-track">
                  <div className="track-line"></div>
                  <div
                    className={`track-progress ${trackerState.isTrackActive ? "active" : ""}`}
                    style={{ height: `${trackerState.carPositionPercent}%` }}
                  ></div>
                  <img
                    src={busIcon}
                    alt="Bus route marker"
                    className="bus-icon"
                    style={{ top: `calc(${trackerState.carPositionPercent}% - 26px)` }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="route-empty">Loading route details...</div>
        )}
      </section>
    </main>
  );
}

export default BusRoute;
