import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../css/createPost.css";

function UpdateBusPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationBus = location.state?.bus || null;
  const locationBusId = location.state?.busId || locationBus?._id || locationBus?.id || "";

  const [formData, setFormData] = useState({
    busId: "",
    busName: "",
    description: "",
    operator: "",
    busNumberPlate: "",
    type: "nonac",
    totalSeats: "",
    isActive: true
  });

  const [image, setImage] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyBusToForm = (bus) => {
      if (!bus) return;
      setFormData({
        busId: bus._id || bus.id || "",
        busName: bus.busName || "",
        description: bus.description || "",
        operator: bus.operator || "",
        busNumberPlate: bus.busNumberPlate || "",
        type: bus.type || "nonac",
        totalSeats: bus.totalSeats ?? "",
        isActive: bus.isActive ?? true
      });
    };

    const fetchBus = async () => {
      if (!locationBusId) return;

      setStatus({ type: "", message: "" });
      try {
        const response = await api.get(`/api/bus/${locationBusId}`);
        const bus = response.data?.data || null;
        if (isMounted) {
          applyBusToForm(bus);
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

    if (locationBus) {
      applyBusToForm(locationBus);
    } else {
      fetchBus();
    }

    return () => {
      isMounted = false;
    };
  }, [locationBus, locationBusId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      if (!formData.busId) {
        setStatus({ type: "error", message: "Bus ID is required" });
        return;
      }

      const payload = new FormData();
      payload.append("busName", formData.busName);
      payload.append("description", formData.description);
      payload.append("operator", formData.operator);
      payload.append("busNumberPlate", formData.busNumberPlate);
      payload.append("type", formData.type);
      payload.append("totalSeats", formData.totalSeats);
      if (image) {
        payload.append("imageUrl", image);
      }

      const response = await api.put(`/api/bus/${formData.busId}`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const updatedBus = response.data?.data || null;
      const updatedBusId =
        updatedBus?._id || updatedBus?.id || formData.busId;

      setStatus({
        type: "success",
        message: response.data?.message || "Bus updated successfully"
      });
      setFormData({
        busId: "",
        busName: "",
        description: "",
        operator: "",
        busNumberPlate: "",
        type: "nonac",
        totalSeats: "",
        isActive: true
      });
      setImage(null);
      navigate("/view-my-bus", { state: { busId: updatedBusId } });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create bus";
      setStatus({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bus-form-container">

      <h2>Update Bus</h2>

      <form className="bus-form" onSubmit={handleSubmit}>

        {status.message ? (
          <div className={`form-status ${status.type}`}>
            {status.message}
          </div>
        ) : null}

        <div className="form-group">
          <label>Bus ID</label>
          <input
            type="text"
            name="busId"
            value={formData.busId}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Bus Name</label>
          <input
            type="text"
            name="busName"
            value={formData.busName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Operator</label>
          <input
            type="text"
            name="operator"
            value={formData.operator}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Bus Number Plate</label>
          <input
            type="text"
            name="busNumberPlate"
            value={formData.busNumberPlate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Bus Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="ac">AC</option>
            <option value="nonac">Non AC</option>
            <option value="mini">Mini</option>
            <option value="luxury">Luxury</option>
            <option value="tourist">Tourist</option>
          </select>
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
          <label>Bus Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        <div className="form-group full">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group checkbox">
          <label>Active</label>
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Bus"}
        </button>

      </form>
    </div>
  );
}

export default UpdateBusPost;
