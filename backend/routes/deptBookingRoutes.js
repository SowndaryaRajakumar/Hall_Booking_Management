// routes/deptBookingRoutes.js
const express = require('express');
const router = express.Router();
const deptBookingController = require('../controllers/deptBookingController');
const authMiddleware = require('../middlewares/authMiddleware'); // Assuming you have auth middleware

// Create a new booking
router.post('/', authMiddleware, deptBookingController.createBooking);

// Get all bookings for a department
router.get('/department/:deptId', authMiddleware, deptBookingController.getDepartmentBookings);

// Get a single booking
router.get('/:bookingId', authMiddleware, deptBookingController.getBooking);

// Update booking status
router.patch('/:bookingId/status', authMiddleware, deptBookingController.updateBookingStatus);

// Cancel a booking
router.patch('/:bookingId/cancel', authMiddleware, deptBookingController.cancelBooking);

// Get upcoming bookings for a hall
router.get('/hall/:hallId/upcoming', deptBookingController.getHallUpcomingBookings);

module.exports = router;