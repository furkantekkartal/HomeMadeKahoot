const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    enum: ['Writing', 'Flashcards', 'Words', 'Quiz', 'Spelling'],
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  durationSeconds: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  date: {
    type: String, // ISO date string (YYYY-MM-DD) for easy querying
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
studySessionSchema.index({ userId: 1, date: -1 });
studySessionSchema.index({ userId: 1, module: 1, date: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);

