const express = require("express");
const {
  createBusPost,
  getOnePost,
  updateBusPost,
  deletePost,
  getMyBuses,
} = require("../../controller/driver/driverController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");
const { multer, uploadConfig } = require("../../middleware/multerConfig");

const router = express.Router();
const upload = multer(uploadConfig);

router
  .route("/")
  .get(isAuthenticated, getMyBuses)
  .post(isAuthenticated, upload.single("imageUrl"), createBusPost);

router
  .route("/:id")
  .get(getOnePost)
  .put(isAuthenticated, restrictTo("driver", "admin"), upload.single("imageUrl"), updateBusPost)
  .delete(isAuthenticated, restrictTo("driver", "admin"), deletePost);

module.exports = router;
