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
router.post('/user/toggle-spelling', auth, wordController.toggleSpellingStatus);
router.post('/user/bulk-mark', auth, wordController.bulkMarkWords);
router.get('/user/export', auth, wordController.exportWords);
router.post('/user/import', auth, wordController.uploadFile, wordController.importWords);
// Add words from AI extraction
router.post('/add-from-ai', auth, wordController.addWordsFromAI);
console.log('✓ Route registered: POST /api/words/add-from-ai');
router.get('/filter-values', auth, wordController.getFilterValues);
router.get('/sources', auth, wordController.getSources);
console.log('✓ Route registered: GET /api/words/sources');
router.get('/sources/:sourceId/words', auth, wordController.getSourceWords);
console.log('✓ Route registered: GET /api/words/sources/:sourceId/words');
router.get('/without-turkish', auth, wordController.getWordsWithoutTurkish);
console.log('✓ Route registered: GET /api/words/without-turkish');
router.post('/fill-columns', auth, wordController.fillWordColumns);
console.log('✓ Route registered: POST /api/words/fill-columns');
router.post('/:wordId/generate-image', auth, wordController.generateWordImage);
router.put('/:id', auth, wordController.updateWord);
router.delete('/:id', auth, wordController.deleteWord);
console.log('✓ Route registered: DELETE /api/words/:id');

// Public route for single word (must be after /user routes to avoid conflicts)
router.get('/:id', wordController.getWord);

module.exports = router;

