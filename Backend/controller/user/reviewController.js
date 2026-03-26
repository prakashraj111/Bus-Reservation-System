const Bus = require("../../model/busModel")
const Review = require("../../model/reviewModel")

exports.createReview = async (req, res) => {
  const busId = req.params.id
  const { comment, rating } = req.body
  if(!comment || !rating){
    return res.status(400).json({
        message: "Some fields are missing!"
    })
  }
//   console.log(req.user)
  // create review
  const review = await Review.create({
    userId: req.user.id,
    comment,
    rating
  })

  // push review id into bus
  await Bus.findByIdAndUpdate(
    busId,
    { $push: { reviews: review._id } },
    { new: true }
  )

  res.status(201).json({
    message: "Review added successfully",
    data: review
  })
}

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params

    const review = await Review.findById(reviewId)
    if (!review) {
      return res.status(404).json({ message: "Review not found" })
    }

    // 🔒 Ownership check
    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to delete this review"
      })
    }

    // 🧹 Remove review reference from Bus
    await Bus.updateOne(
      { reviews: reviewId },
      { $pull: { reviews: reviewId } }
    )

    // ❌ Delete review
    await Review.findByIdAndDelete(reviewId)

    res.status(200).json({
      message: "Review deleted successfully"
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params
    const { comment, rating } = req.body

    if (!comment && !rating) {
      return res.status(400).json({
        message: "Nothing to update"
      })
    }

    const review = await Review.findById(reviewId)
    if (!review) {
      return res.status(404).json({
        message: "Review not found"
      })
    }

    // 🔐 Ownership check
    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to update this review"
      })
    }

    // ✏️ Update fields
    if (comment) review.comment = comment
    if (rating) review.rating = rating

    await review.save()

    res.status(200).json({
      message: "Review updated successfully",
      data: review
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

