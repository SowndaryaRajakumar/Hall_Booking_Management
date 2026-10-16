const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const { requirePermission, normalizeRole } = require('../middlewares/permissionMiddleware');
const academicController = require('../controllers/academicAllocationController');

// Calendar access guard
const requireCalendarAccess = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN' || role === 'FACULTY') return next();
  return requirePermission('VIEW_ACADEMIC_CALENDAR')(req, res, next);
};

// Allocation manage guard
const requireAllocationManage = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN' || role === 'FACULTY') return next();
  return requirePermission('MANAGE_ACADEMIC_ALLOCATIONS')(req, res, next);
};

// Allocation approval guard
const requireApprovalAccess = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN') return next();
  if (role === 'DEPARTMENT_ADMIN') {
    return requirePermission('APPROVE_ACADEMIC_ALLOCATIONS', 'APPROVE_BOOKINGS')(req, res, next);
  }
  return res.status(403).json({ success: false, message: 'Only administrators can approve or reject allocations.' });
};

router.use(authenticateToken);

// 1. Calendar occurrences feed
router.get('/calendar', requireCalendarAccess, academicController.getCalendar);

// 2. Academic allocations CRUD & Venue History
router.get('/venue-history', requireCalendarAccess, academicController.getVenueUsageHistory);
router.get('/', requireCalendarAccess, academicController.getAllocations);
router.post('/', requireAllocationManage, academicController.createAllocation);
router.get('/:id', requireCalendarAccess, academicController.getAllocationById);
router.put('/:id', requireAllocationManage, academicController.updateAllocation);
router.patch('/:id/status', requireApprovalAccess, academicController.updateAllocationStatus);
router.patch('/:id', requireAllocationManage, academicController.updateAllocation);
router.delete('/:id', requireAllocationManage, academicController.deleteAllocation);

// 3. Occurrence remark & status overrides
router.post('/:id/occurrences/:date/remark', requireCalendarAccess, academicController.updateOccurrence);
router.patch('/:id/occurrences/:date/status', requireCalendarAccess, academicController.updateOccurrence);

module.exports = router;
