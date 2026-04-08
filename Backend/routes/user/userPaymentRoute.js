const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createPayment,
  getAllPayments,
  getMyPayments,
  getSinglePayment,
  updatePayment,
  deletePayment,
  verifyEsewaPayment,
  markPaymentPaid,
  markPaymentFailed
} = require("../../controller/user/userPaymentController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");

router.use(isAuthenticated);

router.route("/").post(createPayment);
router.route("/my").get(getMyPayments);
router.route("/all").get(restrictTo("admin"), getAllPayments);

router
  .route("/:id")
  .get(getSinglePayment)
  .put(updatePayment)
  .delete(deletePayment);

router.route("/verify").post(verifyEsewaPayment);
router.route("/:id/verify").post(verifyEsewaPayment);
router.route("/:id/paid").patch(markPaymentPaid);
router.route("/:id/failed").patch(markPaymentFailed);

module.exports = router;
