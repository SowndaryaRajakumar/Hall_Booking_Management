const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

// Get comprehensive live reports data
exports.getReports = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const [summaryResults, venueResults, facultyResults, dateResults, dateCountResults] = await Promise.all([
      // Summary counts
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM bookings) AS totalBookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') AS pendingBookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'Approved') AS approvedBookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'Rejected') AS rejectedBookings,
          (SELECT COUNT(*) FROM bookings WHERE status = 'Cancelled') AS cancelledBookings,
          (SELECT COUNT(*) FROM Halls) AS totalVenues,
          (SELECT COUNT(*) FROM Halls WHERE ActiveStatus = 1) AS activeVenues
      `),
      // Bookings by venue
      pool.query(`
        SELECT hall_name AS venueName, COUNT(*) AS count 
        FROM bookings 
        GROUP BY hall_name 
        ORDER BY count DESC 
        LIMIT 10
      `),
      // Bookings by faculty
      pool.query(`
        SELECT staff_name AS facultyName, staff_email AS email, COUNT(*) AS count 
        FROM bookings 
        GROUP BY staff_name, staff_email 
        ORDER BY count DESC 
        LIMIT 10
      `),
      // Bookings by date
      pool.query(`
        SELECT DATE_FORMAT(date, '%Y-%m-%d') AS bookingDate, COUNT(*) AS count 
        FROM bookings 
        GROUP BY DATE_FORMAT(date, '%Y-%m-%d') 
        ORDER BY bookingDate DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]),
      pool.query(`SELECT COUNT(DISTINCT DATE_FORMAT(date, '%Y-%m-%d')) AS total FROM bookings`),
    ]);

    const summary = summaryResults[0][0];
    const bookingsByVenue = venueResults[0];
    const bookingsByFaculty = facultyResults[0];
    const bookingsByDate = dateResults[0];
    const totalDates = dateCountResults[0][0]?.total || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalBookings: Number(summary.totalBookings || 0),
          pendingBookings: Number(summary.pendingBookings || 0),
          approvedBookings: Number(summary.approvedBookings || 0),
          rejectedBookings: Number(summary.rejectedBookings || 0),
          cancelledBookings: Number(summary.cancelledBookings || 0),
          totalVenues: Number(summary.totalVenues || 0),
          activeVenues: Number(summary.activeVenues || 0),
        },
        bookingsByVenue,
        bookingsByFaculty,
        bookingsByDate,
        pagination: makePagination({ page, limit, total: totalDates }),
      },
    });
  } catch (error) {
    console.error('Reports calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reports',
      error: error.message,
    });
  }
};
