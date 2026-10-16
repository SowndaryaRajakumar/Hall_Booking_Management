const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/permissionMiddleware');

const profileController = require('../controllers/profileController');

router.get('/me', authMiddleware, profileController.getProfile);
// Alias endpoint for frontend: /api/staff/profile
router.get('/profile', authMiddleware, profileController.getProfile);
router.put('/profile', authMiddleware, profileController.updateProfile);
router.patch('/profile', authMiddleware, profileController.updateProfile);
router.get("/", authMiddleware, staffController.getAllStaff);
router.post("/", authMiddleware, requirePermission('MANAGE_FACULTY'), staffController.addStaff);
router.put("/:id", authMiddleware, requirePermission('MANAGE_FACULTY'), staffController.updateStaff);
router.delete("/:id", authMiddleware, requirePermission('MANAGE_FACULTY'), staffController.deleteStaff);
module.exports = router;
