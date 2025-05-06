const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: "default", // For single-user setup, we'll use a default userId
    required: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
    required: true,
  },
  scope: {
    type: String,
    required: true,
  },
  token_type: {
    type: String,
    required: true,
  },
  expiry_date: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "90d", // Token documents will be automatically deleted after 90 days
  },
});

module.exports = mongoose.model("Token", TokenSchema);
