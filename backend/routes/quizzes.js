const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');

router.get('/', quizController.getAllQuizzes);
router.get('/my', auth, quizController.getMyQuizzes);
router.post('/generate-image', auth, quizController.generateQuestionImage);
router.post('/generate-title', auth, quizController.generateQuizTitle);
router.post('/generate-description', auth, quizController.generateQuizDescription);
router.post('/generate-questions', auth, quizController.generateQuizQuestions);
router.post('/generate-from-file', auth, quizController.uploadFile, quizController.generateQuizFromFile);
router.post('/generate-from-youtube', auth, quizController.generateQuizFromYouTube);
router.post('/generate-from-content', auth, quizController.generateQuizFromContent);
router.get('/:id', quizController.getQuiz);
router.post('/', auth, quizController.createQuiz);
router.put('/:id', auth, quizController.updateQuiz);
router.delete('/:id', auth, quizController.deleteQuiz);
router.patch('/:id/visibility', auth, quizController.toggleQuizVisibility);

module.exports = router;

