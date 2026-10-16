// Import required modules
const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import authentication middleware
const authenticateToken = require('../middlewares/authMiddleware');

// Define authentication routes
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/permissions', authenticateToken, authController.getUserPermissionsHandler);
router.post('/reset-password', authenticateToken, authController.resetPassword);
router.post('/change-password/send-otp', authenticateToken, authController.sendChangePasswordOtp);
router.post('/change-password/verify-otp', authenticateToken, authController.verifyChangePasswordOtp);
router.post('/change-password', authenticateToken, authController.changePassword);
module.exports = router;
