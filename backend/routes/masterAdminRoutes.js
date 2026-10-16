const express = require('express');
const router = express.Router();
const masterAdminController = require('../controllers/masterAdminController');
const authenticateToken = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/permissionMiddleware');

// All master admin routes require authenticated session and MASTER_ADMIN role
router.use(authenticateToken);
router.use(requireRole('MASTER_ADMIN'));

// Dashboard
router.get('/dashboard', masterAdminController.getMasterAdminDashboard);

// Department Admins
router.get('/admins', masterAdminController.getDepartmentAdmins);
router.post('/admins', masterAdminController.createDepartmentAdmin);
router.put('/admins/:id', masterAdminController.updateDepartmentAdmin);
router.patch('/admins/:id/status', masterAdminController.toggleAdminStatus);
router.post('/admins/:id/reset-password', masterAdminController.resetAdminPassword);

// Department Admins Route Aliases (as requested in spec)
router.get('/department-admins', masterAdminController.getDepartmentAdmins);
router.post('/department-admins', masterAdminController.createDepartmentAdmin);
router.put('/department-admins/:id', masterAdminController.updateDepartmentAdmin);
router.patch('/department-admins/:id/status', masterAdminController.toggleAdminStatus);
router.post('/department-admins/:id/reset-password', masterAdminController.resetAdminPassword);
router.get('/department-admins/:id/permissions', masterAdminController.getAdminPermissions);
router.put('/department-admins/:id/permissions', masterAdminController.updateAdminPermissions);

// Permissions & Access Control
router.get('/permissions', masterAdminController.getAllPermissions);
router.get('/admins/:id/permissions', masterAdminController.getAdminPermissions);
router.put('/admins/:id/permissions', masterAdminController.updateAdminPermissions);

// Venues (Common & Department)
const upload = require('../middlewares/uploadVenueImage');
router.get('/venues', masterAdminController.getVenues);
router.post('/venues', masterAdminController.createVenue);
router.post('/common-venues', upload.single('venueImage'), masterAdminController.createCommonVenue);
router.put('/venues/:id', masterAdminController.updateVenue);
router.get('/venues/:id/access', masterAdminController.getVenueAccessRules);
router.put('/venues/:id/access', masterAdminController.updateVenueAccessRules);

// Audit Logs
router.get('/audit-logs', masterAdminController.getAuditLogs);

// Notification Settings
router.get('/notification-settings', masterAdminController.getNotificationSettings);
router.put('/notification-settings', masterAdminController.updateNotificationSettings);

module.exports = router;
