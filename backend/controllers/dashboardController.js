const pool = require('../config/db');
const { getPeriods } = require('../config/periods');

const BLOCKING_STATUSES = ['Pending', 'Approved'];

// Get admin dashboard statistics and recent bookings
exports.getAdminDashboard = async (req, res) => {
  try {
    const periods = getPeriods();

    /*
     * =========================================================
     * DASHBOARD QUERIES
     * =========================================================
     */
    const queries = [

      // 1. Total Venues
      `
      SELECT COUNT(*) AS totalVenues
      FROM Halls
      `,

      // 2. Active Venues
      `
      SELECT COUNT(*) AS activeVenues
      FROM Halls
      WHERE ActiveStatus = 1
      `,

      // 3. Total Faculty
      `
      SELECT COUNT(*) AS totalFaculty
      FROM staff
      WHERE role = 'staff'
      `,

      // 4. Total Admins
      `
      SELECT COUNT(*) AS totalAdmins
      FROM staff
      WHERE role = 'admin'
      `,

      // 5. Pending Bookings
      `
      SELECT COUNT(*) AS pendingBookings
      FROM bookings
      WHERE status = 'Pending'
      `,

      // 6. Approved Bookings
      `
      SELECT COUNT(*) AS approvedBookings
      FROM bookings
      WHERE status = 'Approved'
      `,

      // 7. Rejected Bookings
      `
      SELECT COUNT(*) AS rejectedBookings
      FROM bookings
      WHERE status = 'Rejected'
      `,

      // 8. Cancelled Bookings
      `
      SELECT COUNT(*) AS cancelledBookings
      FROM bookings
      WHERE status = 'Cancelled'
      `,

      /*
       * 9. Today's Bookings
       *
       * IMPORTANT:
       * This means BOOKING REQUESTS RECEIVED TODAY.
       *
       * Therefore we use created_at, not date.
       *
       * All requests created today are counted:
       * Pending + Approved + Rejected + Cancelled
       */
      `
      SELECT COUNT(*) AS todaysBookings
      FROM bookings
      WHERE DATE(created_at) = CURDATE()
      `,

      /*
       * 10. Get all active halls
       *
       * These are used to calculate today's available venues.
       */
      `
      SELECT HallID, HallName
      FROM Halls
      WHERE ActiveStatus = 1
      `,

      /*
       * 11. Get today's blocking bookings
       *
       * Only Pending and Approved bookings block a venue.
       *
       * IMPORTANT:
       * Here we use "date" because we are checking
       * whether the VENUE is available for TODAY.
       */
      `
      SELECT
        hall_id,
        time_from,
        time_to,
        status
      FROM bookings
      WHERE DATE(date) = CURDATE()
        AND status IN ('Pending', 'Approved')
      `,

      /*
       * 12. Recent Bookings
       *
       * Sorted by when the request was created.
       */
      `
      SELECT
        id,
        staff_name AS facultyName,
        hall_name AS venueName,
        date,
        time_from AS timeFrom,
        time_to AS timeTo,
        status
      FROM bookings
      ORDER BY created_at DESC, id DESC
      LIMIT 5
      `,
    ];

    /*
     * =========================================================
     * EXECUTE ALL QUERIES
     * =========================================================
     */
    const results = await Promise.all(
      queries.map((query) => pool.query(query))
    );

    /*
     * =========================================================
     * BASIC STATISTICS
     * =========================================================
     */

    const totalVenues = results[0][0][0].totalVenues;

    const activeVenues = results[1][0][0].activeVenues;

    const totalFaculty = results[2][0][0].totalFaculty;

    const totalAdmins = results[3][0][0].totalAdmins;

    const pendingBookings = results[4][0][0].pendingBookings;

    const approvedBookings = results[5][0][0].approvedBookings;

    const rejectedBookings = results[6][0][0].rejectedBookings;

    const cancelledBookings = results[7][0][0].cancelledBookings;

    /*
     * This is now the number of BOOKING REQUESTS
     * CREATED TODAY.
     */
    const todaysBookings = results[8][0][0].todaysBookings;

    /*
     * =========================================================
     * ACTIVE HALLS
     * =========================================================
     */
    const activeHalls = results[9][0];

    /*
     * =========================================================
     * TODAY'S BLOCKING BOOKINGS
     * =========================================================
     *
     * These are bookings scheduled for TODAY
     * and having Pending/Approved status.
     */
    const todaysBlockingBookings = results[10][0];

    /*
     * =========================================================
     * CALCULATE AVAILABLE VENUES TODAY
     * =========================================================
     *
     * A venue is considered AVAILABLE if at least ONE
     * of the 8 official periods is free.
     *
     * Example:
     *
     * Lab 1
     * Period 1 -> Booked
     * Period 2 -> Booked
     * Period 3 -> Available
     *
     * Therefore Lab 1 is still counted as AVAILABLE.
     */
    let availableVenuesToday = 0;

    for (const hall of activeHalls) {

      /*
       * Get today's bookings for this particular hall.
       */
      const hallBookings = todaysBlockingBookings.filter(
        (booking) =>
          Number(booking.hall_id) === Number(hall.HallID)
      );

      let hasAvailablePeriod = false;

      /*
       * Check all 8 official periods.
       */
      for (const period of periods) {

        const periodAvailable = !hallBookings.some((booking) => {

          const bookingStart = String(
            booking.time_from
          ).slice(0, 5);

          const bookingEnd = String(
            booking.time_to
          ).slice(0, 5);

          /*
           * Time overlap condition:
           *
           * existing_start < requested_end
           * AND
           * existing_end > requested_start
           */
          return (
            bookingStart < period.end &&
            bookingEnd > period.start
          );
        });

        /*
         * At least one period is free.
         */
        if (periodAvailable) {
          hasAvailablePeriod = true;
          break;
        }
      }

      /*
       * Count this venue as available.
       */
      if (hasAvailablePeriod) {
        availableVenuesToday++;
      }
    }

    /*
     * =========================================================
     * RECENT BOOKINGS
     * =========================================================
     */
    const recentBookings = results[11][0].map((booking) => ({
      id: booking.id,
      facultyName: booking.facultyName,
      venueName: booking.venueName,
      date: booking.date,
      timeFrom: booking.timeFrom,
      timeTo: booking.timeTo,
      status: booking.status,
    }));

    /*
     * =========================================================
     * SEND RESPONSE
     * =========================================================
     */
    return res.json({
      success: true,

      data: {
        // Venue statistics
        totalVenues,
        activeVenues,

        // User statistics
        totalFaculty,
        totalAdmins,

        // Booking statistics
        pendingBookings,
        approvedBookings,
        rejectedBookings,
        cancelledBookings,

        /*
         * Number of booking requests RECEIVED TODAY
         */
        todaysBookings,

        // Venue availability
        availableVenues: availableVenuesToday,
        availableVenuesToday,

        // Recent bookings
        recentBookings,
      },
    });

  } catch (err) {

    console.error(
      'Dashboard retrieval error:',
      err
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: err.message,
    });
  }
};
// ============================================================
// FACULTY DASHBOARD
// ============================================================
exports.getFacultyDashboard = async (req, res) => {
  try {
    const facultyEmail = req.user?.email;

    if (!facultyEmail) {
      return res.status(401).json({
        success: false,
        message: "Faculty email not found in authentication token",
      });
    }

    /*
     * ========================================================
     * FACULTY BOOKING STATISTICS
     * ========================================================
     *
     * These counts belong ONLY to the logged-in faculty member.
     */

    const queries = [

      // Total bookings submitted by this faculty
      `
      SELECT COUNT(*) AS totalBookings
      FROM bookings
      WHERE staff_email = ?
      `,

      // Pending bookings
      `
      SELECT COUNT(*) AS pendingBookings
      FROM bookings
      WHERE staff_email = ?
        AND status = 'Pending'
      `,

      // Approved bookings
      `
      SELECT COUNT(*) AS approvedBookings
      FROM bookings
      WHERE staff_email = ?
        AND status = 'Approved'
      `,

      // Cancelled bookings
      `
      SELECT COUNT(*) AS cancelledBookings
      FROM bookings
      WHERE staff_email = ?
        AND status = 'Cancelled'
      `,

      // Recent 5 bookings submitted by this faculty
      `
      SELECT
        id,
        hall_name AS venue,
        date,
        time_from AS timeFrom,
        time_to AS timeTo,
        status,
        reason
      FROM bookings
      WHERE staff_email = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 5
      `,
    ];

    /*
     * Execute all queries in parallel.
     */
    const results = await Promise.all(
      queries.map((query) =>
        pool.query(query, [facultyEmail])
      )
    );

    /*
     * Extract statistics.
     */
    const totalBookings =
      results[0][0][0].totalBookings;

    const pendingBookings =
      results[1][0][0].pendingBookings;

    const approvedBookings =
      results[2][0][0].approvedBookings;

    const cancelledBookings =
      results[3][0][0].cancelledBookings;

    /*
     * Recent bookings.
     */
    const recentBookings = results[4][0].map((booking) => ({
      id: booking.id,
      venue: booking.venue,
      date: booking.date,
      timeFrom: booking.timeFrom,
      timeTo: booking.timeTo,
      status: booking.status,
      reason: booking.reason,
    }));

    /*
     * Send response.
     */
    return res.json({
      success: true,

      data: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        cancelledBookings,
        recentBookings,
      },
    });

  } catch (error) {
    console.error(
      "Faculty dashboard retrieval error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve faculty dashboard data",
      error: error.message,
    });
  }
};