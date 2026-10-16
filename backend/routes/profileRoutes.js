const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middlewares/authMiddleware');

// All profile endpoints authenticate the caller via JWT
router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, profileController.updateProfile);
router.patch('/', authenticateToken, profileController.updateProfile);
router.put('/password', authenticateToken, profileController.changePassword);
router.patch('/password', authenticateToken, profileController.changePassword);

module.exports = router;
