const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Authentication routes
router.get("/login", authController.login);
router.get("/oauth2callback", authController.oauth2Callback);
router.get("/status", authController.checkAuthStatus);

module.exports = router;
