const mongoose = require('mongoose');

const studentResultSchema = new mongoose.Schema({
  // Student identifier (can be username if no account)
  username: {
    type: String,
    required: true,
    index: true
  },
  // Optional: if student has an account
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // Session information
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  // Quiz information
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true
  },
  quizName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['vocabulary', 'grammar', 'reading', 'listening'],
    required: true,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    index: true
  },
  // Quiz host/teacher
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Results
  questionCount: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  successPercentage: {
    type: Number,
    default: 0
  },
  // Individual answers
  answers: [{
    questionIndex: Number,
    answer: Number,
    correctAnswer: Number,
    isCorrect: Boolean,
    points: Number,
    timeTaken: Number
  }],
  // Timestamps
  completedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
studentResultSchema.index({ username: 1, completedAt: -1 });
studentResultSchema.index({ hostId: 1, completedAt: -1 });
studentResultSchema.index({ quizId: 1, completedAt: -1 });
studentResultSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('StudentResult', studentResultSchema);

