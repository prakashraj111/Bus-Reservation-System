import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import busFallbackImage from "../../assets/bus5.png";
import "../css/myBus.css";

const resolveImageUrl = (imageUrl, baseUrl) => {
    if (!imageUrl) return busFallbackImage;
    if (imageUrl.startsWith("http")) return imageUrl;
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedImageUrl = String(imageUrl).replace(/^\/+/, "");
    return `${normalizedBaseUrl}/${normalizedImageUrl}`;
};

function MyBus(){
    const [buses, setBuses] = useState([]);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isLoading, setIsLoading] = useState(true);
    const [brokenImages, setBrokenImages] = useState({});

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
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchBuses();

        return () => {
            isMounted = false;
        };
    }, []);
    const baseUrl = api.defaults.baseURL || "";

    return (
        <main className="my-bus-page">
            <section className="my-bus-shell">
                <div className="my-bus-header">
                    <div>
                        <p className="my-bus-kicker">My buses</p>
                        <h1>Your fleet overview</h1>
                        <p>
                            Review every bus you have added, then open a record to inspect or manage it.
                        </p>
                    </div>
                    <Link to="/create-post" className="my-bus-cta">
                        Add New Bus
                    </Link>
                </div>

                {status.message ? (
                    <div className={`my-bus-status ${status.type}`}>{status.message}</div>
                ) : null}

                {isLoading ? (
                    <div className="my-bus-empty">Loading your buses...</div>
                ) : buses.length ? (
                    <div className="my-bus-grid">
                        {buses.map((bus) => (
                            <Link
                                key={bus._id}
                                to="/view-my-bus"
                                state={{ busId: bus._id }}
                                className="my-bus-card"
                            >
                                <div className="my-bus-image-wrap">
                                    {bus.imageUrl ? (
                                        <img
                                            src={
                                                brokenImages[bus._id]
                                                    ? busFallbackImage
                                                    : resolveImageUrl(bus.imageUrl, baseUrl)
                                            }
                                            alt={bus.busName || "Bus"}
                                            className="my-bus-image"
                                            onError={() =>
                                                setBrokenImages((current) => ({
                                                    ...current,
                                                    [bus._id]: true
                                                }))
                                            }
                                        />
                                    ) : (
                                        <img
                                            src={busFallbackImage}
                                            alt={bus.busName || "Bus"}
                                            className="my-bus-image"
                                        />
                                    )}
                                </div>

                                <div className="my-bus-card-body">
                                    <div className="my-bus-card-top">
                                        <div>
                                            <p className="my-bus-card-label">Bus</p>
                                            <h3>{bus.busName || "Unnamed bus"}</h3>
                                        </div>
                                        <span className="my-bus-seat-badge">
                                            {bus.totalSeats || 0} seats
                                        </span>
                                    </div>

                                    <p className="my-bus-description">
                                        {bus.description || "No description added yet."}
                                    </p>

                                    <div className="my-bus-meta">
                                        <span>{bus.operator || "Operator not set"}</span>
                                        <span>{bus.type || "Type not set"}</span>
                                        <span>{bus.busNumberPlate || "Number plate not set"}</span>
                                    </div>

                                    <div className="my-bus-card-footer">
                                        <span>Open details</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="my-bus-empty">
                        You have not added any buses yet. Start by creating your first bus profile.
                    </div>
                )}
            </section>
        </main>
    );
}

export default MyBus
