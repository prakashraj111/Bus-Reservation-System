const express = require("express");
const router = express.Router();
const isAuthenticated = require("../../middleware/isAuthenticated");
const {
  getSeatLockDetails,
  releaseSeatLock,
  upsertSeatLockDetails
} = require("../../controller/user/userSeatLockController");

router.use(isAuthenticated);

router.get("/:seatLockId", getSeatLockDetails);
router.put("/:seatLockId", upsertSeatLockDetails);
router.post("/:seatLockId/release", releaseSeatLock);

module.exports = router;
