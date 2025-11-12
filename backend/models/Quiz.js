const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // New standardized fields (Level, Skill, Task)
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'A1'
  },
  skill: {
    type: String,
    enum: ['Speaking', 'Reading', 'Writing', 'Listening'],
    default: 'Reading'
  },
  task: {
    type: String,
    enum: ['Vocabulary', 'Grammar', 'Spelling', 'Essay', 'Repeat', 'Read Aloud'],
    default: 'Vocabulary'
  },
  // Legacy fields (kept for backward compatibility)
  category: {
    type: String,
    enum: ['vocabulary', 'grammar', 'reading', 'listening'],
    default: 'vocabulary'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    },
    points: {
      type: Number,
      default: 100
    },
    timeLimit: {
      type: Number,
      default: 20 // seconds
    },
    imageUrl: {
      type: String,
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isVisible: {
    type: Boolean,
    default: true
  }
});

quizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);

