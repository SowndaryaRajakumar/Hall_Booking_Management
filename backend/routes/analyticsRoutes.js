const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
  getVenueUtilization,
  getHeatmap,
} = require('../controllers/analyticsController');

// Venue analytics is an admin feature
router.get('/venue-utilization', authenticateToken, requireAdmin, getVenueUtilization);

// Heatmap is accessible by both Admin and Faculty to explore venue schedules
router.get('/availability-heatmap', authenticateToken, getHeatmap);

module.exports = router;
