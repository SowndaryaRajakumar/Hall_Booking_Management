const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const { normalizeRole } = require('../middlewares/permissionMiddleware');

// Admin dashboard routes require authentication AND admin role
const requireAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN' || role === 'DEPARTMENT_ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden - Admin access only' });
};

const requireFaculty = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'FACULTY' || role === 'MASTER_ADMIN' || role === 'DEPARTMENT_ADMIN') {
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
