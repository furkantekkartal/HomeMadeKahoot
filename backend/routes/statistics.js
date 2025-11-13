const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get overview statistics
router.get('/overview', statisticsController.getOverview);

// Get badges
router.get('/badges', statisticsController.getBadges);

module.exports = router;

