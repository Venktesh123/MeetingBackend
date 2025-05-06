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
          </style>
        </head>
        <body>
          <div class="container">
            <h3>Authentication successful!</h3>
            <p>Your Google account has been successfully authenticated.</p>
            <p>The OAuth tokens have been securely stored in the database.</p>
            <p>You can close this window now and return to the application.</p>
            
            <div class="instructions">
              <p><strong>Note:</strong> Your authentication is valid for 7 days or until you revoke access.</p>
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
    // Initialize OAuth client to check authentication status
    const client = await googleMeetService.initializeOAuthClient();
    const isAuthenticated = client !== null;

    // Get token info for response
    let tokenInfo = null;
    if (isAuthenticated) {
      const token = await Token.findOne({ userId: "default" }).sort({
        createdAt: -1,
      });
      if (token) {
        tokenInfo = {
          expiresAt: new Date(token.expiry_date).toISOString(),
          scopes: token.scope,
          isExpired: token.expiry_date < Date.now(),
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
    });
  } catch (error) {
    console.error("Error checking authentication status:", error);
    res.json({ isAuthenticated: false });
  }
};

module.exports = {
  login,
  oauth2Callback,
  checkAuthStatus,
};
