// routes/hallRoutes.js
const express = require('express');
const router = express.Router();
const hallController = require('../controllers/hallController');
const upload = require("../middlewares/uploadVenueImage");
const authenticateToken = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuth");

const { requirePermission } = require("../middlewares/permissionMiddleware");

// Smart venue recommendation (requires authentication, faculty & admin)
router.get('/recommend', authenticateToken, hallController.getRecommendedVenues);

// Get all halls (optional auth for role and department scoping)
router.get('/', optionalAuth, hallController.getAllHalls);

// Get active halls
router.get('/active', optionalAuth, hallController.getActiveHalls);

// Get halls by department
router.get('/department/:deptId', hallController.getHallsByDepartment);

// Delete a venue permanently
router.delete('/:id', authenticateToken, requirePermission('MANAGE_VENUES', 'MANAGE_DEPARTMENT_VENUES'), hallController.deleteHall);

// Get hall by ID
router.get('/:id', hallController.getHallById);

// Check hall availability
router.post('/availability', hallController.checkHallsAvailability);

router.get('/ava', hallController.getAvailableHalls);

// Add a new hall
router.post(
  "/",
  authenticateToken,
  requirePermission('MANAGE_VENUES', 'MANAGE_DEPARTMENT_VENUES'),
  upload.single("venueImage"),
  hallController.createHall
);

// Update a hall
router.put(
  "/:id",
  authenticateToken,
  requirePermission('MANAGE_VENUES', 'MANAGE_DEPARTMENT_VENUES'),
  upload.single("venueImage"),
  hallController.updateHall
);

// Toggle hall status
router.patch('/status/:id', authenticateToken, requirePermission('MANAGE_VENUES', 'MANAGE_DEPARTMENT_VENUES'), hallController.toggleHallStatus);

module.exports = router;