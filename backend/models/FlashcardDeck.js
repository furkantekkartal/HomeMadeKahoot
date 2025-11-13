const mongoose = require('mongoose');

const flashcardDeckSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: null
  },
  skill: {
    type: String,
    enum: ['Speaking', 'Reading', 'Writing', 'Listening'],
    default: null
  },
  task: {
    type: String,
    enum: ['Vocabulary', 'Grammar', 'Spelling', 'Essay', 'Repeat', 'Read Aloud'],
    default: null
  },
  wordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
  }],
  totalCards: {
    type: Number,
    default: 0
  },
  masteredCards: {
    type: Number,
    default: 0
  },
  lastStudied: {
    type: Date,
    default: null
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
flashcardDeckSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
flashcardDeckSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('FlashcardDeck', flashcardDeckSchema);

