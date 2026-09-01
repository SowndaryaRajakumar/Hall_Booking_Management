// routes/departmentRoutes.js
const express = require('express');
const departmentController = require('../controllers/departmentController');
const authenticateToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const router = express.Router();

// GET all departments
router.get('/', departmentController.getAllDepartments);
router.get('/admin', authenticateToken, requireAdmin, departmentController.getAllDepartments);

// GET a specific department
router.get('/:id', departmentController.getDepartmentById);

// POST create a new department
router.post('/', authenticateToken, requireAdmin, departmentController.createDepartment);

// PUT update a department
router.put('/:id', authenticateToken, requireAdmin, departmentController.updateDepartment);

// DELETE a department
router.delete('/:id', authenticateToken, requireAdmin, departmentController.deleteDepartment);

module.exports = router;
