/**
 * Registry of all Mongoose models in the application
 * This helps ensure database integrity and safe schema changes
 */

const models = {
  'users': {
    model: 'User',
    file: '../models/User',
    description: 'User accounts and authentication',
    required: true, // Cannot be safely deleted without data migration
    indexes: ['username', 'email']
  },
  'quizzes': {
    model: 'Quiz',
    file: '../models/Quiz',
    description: 'Quiz definitions and questions',
    required: true,
    indexes: ['creatorId', 'category']
  },
  'sessions': {
    model: 'Session',
    file: '../models/Session',
    description: 'Live quiz sessions with PIN codes',
    required: false, // Can be safely deleted (temporary data)
    indexes: ['pin', 'hostId', 'status']
  },
  'results': {
    model: 'Result',
    file: '../models/Result',
    description: 'Quiz results for logged-in users',
    required: false, // Historical data, can be archived
    indexes: ['userId', 'quizId', 'sessionId']
  },
  'studentresults': {
    model: 'StudentResult',
    file: '../models/StudentResult',
    description: 'Student quiz results with analytics',
    required: false, // Historical data, can be archived
    indexes: ['username', 'userId', 'hostId', 'quizId']
  }
};

/**
 * Get all expected collection names (lowercase, pluralized)
 */
const getExpectedCollections = () => {
  return Object.keys(models);
};

/**
 * Get collection info by name
 */
const getCollectionInfo = (collectionName) => {
  return models[collectionName.toLowerCase()];
};

/**
 * Check if a collection is required
 */
const isCollectionRequired = (collectionName) => {
  const info = getCollectionInfo(collectionName);
  return info ? info.required : false;
};

/**
 * Get all models as an array
 */
const getAllModels = () => {
  return Object.values(models);
};

module.exports = {
  models,
  getExpectedCollections,
  getCollectionInfo,
  isCollectionRequired,
  getAllModels
};

