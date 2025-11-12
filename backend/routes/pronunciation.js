const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pronunciationController = require('../controllers/pronunciationController');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Pronunciation assessment endpoint (optional auth - works for both authenticated and guest users)
// Try to authenticate but don't fail if no token
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_jwt_key_change_this_in_production');
      req.user = decoded;
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};

router.post('/assess', optionalAuth, upload.single('audio'), pronunciationController.assessPronunciation);

// Get pronunciation stats (requires auth)
router.get('/stats', auth, pronunciationController.getPronunciationStats);

module.exports = router;

