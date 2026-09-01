const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const reportsController = require('../controllers/reportsController');

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden - Admin access only' });
};

router.get('/', authenticateToken, requireAdmin, reportsController.getReports);

module.exports = router;
