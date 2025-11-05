const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const auth = require('../middleware/auth');

router.post('/', auth, sessionController.createSession);
router.get('/pin/:pin', sessionController.getSessionByPIN);
router.get('/my', auth, sessionController.getMySessions);
router.post('/results', auth, sessionController.saveResult);
router.get('/results/my', auth, sessionController.getMyResults);
router.get('/analytics', auth, sessionController.getTeacherAnalytics);
router.get('/:id', sessionController.getSession);

module.exports = router;

