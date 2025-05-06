// scripts/init-token.js
require("dotenv").config();
const mongoose = require("mongoose");
const Token = require("../models/Token");

async function initializeToken() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Check if token exists in environment variable
    if (!process.env.GOOGLE_OAUTH_TOKEN) {
      console.error("No token found in environment variables");
      process.exit(1);
    }

    try {
      // Parse token from environment variable
      const TOKEN_DATA = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);

      // Check if a token already exists in database
      const existingToken = await Token.findOne({ userId: "default" });

      if (existingToken) {
        console.log("Token already exists in database. Updating...");
        // Update existing token
        existingToken.access_token = TOKEN_DATA.access_token;
        existingToken.refresh_token = TOKEN_DATA.refresh_token;
        existingToken.scope = TOKEN_DATA.scope;
        existingToken.token_type = TOKEN_DATA.token_type;
        existingToken.expiry_date = TOKEN_DATA.expiry_date;

        await existingToken.save();
        console.log("Token updated successfully");
      } else {
        console.log("No token found in database. Creating new token...");
        // Create new token
        const newToken = new Token({
          userId: "default",
          access_token: TOKEN_DATA.access_token,
          refresh_token: TOKEN_DATA.refresh_token,
          scope: TOKEN_DATA.scope,
          token_type: TOKEN_DATA.token_type,
          expiry_date: TOKEN_DATA.expiry_date,
        });

        await newToken.save();
        console.log("Token created successfully");
      }

      // Display token info (without showing actual tokens)
      const tokens = await Token.find().sort({ createdAt: -1 });
      console.log(`Total tokens in database: ${tokens.length}`);

      console.log("Latest token details:");
      const latestToken = tokens[0];
      console.log("- Access Token: [REDACTED]");
      console.log("- Refresh Token: [REDACTED]");
      console.log(
        `- Expires: ${new Date(latestToken.expiry_date).toLocaleString()}`
      );
      console.log(`- Scope: ${latestToken.scope}`);
    } catch (error) {
      console.error("Error parsing token data:", error);
    }
  } catch (error) {
    console.error("Error initializing token:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Run the initialization
initializeToken();
