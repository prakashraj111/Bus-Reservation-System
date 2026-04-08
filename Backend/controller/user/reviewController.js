const Bus = require("../../models/busModel");
const Review = require("../../models/reviewModel");
const { isValidObjectId, validateReviewPayload } = require("../../utils/validation");

exports.createReview = async (req, res) => {
  try {
    const busId = req.params.id;

    if (!isValidObjectId(busId)) {
      return res.status(400).json({ message: "Invalid bus ID" });
    }

    const validation = validateReviewPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    const review = await Review.create({
      userId: req.user.id,
      comment: validation.value.comment,
      rating: validation.value.rating
    });

    await Bus.findByIdAndUpdate(
      busId,
      { $push: { reviews: review._id } },
      { returnDocument: "after" }
    );

    res.status(201).json({
      message: "Review added successfully",
      data: review
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!isValidObjectId(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to delete this review"
      });
    }

    await Bus.updateOne(
      { reviews: reviewId },
      { $pull: { reviews: reviewId } }
    );

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!isValidObjectId(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        message: "Review not found"
      });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to update this review"
      });
    }

    const validation = validateReviewPayload({
      comment: req.body.comment ?? review.comment,
      rating: req.body.rating ?? review.rating
    });

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    review.comment = validation.value.comment;
    review.rating = validation.value.rating;

    await review.save();

    res.status(200).json({
      message: "Review updated successfully",
      data: review
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
