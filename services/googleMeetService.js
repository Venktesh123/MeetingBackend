// services/googleMeetService.js
const { google } = require("googleapis");
const Token = require("../models/Token");
require("dotenv").config();

class GoogleMeetService {
  constructor() {
    this.oAuth2Client = null;
  }

  // Create credentials object from environment variables
  getCredentials() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
      process.env;

    // Validate credentials
    if (!GOOGLE_CLIENT_ID) {
      throw new Error("Google Client ID is missing");
    }
    if (!GOOGLE_CLIENT_SECRET) {
      throw new Error("Google Client Secret is missing");
    }

    // Parse redirect URIs (support multiple URIs)
    const redirectUris = GOOGLE_REDIRECT_URI
      ? GOOGLE_REDIRECT_URI.split(",").map((uri) => uri.trim())
      : ["http://localhost:3000/api/auth/oauth2callback"];

    return {
      web: {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uris: redirectUris,
      },
    };
  }

  // Create OAuth2 client
  createOAuthClient() {
    const credentials = this.getCredentials();
    const { client_id, client_secret, redirect_uris } = credentials.web;

    // Create OAuth2 client
    return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  }

  // Initialize OAuth Client
  async initializeOAuthClient() {
    try {
      // Create the OAuth2 client
      const client = this.createOAuthClient();

      // Get token from database
      const token = await this.getTokenFromDatabase();

      if (!token) {
        console.log("❌ No valid token found in database");
        return null;
      }

      // Check if token is expired or about to expire (within 30 minutes for better buffer)
      const isExpired = token.expiry_date < Date.now() + 30 * 60 * 1000;

      if (isExpired) {
        console.log("🔄 Token has expired, attempting to refresh");

        // Set credentials with the expired token to enable refresh
        client.setCredentials({
          refresh_token: token.refresh_token,
          access_token: token.access_token,
          expiry_date: token.expiry_date,
        });

        // Refresh token
        const newToken = await this.refreshToken(client);

        if (!newToken) {
          console.log("❌ Failed to refresh token");
          return null;
        }

        // Set new credentials
        client.setCredentials(newToken);
      } else {
        // Set credentials with valid token
        client.setCredentials({
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expiry_date: token.expiry_date,
          token_type: token.token_type,
          scope: token.scope,
        });
      }

      console.log("✅ OAuth Client Initialized");
      console.log("Token Details:");
      console.log(
        "- Access Token: " + (token.access_token ? "Present ✓" : "Missing ✗")
      );
      console.log(
        "- Refresh Token: " + (token.refresh_token ? "Present ✓" : "Missing ✗")
      );
      console.log(
        "- Expiry Date: " + new Date(token.expiry_date).toLocaleString()
      );
      console.log("- Database TTL: 1 year from creation");

      return client;
    } catch (error) {
      console.error("🚨 OAuth Initialization Error:", error);
      return null;
    }
  }

  // Refresh token
  async refreshToken(oauthClient) {
    try {
      console.log("🔄 Refreshing token");

      // Request new token
      const { credentials } = await oauthClient.refreshAccessToken();

      // Extend token expiry if needed (Google typically gives 1 hour expiry)
      // We can't extend Google's actual token expiry, but we ensure our database keeps it longer
      const extendedCredentials = {
        ...credentials,
        // Keep the original expiry_date from Google, but our database will store it for 1 year
      };

      // Save new token to database
      await this.saveTokenToDatabase(extendedCredentials);

      console.log("✅ Token refreshed successfully");
      console.log(
        "- New expiry: " + new Date(credentials.expiry_date).toLocaleString()
      );
      return extendedCredentials;
    } catch (error) {
      console.error("❌ Error refreshing token:", error);
      return null;
    }
  }

  // Get token from database
  async getTokenFromDatabase() {
    try {
      // Get token for default user (for single-user setup)
      const token = await Token.findOne({ userId: "default" }).sort({
        createdAt: -1,
      });

      if (!token) {
        console.log("❓ No token found in database");

        // If no token in database but token in .env, use that (for backward compatibility)
        const tokenFromEnv = this.getTokenFromEnv();
        if (tokenFromEnv) {
          console.log(
            "📋 Found token in environment variables, saving to database"
          );
          await this.saveTokenToDatabase(tokenFromEnv);
          // Now fetch the saved token
          return await Token.findOne({ userId: "default" }).sort({
            createdAt: -1,
          });
        }

        return null;
      }

      return token;
    } catch (error) {
      console.error("❌ Error getting token from database:", error);
      return null;
    }
  }

  // Get token from environment variable (for backward compatibility)
  getTokenFromEnv() {
    try {
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        const tokenStr = process.env.GOOGLE_OAUTH_TOKEN.trim();
        const tokenData = JSON.parse(tokenStr);
        return tokenData;
      }
      return null;
    } catch (error) {
      console.error("❌ Error parsing token from environment:", error);
      return null;
    }
  }

  // Save token to database
  async saveTokenToDatabase(tokenData) {
    try {
      // Ensure we have a refresh token (either from new token or from existing one)
      const refresh_token =
        tokenData.refresh_token || (await this.getExistingRefreshToken());

      if (!refresh_token) {
        console.error("❌ No refresh token available");
        return false;
      }

      // Create token document
      const token = new Token({
        userId: "default", // For single-user setup
        access_token: tokenData.access_token,
        refresh_token: refresh_token,
        token_type: tokenData.token_type,
        expiry_date: tokenData.expiry_date,
        scope: tokenData.scope,
        // createdAt will be set automatically and will have TTL of 1 year
      });

      // Save token to database
      await token.save();
      console.log("✅ Token saved to database");
      console.log(
        "- Token will be automatically deleted from database after 1 year"
      );
      console.log(
        "- Google token expires: " +
          new Date(tokenData.expiry_date).toLocaleString()
      );
      return true;
    } catch (error) {
      console.error("❌ Error saving token to database:", error);
      return false;
    }
  }

  // Get existing refresh token if a new one wasn't provided during refresh
  async getExistingRefreshToken() {
    try {
      const existingToken = await Token.findOne({ userId: "default" }).sort({
        createdAt: -1,
      });
      return existingToken ? existingToken.refresh_token : null;
    } catch (error) {
      console.error("❌ Error getting existing refresh token:", error);
      return null;
    }
  }

  // Generate Authorization URL
  getAuthUrl() {
    try {
      const client = this.createOAuthClient();
      return client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ],
        prompt: "consent", // Always ask for consent to get refresh token
      });
    } catch (error) {
      console.error("Auth URL Generation Error:", error);
      throw error;
    }
  }

  // Token Exchange Method
  async getTokenFromCode(code) {
    try {
      const client = this.createOAuthClient();
      const { tokens } = await client.getToken(code);

      // Save token to database (will now have 1 year TTL)
      await this.saveTokenToDatabase(tokens);

      console.log("✅ Tokens exchanged and saved to database successfully");
      console.log("- Database TTL: 1 year from now");
      console.log(
        "- Google access token expires: " +
          new Date(tokens.expiry_date).toLocaleString()
      );
      return tokens;
    } catch (error) {
      console.error("Token Exchange Error:", error);
      throw error;
    }
  }

  // Create a Google Meet event
  async createGoogleMeet(
    subject,
    description,
    startTime,
    endTime,
    attendees = []
  ) {
    try {
      // Initialize the OAuth client
      const oAuth2Client = await this.initializeOAuthClient();

      if (!oAuth2Client) {
        throw new Error(
          "Failed to initialize OAuth client. Please authenticate first."
        );
      }

      // Create Calendar API instance
      const calendar = google.calendar({
        version: "v3",
        auth: oAuth2Client,
      });

      // Format attendees for Google Calendar API
      const formattedAttendees = attendees.map((email) => ({ email }));

      // Prepare event details
      const event = {
        summary: subject,
        description: description,
        start: {
          dateTime: new Date(startTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(endTime).toISOString(),
          timeZone: "UTC",
        },
        attendees: formattedAttendees,
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      };

      // Insert event and create Google Meet
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
      });

      console.log("📅 Google Meet created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating Google Meet:", error);
      throw error;
    }
  }

  // Method to check token status and remaining time
  async getTokenStatus() {
    try {
      const token = await this.getTokenFromDatabase();
      if (!token) {
        return { exists: false };
      }

      const now = Date.now();
      const googleTokenExpiry = new Date(token.expiry_date);
      const dbTokenExpiry = new Date(
        token.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000
      ); // 1 year from creation

      return {
        exists: true,
        googleTokenExpiry: googleTokenExpiry.toISOString(),
        googleTokenExpiresIn: Math.max(0, token.expiry_date - now),
        databaseTokenExpiry: dbTokenExpiry.toISOString(),
        databaseTokenExpiresIn: Math.max(0, dbTokenExpiry.getTime() - now),
        isGoogleTokenExpired: token.expiry_date < now,
        needsRefresh: token.expiry_date < now + 30 * 60 * 1000, // Within 30 minutes
      };
    } catch (error) {
      console.error("❌ Error getting token status:", error);
      return { exists: false, error: error.message };
    }
  }
}

module.exports = new GoogleMeetService();
