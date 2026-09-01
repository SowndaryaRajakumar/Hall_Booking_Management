const pool = require('../config/db');
const { getPeriods } = require('../config/periods');
const { getPagination, makePagination } = require('../utils/pagination');

// Statuses that BLOCK a period from being booked.
// Pending temporarily blocks to prevent double-booking requests at the same time.
// Approved definitively blocks.
// Rejected and Cancelled are non-blocking.
const BLOCKING_STATUSES = ['Pending', 'Approved'];

const BOOKING_COLUMNS = `
  id, hall_id, hall_name, staff_name, staff_email, staff_phone, reason,
  date, time_from, time_to, status, remarks, created_at, updated_at
`;

const normalizeStatus = (status = "") => {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  const statusMap = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

  return statusMap[value] || "Pending";
};

const getFacultyBookings = async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['faculty', 'staff'].includes(role)) {
    return res.status(403).json({ message: 'Only faculty can view their bookings.' });
  }

  // Do not allow a user to select another user's records with a query string.
  const email = req.user.email;
  const { page, limit, offset } = getPagination(req.query);

  try {
    let where = `WHERE staff_email = ?`;
    const params = [email];

    if (req.query.status) {
      where += ` AND status = ?`;
      params.push(normalizeStatus(req.query.status));
    }
    if (req.query.search?.trim()) {
      where += ` AND (hall_name LIKE ? OR reason LIKE ? OR CAST(id AS CHAR) LIKE ?)`;
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term);
    }

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM bookings ${where}`, params);
    const [rows] = await pool.query(`SELECT ${BOOKING_COLUMNS} FROM bookings ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    res.json({ data: rows, pagination: makePagination({ page, limit, total: countRow.total }) });
  } catch (error) {
    console.error('Error fetching faculty bookings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getAllBookings = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  try {
    let where = ``;
    const params = [];

    if (req.query.status) {
      where = ` WHERE status = ?`;
      params.push(normalizeStatus(req.query.status));
    }

    if (req.query.search?.trim()) {
      where += `${where ? ' AND' : ' WHERE'} (staff_name LIKE ? OR staff_email LIKE ? OR hall_name LIKE ? OR reason LIKE ? OR CAST(id AS CHAR) LIKE ?)`;
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term, term, term);
    }
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM bookings${where}`, params);
    const [rows] = await pool.query(`SELECT ${BOOKING_COLUMNS} FROM bookings${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const payload = { data: rows, pagination: makePagination({ page, limit, total: countRow.total }) };

    // This authenticated, dynamic list must never be served as a conditional
    // response. Express's res.json() generates an ETag and changes a fresh
    // If-None-Match request into 304. End the response directly so this route
    // has no ETag/fresh-response path, while leaving global API caching intact.
    res.status(200);
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.removeHeader('ETag');
    return res.end(JSON.stringify(payload));
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && rows[0].staff_email !== req.user?.email) {
      return res.status(403).json({ message: 'You are not authorized to view this booking.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get period-based availability for a hall on a given date.
// Returns exactly 8 periods with status computed from the database.
const getHallPeriodAvailability = async (req, res) => {
  const hallId = req.params.hallId;
  const date = req.query.date;

  if (!hallId || !date) {
    return res.status(400).json({ message: 'Please provide hallId and date.' });
  }

  // Normalize the selected date to a consistent YYYY-MM-DD to avoid timezone/format issues.
  const normalizedDate = String(date).slice(0, 10);

  try {
    const periods = getPeriods();

    // Fetch hall info for venue name if no bookings exist
    const [hallRows] = await pool.query(`SELECT HallName FROM Halls WHERE HallID = ?`, [Number(hallId)]);
    const hallName = hallRows.length > 0 ? hallRows[0].HallName : `Venue #${hallId}`;

    // Fetch all blocking bookings for this hall + date once.
    const [bookings] = await pool.query(
      `SELECT time_from, time_to, staff_name, status, hall_name
       FROM bookings
       WHERE hall_id = ? AND DATE(date) = ? AND status IN ('Pending', 'Approved')`,
      [Number(hallId), normalizedDate]
    );

    // For each period, check overlap using:
    // existing_start < period_end AND existing_end > period_start
    const availability = periods.map((period) => {
      const overlapping = bookings.find((b) => {
        const bFrom = String(b.time_from).slice(0, 5);
        const bTo = String(b.time_to).slice(0, 5);
        return bFrom < period.end && bTo > period.start;
      });

      return {
        period: period.period,
        start: period.start,
        end: period.end,
        startDisplay: period.startDisplay,
        endDisplay: period.endDisplay,
        status: overlapping ? 'booked' : 'available',
        bookedBy: overlapping ? overlapping.staff_name : null,
        bookingStatus: overlapping ? overlapping.status : null,
        venueName: overlapping ? (overlapping.hall_name || hallName) : hallName,
      };
    });

    res.json({
      success: true,
      hallId: Number(hallId),
      hallName: hallName,
      date: normalizedDate,
      periods: availability,
    });
  } catch (error) {
    console.error('Error fetching period availability:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const checkAvailability = async (req, res) => {
  const { hallId, date, timeFrom, timeTo } = req.body;

  if (!hallId || !date || !timeFrom || !timeTo) {
    return res.status(400).json({ message: 'Please provide venue, date, start time, and end time.' });
  }

  // Normalize the selected date to a consistent YYYY-MM-DD to avoid timezone/format issues.
  const normalizedDate = String(date).slice(0, 10);

  try {
    // Same overlap logic as getHallPeriodAvailability and createBooking:
    // existing_start < requested_end AND existing_end > requested_start
    const [rows] = await pool.query(
      `SELECT id, staff_name, staff_email, time_from, time_to, status
       FROM bookings
       WHERE hall_id = ? AND DATE(date) = ? AND status IN ('Pending', 'Approved')
       AND time_from < ? AND time_to > ?
       LIMIT 1`,
      [Number(hallId), normalizedDate, timeTo, timeFrom]
    );

    if (rows.length > 0) {
      return res.status(409).json({ available: false, message: 'This venue is already booked for the selected period.' });
    }

    return res.json({ available: true, message: 'Venue is available.' });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const createBooking = async (req, res) => {
  const {
    hallId,
    reason,
    date,
    timeFrom,
    timeTo,
    selectedSlots,
    remarks = "",
  } = req.body;

  if (
    !hallId ||
    !reason
  ) {
    return res.status(400).json({
      message: "Please fill in all required booking fields.",
    });
  }

  /*
   * New booking format:
   *
   * selectedSlots = [
   *   {
   *     date: "2026-08-14",
   *     timeFrom: "09:15",
   *     timeTo: "10:05"
   *   },
   *   {
   *     date: "2026-08-14",
   *     timeFrom: "10:05",
   *     timeTo: "10:50"
   *   },
   *   {
   *     date: "2026-08-15",
   *     timeFrom: "11:10",
   *     timeTo: "12:00"
   *   }
   * ]
   *
   * This allows:
   * - multiple periods on the same day
   * - different periods on different days
   * - multiple days
   */

  let slots = [];

  if (Array.isArray(selectedSlots) && selectedSlots.length > 0) {
    slots = selectedSlots.map((slot) => ({
      date: String(slot.date).slice(0, 10),
      timeFrom: slot.timeFrom,
      timeTo: slot.timeTo,
    }));
  } else if (date && timeFrom && timeTo) {
    // Backward compatibility for old single-period bookings
    slots = [
      {
        date: String(date).slice(0, 10),
        timeFrom,
        timeTo,
      },
    ];
  }

  if (slots.length === 0) {
    return res.status(400).json({
      message: "Please select at least one period.",
    });
  }

  // Validate every selected slot
  const validPeriods = getPeriods();
  const uniqueSlotKeys = new Set();
  for (const slot of slots) {
    if (!slot.date || !slot.timeFrom || !slot.timeTo) {
      return res.status(400).json({
        message: "Every selected period must have a date, start time and end time.",
      });
    }

    if (slot.timeFrom >= slot.timeTo) {
      return res.status(400).json({
        message: `Invalid time range for ${slot.date}.`,
      });
    }

    const isOfficialPeriod = validPeriods.some(
      (period) => period.start === slot.timeFrom && period.end === slot.timeTo
    );
    if (!isOfficialPeriod) {
      return res.status(400).json({
        message: `Please select a valid timetable period for ${slot.date}.`,
      });
    }

    const slotKey = `${slot.date}|${slot.timeFrom}|${slot.timeTo}`;
    if (uniqueSlotKeys.has(slotKey)) {
      return res.status(400).json({
        message: 'A timetable period can only be selected once.',
      });
    }
    uniqueSlotKeys.add(slotKey);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Booking ownership and status always come from the authenticated account.
    // Never accept creator details or a role/status from the browser.
    const [creatorRows] = await connection.query(
      `SELECT full_name, email, role FROM staff WHERE email = ? LIMIT 1`,
      [req.user.email]
    );
    const creator = creatorRows[0];

    if (!creator || !['admin', 'staff', 'faculty'].includes(String(creator.role).toLowerCase())) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to create bookings.' });
    }

    const [hallRows] = await connection.query(
      `SELECT HallName FROM Halls WHERE HallID = ? AND ActiveStatus = TRUE LIMIT 1`,
      [Number(hallId)]
    );
    if (!hallRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Please select an active venue.' });
    }

    const hallName = hallRows[0].HallName;
    const staffName = creator.full_name;
    const staffEmail = creator.email;
    // The deployed staff schema does not contain a phone column. Keep the
    // existing booking field non-null without making creator lookup fail.
    const staffPhone = '';
    const bookingStatus = String(creator.role).toLowerCase() === 'admin'
      ? 'Approved'
      : 'Pending';

    /*
     * IMPORTANT:
     * Check ALL selected periods before inserting ANY booking.
     *
     * This prevents partial bookings.
     *
     * Example:
     * P1 available
     * P2 available
     * P3 already booked
     *
     * Result:
     * NOTHING is inserted.
     */

    for (const slot of slots) {
      const [conflicts] = await connection.query(
        `
        SELECT id, staff_name, staff_email, time_from, time_to, status
        FROM bookings
        WHERE hall_id = ?
          AND DATE(date) = ?
          AND status IN ('Pending', 'Approved')
          AND time_from < ?
          AND time_to > ?
        LIMIT 1
        `,
        [
          Number(hallId),
          slot.date,
          slot.timeTo,
          slot.timeFrom,
        ]
      );

      if (conflicts.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message: `The venue is already booked on ${slot.date} from ${slot.timeFrom} to ${slot.timeTo}.`,
          conflict: conflicts[0],
        });
      }
    }

    /*
     * All selected periods are available.
     * Now insert ONE booking row per selected period.
     */

    const createdBookings = [];

    for (const slot of slots) {
      const [result] = await connection.query(
        `
        INSERT INTO bookings (
          hall_id,
          hall_name,
          staff_name,
          staff_email,
          staff_phone,
          reason,
          date,
          time_from,
          time_to,
          status,
          remarks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          Number(hallId),
          hallName,
          staffName,
          staffEmail,
          staffPhone,
          reason,
          slot.date,
          slot.timeFrom,
          slot.timeTo,
          bookingStatus,
          remarks,
        ]
      );

      createdBookings.push({
        id: result.insertId,
        hallId: Number(hallId),
        hallName,
        staffName,
        staffEmail,
        staffPhone,
        reason,
        date: slot.date,
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo,
        remarks,
        status: bookingStatus,
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `${createdBookings.length} period(s) booked successfully.`,
      bookings: createdBookings,
    });

  } catch (error) {
    await connection.rollback();

    console.error("Error creating booking:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const validStatuses = ['approved', 'rejected'];

  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve or reject bookings.' });
  }

  const databaseStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  try {
    const [result] = await pool.query(
      `UPDATE bookings
       SET status = ?
       WHERE id = ? AND status = 'Pending'`,
      [databaseStatus, id]
    );

    if (result.affectedRows === 0) {
      const [bookings] = await pool.query('SELECT status FROM bookings WHERE id = ?', [id]);

      if (bookings.length === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      return res.status(400).json({ message: 'Only pending bookings can be approved or rejected.' });
    }

    res.json({ message: 'Booking status updated successfully', id, status: databaseStatus });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
const cancelBooking = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get booking details
    const [bookingRows] = await pool.query(
      `SELECT id, status, staff_email
       FROM bookings
       WHERE id = ?`,
      [id]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    const booking = bookingRows[0];

    // 2. Only Pending or Approved bookings can be cancelled
    if (
      booking.status !== 'Pending' &&
      booking.status !== 'Approved'
    ) {
      return res.status(400).json({
        message: 'Only pending or approved bookings can be cancelled.'
      });
    }

    // 3. Get logged-in user's details from JWT
    const userEmail = req.user?.email;
    const userRole = req.user?.role;

    // 4. Faculty/staff can cancel ONLY their own booking
    if (userRole === 'faculty' || userRole === 'staff') {
      if (!userEmail || userEmail !== booking.staff_email) {
        return res.status(403).json({
          message: 'You can only cancel your own booking.'
        });
      }
    }

    // 5. Only admin and faculty/staff are allowed
    if (userRole !== 'admin' && userRole !== 'faculty' && userRole !== 'staff') {
      return res.status(403).json({
        message: 'You are not authorized to cancel this booking.'
      });
    }

    // 6. Change booking status to Cancelled
    const [result] = await pool.query(
      `UPDATE bookings
       SET status = ?
       WHERE id = ?`,
      ['Cancelled', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // 7. Success response
    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      id: id
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  getFacultyBookings,
  checkAvailability,
  getHallPeriodAvailability
};
