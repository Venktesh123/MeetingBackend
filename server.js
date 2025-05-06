const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const tokenRoutes = require("./routes/tokenRoutes");

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/tokens", tokenRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Meeting Scheduler API is running");
});

// PORT
const PORT = process.env.PORT || 3000;

// Enhanced MongoDB connection with retries
const connectDBWithRetry = async (retries = 5, interval = 5000) => {
  try {
    await connectDB();
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);

    if (retries > 0) {
      console.log(`Retrying connection in ${interval / 1000} seconds...`);
      setTimeout(() => connectDBWithRetry(retries - 1, interval), interval);
    } else {
      console.error("Failed to connect to MongoDB after multiple attempts");
      process.exit(1);
    }
  }
};

// Connect to MongoDB with retry mechanism
connectDBWithRetry();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("- GET  /api/auth/login         : Start OAuth2 flow");
  console.log(
    "- GET  /api/auth/oauth2callback : OAuth2 callback URL (redirect_uri)"
  );
  console.log("- GET  /api/auth/status        : Check authentication status");
  console.log("- GET  /api/meetings           : Get all meetings");
  console.log("- GET  /api/meetings/:id       : Get meeting by ID");
  console.log("- POST /api/meetings           : Create a new meeting");
  console.log("- PUT  /api/meetings/:id       : Update a meeting");
  console.log("- DELETE /api/meetings/:id     : Delete a meeting");
  console.log("- GET  /api/tokens             : List all tokens (admin)");
  console.log("- DELETE /api/tokens/:id       : Delete a specific token");
  console.log("- DELETE /api/tokens           : Delete all tokens");
});

// Global error handler for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
