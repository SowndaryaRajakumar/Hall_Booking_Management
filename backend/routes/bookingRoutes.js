const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  getFacultyBookings,
  checkAvailability,
  getHallPeriodAvailability,
} = require('../controllers/bookingController');
const authenticateToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
router.get('/bookings', authenticateToken, requireAdmin, getAllBookings);
router.get('/my', authenticateToken, getFacultyBookings);
router.post('/availability', authenticateToken, checkAvailability);
router.get('/availability/:hallId', authenticateToken, getHallPeriodAvailability);
router.get('/:id', authenticateToken, getBookingById);
router.post('/', authenticateToken, createBooking);
router.patch('/:id/status', authenticateToken, updateBookingStatus);
router.patch('/:id/cancel', authenticateToken, cancelBooking);
module.exports = router;
