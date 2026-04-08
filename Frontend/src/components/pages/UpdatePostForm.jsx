import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../css/createPost.css";
import { sanitizeText, validateBusForm } from "../../utils/validation";
import { useNotification } from "../notifications/NotificationProvider";

function UpdateBusPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();
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
          showError(message);
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
    const file = e.target.files[0];
    if (!file) {
      setImage(null);
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      const message = "Only PNG and JPG/JPEG images are allowed.";
      setStatus({ type: "error", message });
      showError(message);
      e.target.value = "";
      setImage(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "Image size must be 5MB or smaller.";
      setStatus({ type: "error", message });
      showError(message);
      e.target.value = "";
      setImage(null);
      return;
    }

    setStatus({ type: "", message: "" });
    setImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = validateBusForm(formData);
    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      showError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      if (!formData.busId) {
        const message = "Bus ID is required";
        setStatus({ type: "error", message });
        showError(message);
        return;
      }

      const payload = new FormData();
      payload.append("busName", sanitizeText(formData.busName));
      payload.append("description", sanitizeText(formData.description));
      payload.append("operator", sanitizeText(formData.operator));
      payload.append("busNumberPlate", String(Number(formData.busNumberPlate)));
      payload.append("type", formData.type);
      payload.append("totalSeats", String(Number(formData.totalSeats)));
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
      showSuccess(response.data?.message || "Bus updated successfully");
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
      showError(message);
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
            readOnly
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
            maxLength={60}
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
            maxLength={60}
            required
          />
        </div>

        <div className="form-group">
          <label>Bus Number Plate</label>
          <input
            type="number"
            name="busNumberPlate"
            value={formData.busNumberPlate}
            onChange={handleChange}
            min="1"
            step="1"
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
            min="40"
            max="60"
            step="1"
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
            maxLength={500}
            required
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
