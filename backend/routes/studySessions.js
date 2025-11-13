const express = require('express');
const router = express.Router();
const studySessionController = require('../controllers/studySessionController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Start new study session
router.post('/start', studySessionController.startSession);

// Update session duration
router.put('/:id/update', studySessionController.updateSession);

// End session
router.post('/:id/end', studySessionController.endSession);

// Get session history
router.get('/history', studySessionController.getHistory);

// Get study time statistics
router.get('/statistics', studySessionController.getStatistics);

module.exports = router;

