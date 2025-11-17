const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const auth = require('../middleware/auth');

router.post('/', auth, sessionController.createSession);
router.get('/pin/:pin', sessionController.getSessionByPIN);
router.get('/my', auth, sessionController.getMySessions);
router.post('/results', auth, sessionController.saveResult);
router.get('/results/my', auth, sessionController.getMyResults);
router.get('/performance', auth, sessionController.getMyPerformance);
router.get('/game-stats', auth, sessionController.getGameStats);
router.delete('/game-stats/reset', auth, sessionController.resetGamePerformance);
router.get('/analytics', auth, sessionController.getTeacherAnalytics);
router.get('/:id', sessionController.getSession);

module.exports = router;

