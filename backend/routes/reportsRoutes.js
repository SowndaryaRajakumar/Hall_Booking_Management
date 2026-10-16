const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const reportsController = require('../controllers/reportsController');

const { normalizeRole, requirePermission } = require('../middlewares/permissionMiddleware');

const requireAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN' || role === 'DEPARTMENT_ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden - Admin access only' });
};

router.get('/', authenticateToken, requireAdmin, requirePermission('VIEW_REPORTS'), reportsController.getReports);
router.get('/export/pdf', authenticateToken, requireAdmin, requirePermission('EXPORT_REPORTS', 'EXPORT_PDF', 'VIEW_REPORTS'), reportsController.exportPdf);
router.get('/export/excel', authenticateToken, requireAdmin, requirePermission('EXPORT_REPORTS', 'EXPORT_EXCEL', 'VIEW_REPORTS'), reportsController.exportExcel);

module.exports = router;
