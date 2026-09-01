// In your routes file (e.g., staffRoutes.js or index.js)
const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middlewares/authMiddleware');

const requireFaculty = (req, res, next) => {
  if (['staff', 'faculty'].includes(String(req.user?.role).toLowerCase())) return next();
  return res.status(403).json({ success: false, message: 'Faculty access only' });
};

router.get('/me', authMiddleware, staffController.getStaffDetails);
// Alias endpoint for frontend: GET /api/staff/profile
router.get('/profile', authMiddleware, requireFaculty, staffController.getStaffDetails);
router.get('/stats', authMiddleware, staffController.getStaffStats);
router.get("/", authMiddleware, staffController.getAllStaff);
router.post("/", authMiddleware, staffController.addStaff);
router.put("/:id", authMiddleware, staffController.updateStaff);
router.delete("/:id", authMiddleware, staffController.deleteStaff);
module.exports = router;
