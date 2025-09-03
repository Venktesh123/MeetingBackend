// controllers/authController.js
const googleMeetService = require("../services/googleMeetService");
const Token = require("../models/Token");

// Start OAuth2 flow
const login = (req, res) => {
  try {
    const authUrl = googleMeetService.getAuthUrl();
    console.log("Redirecting to Google OAuth: ", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
};

// OAuth2 callback handler
const oauth2Callback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No authorization code received" });
  }

  try {
    console.log("Received OAuth callback with code");
    const tokens = await googleMeetService.getTokenFromCode(code);
    console.log("Successfully exchanged code for tokens and saved to database");

    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            .container {
              border: 1px solid #ddd;
              padding: 20px;
              border-radius: 5px;
            }
            h3 {
              color: #4CAF50;
            }
            .instructions {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .token-info {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h3>Authentication successful!</h3>
            <p>Your Google account has been successfully authenticated.</p>
            <p>The OAuth tokens have been securely stored in the database.</p>
            
            <div class="token-info">
              <strong>Token Information:</strong><br>
              • Database Storage: 1 year (365 days)<br>
              • Google Access Token: ~1 hour (auto-refreshed)<br>
              • Google Refresh Token: Permanent (until revoked)<br>
              • Token Expires: ${new Date(tokens.expiry_date).toLocaleString()}
            </div>
            
            <p>You can close this window now and return to the application.</p>
            
            <div class="instructions">
              <p><strong>Note:</strong> Your authentication is now valid for 1 year or until you revoke access.</p>
              <p>The system will automatically refresh access tokens as needed.</p>
              <p>If you experience authentication issues, you can re-authenticate by visiting the login endpoint again.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({ error: "Failed to complete authentication" });
  }
};

// Check if authenticated
const checkAuthStatus = async (req, res) => {
  try {
    // Get detailed token status
    const tokenStatus = await googleMeetService.getTokenStatus();

    if (!tokenStatus.exists) {
      return res.json({
        isAuthenticated: false,
        message: "No authentication token found",
      });
    }

    // Initialize OAuth client to verify authentication
    const client = await googleMeetService.initializeOAuthClient();
    const isAuthenticated = client !== null;

    // Get token info for response
    let tokenInfo = null;
    if (isAuthenticated) {
      const token = await Token.findOne({ userId: "default" }).sort({
        createdAt: -1,
      });
      if (token) {
        const dbExpiryDate = new Date(
          token.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000
        );
        tokenInfo = {
          googleTokenExpiresAt: new Date(token.expiry_date).toISOString(),
          databaseTokenExpiresAt: dbExpiryDate.toISOString(),
          scopes: token.scope,
          isGoogleTokenExpired: token.expiry_date < Date.now(),
          isDatabaseTokenExpired: dbExpiryDate.getTime() < Date.now(),
          tokenCreatedAt: token.createdAt.toISOString(),
          timeUntilDatabaseExpiry: Math.max(
            0,
            dbExpiryDate.getTime() - Date.now()
          ),
          timeUntilGoogleTokenExpiry: Math.max(
            0,
            token.expiry_date - Date.now()
          ),
        };
      }
    }

    console.log(
      "Authentication status check: ",
      isAuthenticated ? "Authenticated" : "Not authenticated"
    );

    res.json({
      isAuthenticated,
      tokenInfo,
      tokenStatus,
    });
  } catch (error) {
    console.error("Error checking authentication status:", error);
    res.json({
      isAuthenticated: false,
      error: "Failed to check authentication status",
    });
  }
};

module.exports = {
  login,
  oauth2Callback,
  checkAuthStatus,
};
