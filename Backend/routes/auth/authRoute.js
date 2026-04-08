const {
  registerUser,
  loginUser,
  logoutUser,
  becomeDriver
} = require("../../controller/auth/authController");
const isAuthenticated = require("../../middleware/isAuthenticated");

const router = require("express").Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(isAuthenticated, logoutUser);
router.route("/become-driver").post(isAuthenticated, becomeDriver);

module.exports = router;
