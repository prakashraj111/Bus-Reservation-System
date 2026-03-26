const { registerUser, loginUser, logoutUser } = require("../../controller/auth/authController");
const isAuthenticated = require("../../middleware/isAuthenticated");

const router = require("express").Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(isAuthenticated, logoutUser);

module.exports = router;
