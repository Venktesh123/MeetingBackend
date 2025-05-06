const express = require("express");
const router = express.Router();
const tokenController = require("../controllers/tokenController");

// Token management routes
router.get("/", tokenController.getAllTokens);
router.delete("/:id", tokenController.deleteToken);
router.delete("/", tokenController.deleteAllTokens);

module.exports = router;
