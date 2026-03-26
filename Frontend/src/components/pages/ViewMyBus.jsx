import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BusDetails from "./BusDetails";
import api from "../../services/api";

function ViewMyBus({ busId }){
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedBusId = busId || location.state?.busId || "";
  const [bus, setBus] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let isMounted = true;

    const fetchBus = async () => {
      if (!resolvedBusId) {
        setStatus({ type: "error", message: "Bus ID is required" });
        return;
      }

      setStatus({ type: "", message: "" });
      try {
        const response = await api.get(`/api/bus/${resolvedBusId}`);
        if (isMounted) {
          setBus(response.data?.data || null);
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load bus";
        if (isMounted) {
          setStatus({ type: "error", message });
        }
      }
    };

    fetchBus();

    return () => {
      isMounted = false;
    };
  }, [resolvedBusId]);

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = api.defaults.baseURL || "";
    return `${baseUrl}/${imageUrl}`;
  };

  const handleDelete = async () => {
    if (!resolvedBusId) {
      setStatus({ type: "error", message: "Bus ID is required" });
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
      navigate("/my-bus");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete bus";
      setStatus({ type: "error", message });
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
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}

export default ViewMyBus
