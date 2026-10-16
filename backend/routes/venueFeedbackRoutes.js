const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const { requirePermission, normalizeRole } = require('../middlewares/permissionMiddleware');
const venueFeedbackController = require('../controllers/venueFeedbackController');

// Guard for viewing list
const requireViewFeedback = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN') return next();
  return requirePermission('MANAGE_VENUE_FEEDBACK', 'VIEW_DEPARTMENT_FEEDBACK', 'SUBMIT_VENUE_FEEDBACK')(req, res, next);
};

// Guard for submitting feedback
const requireSubmitFeedback = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN') return next();
  return requirePermission('SUBMIT_VENUE_FEEDBACK', 'MANAGE_VENUE_FEEDBACK', 'MANAGE_DEPARTMENT_FEEDBACK')(req, res, next);
};

// Guard for managing status / resolution
const requireManageFeedback = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN') return next();
  return requirePermission('MANAGE_VENUE_FEEDBACK', 'MANAGE_DEPARTMENT_FEEDBACK')(req, res, next);
};

// Guard for escalating
const requireEscalateFeedback = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role === 'MASTER_ADMIN') return next();
  return requirePermission('ESCALATE_VENUE_FEEDBACK', 'MANAGE_DEPARTMENT_FEEDBACK')(req, res, next);
};

router.use(authenticateToken);

// 1. Feedback list and submission
router.get('/', requireViewFeedback, venueFeedbackController.getFeedbackList);
router.post('/', requireSubmitFeedback, venueFeedbackController.createFeedback);

// 2. Specific venue complaint history
router.get('/venue/:venueId/history', requireViewFeedback, venueFeedbackController.getVenueHistory);

// 3. Single feedback item, status resolution, escalation, and notification
router.get('/:id', requireViewFeedback, venueFeedbackController.getFeedbackById);
router.put('/:id', requireSubmitFeedback, venueFeedbackController.updateFeedback);
router.patch('/:id/status', requireManageFeedback, venueFeedbackController.updateStatus);
router.post('/:id/escalate', requireEscalateFeedback, venueFeedbackController.escalateVenueFeedback);
router.post('/:id/notify', requireManageFeedback, venueFeedbackController.notifySubmitterHandler);
router.delete('/:id', requireManageFeedback, venueFeedbackController.deleteFeedback);

module.exports = router;
