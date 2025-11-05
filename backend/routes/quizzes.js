const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');

router.get('/', quizController.getAllQuizzes);
router.get('/my', auth, quizController.getMyQuizzes);
router.get('/:id', quizController.getQuiz);
router.post('/', auth, quizController.createQuiz);
router.put('/:id', auth, quizController.updateQuiz);
router.delete('/:id', auth, quizController.deleteQuiz);

module.exports = router;

