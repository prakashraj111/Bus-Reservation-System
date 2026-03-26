import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BusCard from "./BusCard";
import api from "../../services/api";

function MyBus(){
    const [buses, setBuses] = useState([]);
    const [status, setStatus] = useState({ type: "", message: "" });

    useEffect(() => {
        let isMounted = true;

        const fetchBuses = async () => {
            setStatus({ type: "", message: "" });
            try {
                const response = await api.get("/api/bus");
                const list = response.data?.buses || [];
                if (isMounted) {
                    setBuses(list);
                }
            } catch (error) {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    "Failed to load buses";
                if (isMounted) {
                    setStatus({ type: "error", message });
                }
            }
        };

        fetchBuses();

        return () => {
            isMounted = false;
        };
    }, []);

    const resolveImageUrl = (imageUrl) => {
        if (!imageUrl) return "";
        if (imageUrl.startsWith("http")) return imageUrl;
        const baseUrl = api.defaults.baseURL || "";
        return `${baseUrl}/${imageUrl}`;
    };

    return (
        <>
            {status.message ? <div>{status.message}</div> : null}

            {buses.map((bus) => (
                <Link key={bus._id} to="/view-my-bus" state={{ busId: bus._id }}>
                    <BusCard
                        title={bus.busName}
                        description={bus.description}
                        seats={bus.totalSeats}
                        image={resolveImageUrl(bus.imageUrl)}
                    />
                </Link>
            ))}
        </>
    );
}

export default MyBus
