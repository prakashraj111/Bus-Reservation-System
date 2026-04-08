import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BusDetails from "./BusDetails";
import api from "../../services/api";
import { useNotification } from "../notifications/NotificationProvider";

function ViewMyBus({ busId }){
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const resolvedBusId = busId || location.state?.busId || "";
  const [bus, setBus] = useState(null);
  const [resolvedTrip, setResolvedTrip] = useState(location.state?.trip || null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const pickScheduledTripForBus = (trips) => {
      const matchingTrips = (trips || [])
        .filter((trip) => {
          const tripBusId =
            trip?.busId?._id || trip?.busId?.id || trip?.busId || trip?.bus?._id || trip?.bus?.id;
          return tripBusId === resolvedBusId && trip?.status === "scheduled";
        })
        .sort((firstTrip, secondTrip) => {
          const firstDate = new Date(firstTrip?.travelDate || 0).getTime();
          const secondDate = new Date(secondTrip?.travelDate || 0).getTime();
          return firstDate - secondDate;
        });

      return matchingTrips[0] || null;
    };

    const fetchBus = async () => {
      if (!resolvedBusId) {
        const message = "Bus ID is required";
        setStatus({ type: "error", message });
        showError(message);
        return;
      }

      setStatus({ type: "", message: "" });
      try {
        const [busResponse, tripsResponse] = await Promise.all([
          api.get(`/api/bus/${resolvedBusId}`),
          location.state?.trip ? Promise.resolve(null) : api.get("/api/trip/all")
        ]);

        if (isMounted) {
          const loadedBus = busResponse.data?.data || null;
          setBus(loadedBus);

          if (!location.state?.trip) {
            const trips = tripsResponse?.data?.data || [];
            const scheduledTrip = pickScheduledTripForBus(trips);

            if (scheduledTrip) {
              setResolvedTrip({
                ...scheduledTrip,
                bus: scheduledTrip.bus || scheduledTrip.busId || loadedBus,
                route: scheduledTrip.route || scheduledTrip.routeId || null
              });
            } else {
              setResolvedTrip(null);
            }
          }
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load bus";
        if (isMounted) {
          setStatus({ type: "error", message });
          showError(message);
        }
      }
    };

    fetchBus();

    return () => {
      isMounted = false;
    };
  }, [location.state?.trip, resolvedBusId, showError]);

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = api.defaults.baseURL || "";
    return `${baseUrl}/${imageUrl}`;
  };

  const handleDelete = async () => {
    if (!resolvedBusId) {
      const message = "Bus ID is required";
      setStatus({ type: "error", message });
      showError(message);
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this bus?");
    if (!confirmed) return;

    setStatus({ type: "", message: "" });
    try {
      const response = await api.delete(`/api/bus/${resolvedBusId}`);
      setStatus({
        type: "success",
        message: response.data?.message || "Bus deleted successfully"
      });
      showSuccess(response.data?.message || "Bus deleted successfully");
      navigate("/my-bus");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete bus";
      setStatus({ type: "error", message });
      showError(message);
    }
  };

  return (
    <>
      {status.message ? <div>{status.message}</div> : null}

      {bus ? (
        <BusDetails
          image={resolveImageUrl(bus.imageUrl)}
          title={bus.busName}
          description={bus.description}
          seats={bus.totalSeats}
          type={bus.type}
          busNo={bus.busNumberPlate}
          busOperator={bus.operator}
          busId={bus._id || bus.id}
          bus={bus}
          trip={resolvedTrip}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

export default ViewMyBus
