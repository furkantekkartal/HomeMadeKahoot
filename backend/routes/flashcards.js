const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const auth = require('../middleware/auth');

// All routes require authentication
router.get('/decks', auth, flashcardController.getMyDecks);
router.get('/decks/:id', auth, flashcardController.getDeck);
router.post('/decks', auth, flashcardController.createDeck);
router.put('/decks/:id', auth, flashcardController.updateDeck);
router.delete('/decks/:id', auth, flashcardController.deleteDeck);
router.patch('/decks/:id/last-studied', auth, flashcardController.updateLastStudied);
router.post('/generate-title', auth, flashcardController.generateDeckTitle);
router.post('/generate-description', auth, flashcardController.generateDeckDescription);
router.post('/enhance-text', auth, flashcardController.enhanceDeckText);
// Process markdown with AI route
router.post('/process-markdown', auth, flashcardController.processMarkdownWithAI);
console.log('✓ Route registered: POST /api/flashcards/process-markdown');
// Convert PDF to Markdown route
router.post('/convert-pdf-to-md', auth, flashcardController.uploadFile, flashcardController.convertPDFToMD);
console.log('✓ Route registered: POST /api/flashcards/convert-pdf-to-md');
// Convert Webpage to Markdown route
router.post('/convert-webpage-to-md', auth, flashcardController.convertWebpageToMD);
console.log('✓ Route registered: POST /api/flashcards/convert-webpage-to-md');
router.post('/generate-from-file', auth, flashcardController.uploadFile, flashcardController.generateDeckFromFile);
router.post('/generate-from-youtube', auth, flashcardController.generateDeckFromYouTube);
router.patch('/decks/:id/visibility', auth, flashcardController.toggleDeckVisibility);

// Debug routes for step-by-step YouTube processing
// Note: These routes must come after other routes to avoid conflicts
router.post('/debug/youtube/step1-validate', auth, flashcardController.debugStep1_ValidateUrl);
router.post('/debug/youtube/step2-title', auth, flashcardController.debugStep2_GetVideoTitle);
router.post('/debug/youtube/step3-transcript', auth, flashcardController.debugStep3_ExtractTranscript);

module.exports = router;

