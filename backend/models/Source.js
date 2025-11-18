const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sourceName: {
    type: String,
    required: true,
    trim: true
  },
  sourceType: {
    type: String,
    enum: ['pdf', 'srt', 'txt', 'youtube', 'other'],
    default: 'other'
  },
  fileSize: {
    type: Number, // Size in bytes
    default: 0
  },
  totalWords: {
    type: Number,
    default: 0
  },
  newWords: {
    type: Number,
    default: 0
  },
  duplicateWords: {
    type: Number,
    default: 0
  },
  // Deck information fields
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    required: false
  },
  skill: {
    type: String,
    enum: ['Reading', 'Listening', 'Speaking', 'Writing'],
    required: false
  },
  task: {
    type: String,
    default: 'Vocabulary'
  },
  cardQty: {
    type: Number,
    default: 0
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
sourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index to ensure unique source per user
sourceSchema.index({ userId: 1, sourceName: 1 }, { unique: true });
sourceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Source', sourceSchema);



