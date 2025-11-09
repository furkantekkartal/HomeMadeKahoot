const express = require('express');
const router = express.Router();
const wordController = require('../controllers/wordController');
const auth = require('../middleware/auth');

// Public routes (for browsing words without login)
router.get('/', wordController.getWords);

// Protected routes (require authentication)
router.get('/user/stats', auth, wordController.getUserWordStats);
router.get('/user/words', auth, wordController.getWordsWithStatus);
router.post('/user/toggle', auth, wordController.toggleWordStatus);
router.post('/user/bulk-mark', auth, wordController.bulkMarkWords);
router.get('/user/export', auth, wordController.exportWords);
router.post('/user/import', auth, wordController.uploadFile, wordController.importWords);
router.post('/:wordId/generate-image', auth, wordController.generateWordImage);

// Public route for single word (must be after /user routes to avoid conflicts)
router.get('/:id', wordController.getWord);

module.exports = router;

