const mongoose = require('mongoose');

const pronunciationResultSchema = new mongoose.Schema({
  // User identifier (optional for guest users)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // Student name (for guest users or display)
  studentName: {
    type: String,
    required: true,
    index: true
  },
  // Type: 'word' or 'sentence'
  type: {
    type: String,
    enum: ['word', 'sentence'],
    required: true,
    index: true
  },
  // Reference text (what should be read)
  referenceText: {
    type: String,
    required: true
  },
  // Recognized text (what was actually said)
  recognizedText: {
    type: String,
    default: ''
  },
  // Word count (for sentences) or 1 (for words)
  wordCount: {
    type: Number,
    default: 1
  },
  // Sentence count (1 for sentences, 0 for words)
  sentenceCount: {
    type: Number,
    default: 0
  },
  // Scores (0-90 scale for PTE)
  overallScore: {
    type: Number,
    default: 0
  },
  pronunciationScore: {
    type: Number,
    default: 0
  },
  oralFluencyScore: {
    type: Number,
    default: 0
  },
  contentScore: {
    type: Number,
    default: 0
  },
  // General score (PTE score - average of content, pronunciation, fluency)
  generalScore: {
    type: Number,
    default: 0
  },
  // Original Azure scores (0-100 scale) for reference
  accuracyScore: {
    type: Number,
    default: 0
  },
  completenessScore: {
    type: Number,
    default: 0
  },
  prosodyScore: {
    type: Number,
    default: 0
  },
  // Word-by-word analysis
  wordAnalysis: [{
    word: String,
    status: {
      type: String,
      enum: ['matched', 'missing', 'wrong'],
      default: 'matched'
    },
    accuracyScore: Number,
    errorType: String
  }],
  // Date for filtering
  date: {
    type: String, // ISO date string (YYYY-MM-DD) for easy querying
    required: true,
    index: true
  },
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
pronunciationResultSchema.index({ userId: 1, date: -1 });
pronunciationResultSchema.index({ studentName: 1, date: -1 });
pronunciationResultSchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('PronunciationResult', pronunciationResultSchema);

