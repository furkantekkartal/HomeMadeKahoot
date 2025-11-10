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

module.exports = router;

