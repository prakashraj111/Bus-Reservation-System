import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/busRoute.css";
import busIcon from "./car.png";
import api from "../../services/api";

function BusRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const busId = location.state?.busId || "";
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      if (!busId) {
        setStatus({ type: "error", message: "Bus ID is required" });
        return;
      }

      setStatus({ type: "", message: "" });
      try {
        const response = await api.get(`/api/bus/route/bus/${busId}`);
        if (isMounted) {
          setRoute(response.data?.data || null);
        }
      } catch (error) {
        if (error?.response?.status === 404) {
          navigate("/add-bus-route", { state: { busId } });
          return;
        }
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load route";
        if (isMounted) {
          setStatus({ type: "error", message });
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [busId, navigate]);

  const handleUpdate = () => {
    if (!route?._id) return;
    navigate("/update-bus-route", { state: { routeId: route._id, busId, route } });
  };

  const handleScheduleTrip = () => {
    if (!route?._id) return;
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
      navigate("/add-bus-route", { state: { busId } });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete route";
      setStatus({ type: "error", message });
    }
  };

  const stops = [
    ...(route?.from?.stopName
      ? [
          {
            name: route.from.stopName,
            time: route.from.departureTime || ""
          }
        ]
      : []),
    ...(route?.stops || []).map((stop) => ({
      name: stop.stopName,
      time: stop.arrivalTime || ""
    })),
    ...(route?.to?.stopName
      ? [
          {
            name: route.to.stopName,
            time: route.to.arrivalTime || ""
          }
        ]
      : [])
  ];

  const stopCount = stops.length || 1;

  return (
    <>
      {status.message ? <div>{status.message}</div> : null}

      {route ? (
        <>
          <div className="route-actions">
            <button type="button" onClick={handleUpdate}>Update Route</button>
            <button type="button" onClick={handleScheduleTrip}>Schedule Trip</button>
            <button type="button" onClick={handleDelete}>Delete Route</button>
          </div>

          <div className="route-container" style={{ "--stops-count": stopCount }}>
            <div className="timeline">
              {stops.map((stop, index) => (
                <div key={`${stop.name}-${index}`} className="stop-card">
                  <span className="stop-name">{stop.name}</span>
                  <span className="stop-time">{stop.time}</span>
                </div>
              ))}
            </div>

            <div className="bus-track">
              <div className="track-line"></div>
              <img src={busIcon} alt="Bus" className="bus-icon" />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default BusRoute;
