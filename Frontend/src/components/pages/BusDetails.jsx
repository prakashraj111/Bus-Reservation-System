import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { getAuthUser } from "../../utils/auth";
import "../css/busDetails.css";
import { sanitizeText, validateReviewForm } from "../../utils/validation";

const REVIEWS_PER_PAGE = 10;

const createEmptyReviewForm = () => ({
  comment: "",
  rating: 5
});

const getCurrentUserId = (user) => user?.id || user?._id || "";

const getReviewOwnerId = (review) => {
  const owner = review?.userId;

  if (!owner) return "";
  if (typeof owner === "string") return owner;

  return owner._id || owner.id || "";
};

const getReviewOwnerName = (review) => {
  const owner = review?.userId;

  if (!owner) return "Verified traveler";
  if (typeof owner === "string") return "Verified traveler";

  return owner.username || owner.email || "Verified traveler";
};

const getInitials = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "VT";

const renderStars = (rating) => {
  const safeRating = Math.max(1, Math.min(Number(rating) || 0, 5));

  return Array.from({ length: 5 }, (_, index) => (
    <span key={`${safeRating}-${index}`} className={index < safeRating ? "filled" : ""}>
      {"\u2605"}
    </span>
  ));
};

function BusDetails({
  image,
  title,
  description,
  busOperator,
  seats,
  type,
  busNo,
  busId,
  bus,
  trip,
  onDelete
}) {
  const user = getAuthUser();
  const canManageBus = ["driver", "admin"].includes(user?.role || "");
  const [busData, setBusData] = useState(bus || null);
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);
  const [reviewForm, setReviewForm] = useState(createEmptyReviewForm());
  const [editingReviewId, setEditingReviewId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setBusData(bus || null);
  }, [bus]);

  useEffect(() => {
    setVisibleCount(REVIEWS_PER_PAGE);
  }, [busData?._id, busData?.reviews?.length]);

  const refreshBusDetails = async () => {
    if (!busId) return;

    setIsRefreshing(true);

    try {
      const response = await api.get(`/api/bus/${busId}`);
      setBusData(response.data?.data || null);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to refresh reviews right now."
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const reviews = Array.isArray(busData?.reviews) ? busData.reviews : [];
  const orderedReviews = [...reviews].reverse();
  const visibleReviews = orderedReviews.slice(0, visibleCount);
  const hasMoreReviews = visibleCount < orderedReviews.length;
  const averageRating = reviews.length
    ? (reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleReviewFieldChange = (event) => {
    const { name, value } = event.target;

    setReviewForm((current) => ({
      ...current,
      [name]: name === "rating" ? Number(value) : value
    }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      setStatus({ type: "error", message: "Please log in to write a review." });
      return;
    }

    const validationMessage = validateReviewForm(reviewForm);
    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      return;
    }

    if (!busId) {
      setStatus({ type: "error", message: "Bus information is missing." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      if (editingReviewId) {
        await api.put(`/api/bus/${busId}/review/${editingReviewId}`, {
          comment: sanitizeText(reviewForm.comment),
          rating: reviewForm.rating
        });
        setStatus({ type: "success", message: "Your review was updated successfully." });
      } else {
        await api.post(`/api/bus/${busId}/review`, {
          comment: sanitizeText(reviewForm.comment),
          rating: reviewForm.rating
        });
        setStatus({ type: "success", message: "Your review was added successfully." });
      }

      setReviewForm(createEmptyReviewForm());
      setEditingReviewId("");
      await refreshBusDetails();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save your review."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review._id || "");
    setReviewForm({
      comment: review.comment || "",
      rating: Number(review.rating) || 5
    });
    setStatus({ type: "", message: "" });
  };

  const handleCancelEdit = () => {
    setEditingReviewId("");
    setReviewForm(createEmptyReviewForm());
    setStatus({ type: "", message: "" });
  };

  const handleDeleteReview = async (reviewId) => {
    if (!user || !busId || !reviewId) return;

    const confirmed = window.confirm("Are you sure you want to delete this review?");
    if (!confirmed) return;

    setStatus({ type: "", message: "" });

    try {
      await api.delete(`/api/bus/${busId}/review/${reviewId}`);
      if (editingReviewId === reviewId) {
        handleCancelEdit();
      }
      setStatus({ type: "success", message: "Your review was deleted successfully." });
      await refreshBusDetails();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to delete your review."
      });
    }
  };

  return (
    <section className="bus-details-page">
      <div className="bus-container">
        <div className="bus-left">
          <div className="bus-image-shell">
            <div className="bus-image">
              <img src={image} alt={title || "Bus"} />
            </div>
          </div>

          <div className="bus-operator-card">
            <span className="bus-section-label">Operator</span>
            <strong>{busOperator || "Not provided"}</strong>
          </div>

          <div className="bus-buttons">
            <Link to="/bus-route" state={{ busId, trip }} className="bus-action-btn secondary">
              View Route
            </Link>

            {canManageBus ? (
              <>
              <Link to="/edit-post" state={{ busId, bus }} className="bus-action-btn primary">
                Edit Bus
              </Link>
              <button type="button" onClick={onDelete} className="bus-action-btn danger">
                Delete Bus
              </button>
              <Link
                to="/bus-route"
                state={{ busId, intent: "schedule-trip" }}
                className="bus-action-btn secondary"
              >
                Schedule Trip
              </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="bus-right">
          <div className="bus-heading-card">
            <p className="bus-section-label">Bus profile</p>
            <h1>{title || "Unnamed bus"}</h1>
            <p className="bus-description">
              {description || "No description has been added for this bus yet."}
            </p>
          </div>

          <div className="bus-summary-grid">
            <div className="bus-summary-card">
              <span className="bus-section-label">Total seats</span>
              <strong>{seats || 0}</strong>
            </div>
            <div className="bus-summary-card">
              <span className="bus-section-label">Bus type</span>
              <strong>{type || "Not set"}</strong>
            </div>
            <div className="bus-summary-card">
              <span className="bus-section-label">Number plate</span>
              <strong>{busNo || "Not set"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="bus-review-shell">
        <div className="bus-review-head">
          <div>
            <p className="bus-section-label">Passenger reviews</p>
            <h2>What riders are saying</h2>
            <p className="bus-review-subtitle">
              Read recent feedback for this bus and share your own experience.
            </p>
          </div>

          <div className="bus-review-summary-card">
            <span className="bus-section-label">Average rating</span>
            <strong>{averageRating}</strong>
            <span>{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {status.message ? (
          <div className={`bus-review-status ${status.type}`}>{status.message}</div>
        ) : null}

        <div className="bus-review-grid">
          <section className="bus-review-list-card">
            <div className="bus-review-list-head">
              <h3>Latest reviews</h3>
              <span>
                Showing {orderedReviews.length ? `${Math.min(visibleReviews.length, orderedReviews.length)} of ${orderedReviews.length}` : "0 of 0"}
              </span>
            </div>

            {isRefreshing ? <div className="bus-review-empty">Refreshing reviews...</div> : null}

            {!isRefreshing && !reviews.length ? (
              <div className="bus-review-empty">
                No reviews yet. Be the first person to leave feedback for this bus.
              </div>
            ) : null}

            {!isRefreshing && reviews.length ? (
              <div className="bus-review-list">
                {visibleReviews.map((review) => {
                  const ownerId = getReviewOwnerId(review);
                  const isOwner = ownerId && ownerId === getCurrentUserId(user);
                  const ownerName = getReviewOwnerName(review);

                  return (
                    <article key={review._id} className="bus-review-card">
                      <div className="bus-review-card-top">
                        <div className="bus-review-avatar">{getInitials(ownerName)}</div>
                        <div className="bus-review-meta">
                          <strong>{ownerName}</strong>
                          <div className="bus-review-stars">{renderStars(review.rating)}</div>
                        </div>
                        {isOwner ? (
                          <div className="bus-review-actions">
                            <button type="button" onClick={() => handleEditReview(review)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteReview(review._id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <p>{review.comment || "No comment provided."}</p>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {reviews.length > REVIEWS_PER_PAGE ? (
              <div className="bus-review-pagination">
                <button
                  type="button"
                  className="bus-review-page-btn"
                  onClick={() => setVisibleCount((current) => Math.max(current - REVIEWS_PER_PAGE, REVIEWS_PER_PAGE))}
                  disabled={visibleCount <= REVIEWS_PER_PAGE}
                >
                  &lt;&lt; Previous
                </button>
                <button
                  type="button"
                  className="bus-review-page-btn"
                  onClick={() => setVisibleCount((current) => Math.min(current + REVIEWS_PER_PAGE, reviews.length))}
                  disabled={!hasMoreReviews}
                >
                  Next &gt;&gt;
                </button>
              </div>
            ) : null}
          </section>

          <aside className="bus-review-form-card">
            <p className="bus-section-label">{editingReviewId ? "Edit review" : "Write a review"}</p>
            <h3>{editingReviewId ? "Update your feedback" : "Share your trip experience"}</h3>
            <p className="bus-review-form-copy">
              {user
                ? "Only authenticated users can submit, edit, or remove their own reviews."
                : "Log in to create, edit, or delete a review for this bus."}
            </p>

            <form className="bus-review-form" onSubmit={handleReviewSubmit}>
              <label className="bus-review-form-field">
                <span>Rating</span>
                <select
                  name="rating"
                  value={reviewForm.rating}
                  onChange={handleReviewFieldChange}
                  disabled={!user || isSubmitting}
                  required
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </label>

              <label className="bus-review-form-field">
                <span>Your review</span>
                <textarea
                  name="comment"
                  rows="6"
                  placeholder="Tell other passengers about comfort, cleanliness, punctuality, or the overall trip."
                  value={reviewForm.comment}
                  onChange={handleReviewFieldChange}
                  disabled={!user || isSubmitting}
                  maxLength={500}
                  required
                />
              </label>

              <div className="bus-review-form-actions">
                <button
                  type="submit"
                  className="bus-review-submit-btn"
                  disabled={!user || isSubmitting}
                >
                  {isSubmitting ? "Saving..." : editingReviewId ? "Update Review" : "Submit Review"}
                </button>
                {editingReviewId ? (
                  <button
                    type="button"
                    className="bus-review-cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default BusDetails;
