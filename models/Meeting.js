const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, "Subject is required"],
    trim: true,
  },
  link: {
    type: String,
    required: [true, "Meeting link is required"],
    trim: true,
  },
  instructor: {
    type: String,
    required: [true, "Instructor name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    required: [true, "Meeting date is required"],
  },
  start: {
    type: Date,
    required: [true, "Start time is required"],
  },
  end: {
    type: Date,
    required: [true, "End time is required"],
  },
  roomNumber: {
    type: String,
    trim: true,
    default: "Virtual Room",
  },
  color: {
    type: String,
    default: "#2196F3",
  },
  participants: {
    type: Number,
    default: 0,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: [true, "Course ID is required"],
  },
  attendees: [
    {
      type: String,
      trim: true,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Store Google Calendar event ID for future updates
  googleEventId: {
    type: String,
    trim: true,
  },
});

// Create a compound index for preventing duplicate meetings for the same course at the same time
MeetingSchema.index({ courseId: 1, start: 1 }, { unique: true });

module.exports = mongoose.model("Meeting", MeetingSchema);
