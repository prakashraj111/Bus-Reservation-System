const express = require("express");
const { getAdminDashboard } = require("../../controller/admin/adminController");
const isAuthenticated = require("../../middleware/isAuthenticated");
const restrictTo = require("../../middleware/restrictTo");

const router = express.Router();

router.use(isAuthenticated, restrictTo("admin"));

router.get("/dashboard", getAdminDashboard);

module.exports = router;
