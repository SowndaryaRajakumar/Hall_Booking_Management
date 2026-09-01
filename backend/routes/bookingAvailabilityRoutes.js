const express = require('express');
const router = express.Router();
const bookingAvailabilityController = require('../controllers/bookingAvailabilityController');

// Get available halls for a specific date and time slot
router.get('/available', bookingAvailabilityController.getAvailableHalls);

// Get all halls for a specific department
router.get('/department/:deptId', bookingAvailabilityController.getAllHalls);

module.exports = router;