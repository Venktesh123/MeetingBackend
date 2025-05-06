// controllers/tokenController.js
const Token = require("../models/Token");

// Get all tokens (admin only)
const getAllTokens = async (req, res) => {
  try {
    // In a production app, this would be protected by admin authentication
    const tokens = await Token.find()
      .sort({ createdAt: -1 })
      .select("-access_token -refresh_token"); // Don't send actual tokens

    res.json(
      tokens.map((token) => ({
        id: token._id,
        userId: token.userId,
        createdAt: token.createdAt,
        expiryDate: new Date(token.expiry_date).toISOString(),
        isExpired: token.expiry_date < Date.now(),
      }))
    );
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
};

// Delete a token
const deleteToken = async (req, res) => {
  try {
    const result = await Token.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ error: "Token not found" });
    }

    res.json({ message: "Token deleted successfully" });
  } catch (error) {
    console.error("Error deleting token:", error);
    res.status(500).json({ error: "Failed to delete token" });
  }
};

// Delete all tokens
const deleteAllTokens = async (req, res) => {
  try {
    await Token.deleteMany({});
    res.json({ message: "All tokens deleted successfully" });
  } catch (error) {
    console.error("Error deleting all tokens:", error);
    res.status(500).json({ error: "Failed to delete all tokens" });
  }
};

module.exports = {
  getAllTokens,
  deleteToken,
  deleteAllTokens,
};
