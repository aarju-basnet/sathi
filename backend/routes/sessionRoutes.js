const express = require("express");
const router = express.Router();
const controller = require('../controllers/sessionController')

router.post("/", controller.createSession);
router.get("/:token", controller.getSession);
router.put("/:token/location", controller.updateLocation);
router.put("/:token/emergency", controller.toggleEmergency);

module.exports = router;
