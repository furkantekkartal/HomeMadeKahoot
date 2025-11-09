const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  wordId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  englishWord: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  wordType: {
    type: String,
    trim: true
  },
  turkishMeaning: {
    type: String,
    trim: true
  },
  category1: {
    type: String,
    trim: true,
    index: true
  },
  category2: {
    type: String,
    trim: true
  },
  category3: {
    type: String,
    trim: true
  },
  englishLevel: {
    type: String,
    trim: true,
    index: true
  },
  sampleSentenceEn: {
    type: String,
    trim: true
  },
  sampleSentenceTr: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
wordSchema.index({ englishWord: 1 });
wordSchema.index({ category1: 1, englishLevel: 1 });
wordSchema.index({ wordType: 1 });

module.exports = mongoose.model('Word', wordSchema);

