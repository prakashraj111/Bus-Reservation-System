const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createReview,
  updateReview,
  deleteReview
} = require("../../controller/user/reviewController");
const isAuthenticated = require("../../middleware/isAuthenticated");

router.use(isAuthenticated);

router.route("/").post(createReview);
router.route("/:reviewId").put(updateReview).delete(deleteReview);

module.exports = router;
