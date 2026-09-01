const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Admin dashboard routes require authentication AND admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden - Admin access only' });
};

const requireFaculty = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "faculty" || req.user.role === "staff")
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden - Faculty access only",
  });
};

router.get('/', authenticateToken, requireAdmin, dashboardController.getAdminDashboard);
router.get(
  "/faculty",
  authenticateToken,
  requireFaculty,
  dashboardController.getFacultyDashboard
);

module.exports = router;
