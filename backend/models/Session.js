const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pin: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'cancelled'],
    default: 'waiting'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    socketId: String,
    score: {
      type: Number,
      default: 0
    },
    answers: [{
      questionIndex: Number,
      answer: Number,
      timeTaken: Number,
      isCorrect: Boolean,
      points: Number
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date
});

module.exports = mongoose.model('Session', sessionSchema);

