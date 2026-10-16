const express = require('express');
const router = express.Router();
const deptAdminController = require('../controllers/departmentAdminController');
const authenticateToken = require('../middlewares/authMiddleware');
const { requireRole, requirePermission } = require('../middlewares/permissionMiddleware');
const { requireDepartmentScope } = require('../middlewares/deptScopeMiddleware');

// All routes require authenticated session, DEPARTMENT_ADMIN role, and department scoping
router.use(authenticateToken);
router.use(requireRole('DEPARTMENT_ADMIN'));
router.use(requireDepartmentScope);

// Dashboard
router.get('/dashboard', requirePermission('VIEW_DASHBOARD'), deptAdminController.getDepartmentDashboard);

// Faculty Management
router.get('/faculty', requirePermission('MANAGE_FACULTY'), deptAdminController.getDepartmentFaculty);
router.post('/faculty', requirePermission('MANAGE_FACULTY'), deptAdminController.addDepartmentFaculty);
router.put('/faculty/:id', requirePermission('MANAGE_FACULTY'), deptAdminController.updateDepartmentFaculty);
router.patch('/faculty/:id/status', requirePermission('MANAGE_FACULTY'), deptAdminController.toggleFacultyStatus);
router.delete('/faculty/:id', requirePermission('MANAGE_FACULTY'), deptAdminController.deleteDepartmentFaculty);

// Department Venues Management
router.get('/venues', requirePermission('MANAGE_VENUES'), deptAdminController.getDepartmentVenues);
router.post('/venues', requirePermission('MANAGE_VENUES'), deptAdminController.createDepartmentVenue);
router.put('/venues/:id', requirePermission('MANAGE_VENUES'), deptAdminController.updateDepartmentVenue);
router.delete('/venues/:id', requirePermission('MANAGE_VENUES'), deptAdminController.deleteDepartmentVenue);

// Bookings
router.get('/bookings', requirePermission('VIEW_BOOKINGS'), deptAdminController.getDepartmentBookings);
router.patch('/bookings/:id/approve', requirePermission('APPROVE_BOOKINGS'), deptAdminController.approveDepartmentBooking);
router.patch('/bookings/:id/reject', requirePermission('REJECT_BOOKINGS'), deptAdminController.rejectDepartmentBooking);
router.patch('/bookings/:id/cancel', requirePermission('CANCEL_BOOKINGS'), deptAdminController.cancelDepartmentBooking);

// Reports
router.get('/reports', requirePermission('VIEW_REPORTS'), deptAdminController.getDepartmentReports);

module.exports = router;
