const mongoose = require('mongoose');

const userWordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  wordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word',
    required: true,
    index: true
  },
  isKnown: {
    type: Boolean,
    default: false,
    index: true
  },
  isSpelled: {
    type: Boolean,
    default: false,
    index: true
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

// Compound index to ensure one record per user-word combination
userWordSchema.index({ userId: 1, wordId: 1 }, { unique: true });

// Update timestamp on save
userWordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserWord', userWordSchema);

