const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const { processMessage } = require('../controllers/chatbotController');

// Secure route with existing JWT authentication middleware
router.post('/message', authenticateToken, processMessage);

module.exports = router;
