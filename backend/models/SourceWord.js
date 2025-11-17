const mongoose = require('mongoose');

const sourceWordSchema = new mongoose.Schema({
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source',
    required: true,
    index: true
  },
  wordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word',
    required: true,
    index: true
  },
  isNew: {
    type: Boolean,
    default: false // true if word was newly added, false if it was a duplicate
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one record per source-word combination
sourceWordSchema.index({ sourceId: 1, wordId: 1 }, { unique: true });

// Indexes for efficient querying
sourceWordSchema.index({ sourceId: 1 });
sourceWordSchema.index({ wordId: 1 });

module.exports = mongoose.model('SourceWord', sourceWordSchema);


