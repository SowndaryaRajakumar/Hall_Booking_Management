const pool = require('../config/db');
const { getPeriods } = require('../config/periods');
const { getPagination, makePagination } = require('../utils/pagination');
const {
  createNotification,
  createNotificationForAdmins,
  notifyBookingCreated,
  notifyBookingApproved,
  notifyBookingRejected,
  notifyBookingCancelled,
} = require('../services/notificationService');
const { logBookingAction, getBookingAuditLogs, getAllAuditLogs } = require('../services/auditService');
const { findConflictsAndAlternatives } = require('../services/conflictService');
const { createRecurringBooking } = require('../services/recurringService');
const { normalizeRole, getUserPermissions } = require('../middlewares/permissionMiddleware');

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
  const userRole = normalizeRole(req.user?.role);
  try {
    const whereClauses = [];
    const params = [];

    // Department Admin scoping: filter strictly by their department venues
    if (userRole === 'DEPARTMENT_ADMIN') {
      let deptId = req.user?.departmentId;
      if (!deptId) {
        const [d] = await pool.query('SELECT department_id FROM staff WHERE staff_id = ?', [req.user.staffId || req.user.id]);
        if (d.length) deptId = d[0].department_id;
      }
      if (deptId) {
        whereClauses.push('h.DeptID = ?');
        params.push(deptId);
      }
    } else if (userRole === 'MASTER_ADMIN' && req.query.departmentId) {
      whereClauses.push('h.DeptID = ?');
      params.push(Number(req.query.departmentId));
    }

    if (req.query.venueId) {
      whereClauses.push('b.hall_id = ?');
      params.push(Number(req.query.venueId));
    }

    if (req.query.status) {
      whereClauses.push('b.status = ?');
      params.push(normalizeStatus(req.query.status));
    }

    if (req.query.search?.trim()) {
      whereClauses.push('(b.staff_name LIKE ? OR b.staff_email LIKE ? OR b.hall_name LIKE ? OR b.reason LIKE ? OR CAST(b.id AS CHAR) LIKE ?)');
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM bookings b LEFT JOIN halls h ON b.hall_id = h.HallID ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT b.id, b.hall_id, b.hall_name, b.staff_name, b.staff_email, b.staff_phone, b.reason,
              b.date, b.time_from, b.time_to, b.status, b.remarks, b.created_at, b.updated_at
       FROM bookings b
       LEFT JOIN halls h ON b.hall_id = h.HallID
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
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

    // Fetch active academic allocations for this venue on this date
    const dt = new Date(`${normalizedDate}T00:00:00`);
    const dayIdx = dt.getDay();
    const [academicAllocs] = await pool.query(
      `SELECT aa.id, aa.subject_name, aa.year_of_study, aa.section, s.full_name AS staff_name,
              aar.period_id, aar.start_time, aar.end_time
       FROM academic_allocations aa
       JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
       JOIN staff s ON aa.faculty_id = s.staff_id
       WHERE aa.venue_id = ?
         AND aa.status IN ('PENDING', 'APPROVED')
         AND aa.start_date <= ? AND aa.end_date >= ?
         AND aar.day_index = ?`,
      [Number(hallId), normalizedDate, normalizedDate, dayIdx]
    );

    // Check cancellation overrides
    let activeAcademicMap = new Map();
    if (academicAllocs.length > 0) {
      const allocIds = academicAllocs.map((a) => a.id);
      const [cancelledOccs] = await pool.query(
        `SELECT allocation_id, period_id FROM academic_allocation_occurrences
         WHERE allocation_id IN (?) AND occurrence_date = ? AND status = 'CANCELLED'`,
        [allocIds, normalizedDate]
      );
      const cancelledKeys = new Set(cancelledOccs.map((c) => `${c.allocation_id}_${c.period_id}`));

      for (const a of academicAllocs) {
        if (!cancelledKeys.has(`${a.id}_${a.period_id}`)) {
          activeAcademicMap.set(Number(a.period_id), a);
        }
      }
    }

    // For each period, check overlap using:
    // existing_start < period_end AND existing_end > period_start
    const availability = periods.map((period) => {
      const overlapping = bookings.find((b) => {
        const bFrom = String(b.time_from).slice(0, 5);
        const bTo = String(b.time_to).slice(0, 5);
        return bFrom < period.end && bTo > period.start;
      });

      const academicOcc = activeAcademicMap.get(period.period);

      const isBooked = Boolean(overlapping || academicOcc);
      const bookedBy = overlapping
        ? overlapping.staff_name
        : academicOcc
        ? `${academicOcc.staff_name} (${academicOcc.subject_name})`
        : null;
      const bookingStatus = overlapping
        ? overlapping.status
        : academicOcc
        ? 'Allocated'
        : null;

      return {
        period: period.period,
        start: period.start,
        end: period.end,
        startDisplay: period.startDisplay,
        endDisplay: period.endDisplay,
        status: isBooked ? 'booked' : 'available',
        bookedBy,
        bookingStatus,
        venueName: overlapping ? (overlapping.hall_name || hallName) : hallName,
        isAcademic: Boolean(academicOcc && !overlapping),
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
    const conflictCheck = await findConflictsAndAlternatives({
      hallId: Number(hallId),
      slots: [{ date: normalizedDate, timeFrom, timeTo }],
    });

    if (conflictCheck.hasConflict) {
      return res.status(409).json({
        available: false,
        conflict: true,
        message: conflictCheck.message,
        conflictDetails: conflictCheck.conflictDetails,
        alternatives: conflictCheck.alternatives,
      });
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
      `SELECT staff_id, full_name, email, role, department, department_id, phone FROM staff WHERE email = ? LIMIT 1`,
      [req.user.email]
    );
    const creator = creatorRows[0];
    const userRole = normalizeRole(creator?.role);

    if (!creator) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not authorized to create bookings.' });
    }

    const [hallRows] = await connection.query(
      `SELECT HallName, DeptID, ownership_type, category, approval_role FROM halls WHERE HallID = ? AND ActiveStatus = TRUE LIMIT 1 FOR UPDATE`,
      [Number(hallId)]
    );
    if (!hallRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Please select an active venue.' });
    }

    const venue = hallRows[0];
    const hallName = venue.HallName;

    // Venue Access Control:
    if (userRole === 'FACULTY') {
      // 1. Department venue: must match faculty's department
      if (venue.ownership_type === 'DEPARTMENT' && creator.department_id && Number(venue.DeptID) !== Number(creator.department_id)) {
        await connection.rollback();
        return res.status(403).json({
          message: 'Access denied: You can only book department venues belonging to your assigned department.',
        });
      }

      // 2. Common venue: must have ALLOWED access for faculty's department
      if (venue.ownership_type === 'COMMON' && creator.department_id) {
        const [accessRows] = await connection.query(
          'SELECT access_type, status FROM venue_access WHERE venue_id = ? AND department_id = ?',
          [Number(hallId), creator.department_id]
        );
        if (accessRows.length && (accessRows[0].access_type === 'RESTRICTED' || !accessRows[0].status)) {
          await connection.rollback();
          return res.status(403).json({
            message: 'Access denied: Your department does not have permission to book this common venue.',
          });
        }
      }
    }

    const staffName = creator.full_name;
    const staffEmail = creator.email;
    const staffId = creator.staff_id;
    const staffPhone = creator.phone || '';
    const bookingStatus = (userRole === 'MASTER_ADMIN' || (userRole === 'DEPARTMENT_ADMIN' && Number(venue.DeptID) === Number(creator.department_id)))
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

    const conflictCheck = await findConflictsAndAlternatives({
      hallId: Number(hallId),
      slots,
      staffId: creator.staff_id,
      staffEmail: creator.email,
      dbConn: connection,
    });

    if (conflictCheck.hasConflict) {
      await connection.rollback();

      return res.status(409).json({
        conflict: true,
        message: conflictCheck.message,
        conflictDetails: conflictCheck.conflictDetails,
        alternatives: conflictCheck.alternatives,
      });
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
          remarks,
          staff_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          staffId,
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

    // Audit Trail: Log creation for each booking
    for (const booking of createdBookings) {
      try {
        await logBookingAction({
          bookingId: booking.id,
          userId: staffId,
          action: 'BOOKING_CREATED',
          oldStatus: null,
          newStatus: bookingStatus,
          details: {
            hallId: booking.hallId,
            hallName: booking.hallName,
            date: booking.date,
            timeFrom: booking.timeFrom,
            timeTo: booking.timeTo,
            reason: booking.reason,
            role: creator.role,
          },
        });
      } catch (auditErr) {
        console.error('Failed to log booking creation audit:', auditErr);
      }
    }

    // Notify relevant Admin (Master / Dept Admin) and Faculty (Email + WhatsApp)
    for (const booking of createdBookings) {
      if (booking.status === 'Pending') {
        try {
          await notifyBookingCreated(booking);
        } catch (notifError) {
          console.error('Failed to notify admins of new booking:', notifError);
        }
      }
    }

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

  const userRole = normalizeRole(req.user?.role);
  if (userRole !== 'MASTER_ADMIN' && userRole !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ message: 'Only administrators can approve or reject bookings.' });
  }

  const databaseStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  try {
    // 1. Fetch booking details along with resolved staff_id
    const [existingBookings] = await pool.query(
      `SELECT b.id, b.hall_id, b.hall_name, b.staff_name, b.staff_email, b.staff_id, b.date, b.time_from, b.time_to, b.status, b.reason,
              s.staff_id AS resolved_staff_id, s.phone AS staff_phone
       FROM bookings b
       LEFT JOIN staff s ON (b.staff_id = s.staff_id OR (b.staff_id = 0 AND b.staff_email = s.email))
       WHERE b.id = ?`,
      [id]
    );

    if (existingBookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = existingBookings[0];
    if (booking.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending bookings can be approved or rejected.' });
    }

    // Permission and Department validation for Department Admin
    if (userRole === 'DEPARTMENT_ADMIN') {
      const permissions = await getUserPermissions(req.user.staffId || req.user.id, userRole);
      const requiredPerm = databaseStatus === 'Approved' ? 'APPROVE_BOOKINGS' : 'REJECT_BOOKINGS';
      if (!permissions.includes(requiredPerm)) {
        return res.status(403).json({
          message: `Access denied: You do not have permission to ${databaseStatus.toLowerCase()} bookings.`,
        });
      }

      const [h] = await pool.query('SELECT DeptID, ownership_type, approval_role FROM halls WHERE HallID = ?', [booking.hall_id]);
      if (h.length) {
        // Common venue: strictly reserved for Master Admin approval
        if (h[0].ownership_type === 'COMMON' || !h[0].DeptID) {
          return res.status(403).json({
            message: 'Access denied: Department Admins cannot approve or reject bookings for common college venues. Only Master Admin can approve common venues.',
          });
        }

        // Department venue: must match department
        let userDeptId = req.user.departmentId;
        if (!userDeptId) {
          const [d] = await pool.query('SELECT department_id FROM staff WHERE staff_id = ?', [req.user.staffId || req.user.id]);
          if (d.length) userDeptId = d[0].department_id;
        }

        if (userDeptId && Number(h[0].DeptID) !== Number(userDeptId)) {
          return res.status(403).json({
            message: 'Access denied: You can only approve or reject bookings for your own department.',
          });
        }
      }
    }

    // 2. Perform the update
    const [result] = await pool.query(
      `UPDATE bookings
       SET status = ?, remarks = ?
       WHERE id = ? AND status = 'Pending'`,
      [databaseStatus, req.body?.remarks || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Only pending bookings can be approved or rejected.' });
    }

    // 3. Log Audit Trail
    try {
      await logBookingAction({
        bookingId: Number(id),
        userId: req.user?.id || req.user?.staffId || null,
        action: databaseStatus === 'Approved' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
        oldStatus: booking.status,
        newStatus: databaseStatus,
        details: {
          updatedBy: req.user?.email,
          role: userRole,
          remarks: req.body?.remarks || null,
        },
      });
    } catch (auditErr) {
      console.error('Failed to log status update audit:', auditErr);
    }

    // 4. Success: Send notifications (In-app, Email, WhatsApp)
    try {
      const updatedBooking = { ...booking, status: databaseStatus };
      if (databaseStatus === 'Approved') {
        await notifyBookingApproved(updatedBooking);
      } else {
        await notifyBookingRejected(updatedBooking, req.body?.remarks || '');
      }
    } catch (notifErr) {
      console.error('Failed to notify faculty of booking status update:', notifErr);
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
    // 1. Get booking details along with resolved staff_id
    const [bookingRows] = await pool.query(
      `SELECT b.id, b.hall_id, b.status, b.staff_email, b.staff_name, b.staff_id, b.hall_name, b.date, b.time_from, b.time_to, b.reason,
              s.staff_id AS resolved_staff_id, s.phone AS staff_phone
       FROM bookings b
       LEFT JOIN staff s ON (b.staff_id = s.staff_id OR (b.staff_id = 0 AND b.staff_email = s.email))
       WHERE b.id = ?`,
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

    // 3. User verification and permission checks
    const userEmail = req.user?.email;
    const userRole = normalizeRole(req.user?.role);

    if (userRole === 'FACULTY') {
      if (!userEmail || userEmail !== booking.staff_email) {
        return res.status(403).json({
          message: 'You can only cancel your own booking.'
        });
      }
    } else if (userRole === 'DEPARTMENT_ADMIN') {
      const permissions = await getUserPermissions(req.user.staffId || req.user.id, userRole);
      if (!permissions.includes('CANCEL_BOOKINGS')) {
        return res.status(403).json({
          message: 'Access denied: You do not have permission to cancel bookings.',
        });
      }
      const [h] = await pool.query('SELECT DeptID FROM halls WHERE HallID = ?', [booking.hall_id]);
      if (h.length && req.user.departmentId && Number(h[0].DeptID) !== Number(req.user.departmentId)) {
        return res.status(403).json({
          message: 'Access denied: You can only cancel bookings for your own department.',
        });
      }
    }

    // 4. Change booking status to Cancelled (atomic check)
    const [result] = await pool.query(
      `UPDATE bookings
       SET status = ?
       WHERE id = ? AND status IN ('Pending', 'Approved')`,
      ['Cancelled', id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: 'Only pending or approved bookings can be cancelled.'
      });
    }

    // 5. Success: Log audit action
    try {
      await logBookingAction({
        bookingId: Number(id),
        userId: req.user?.id || req.user?.staffId || booking.staff_id || booking.resolved_staff_id || null,
        action: 'BOOKING_CANCELLED',
        oldStatus: booking.status,
        newStatus: 'Cancelled',
        details: {
          cancelledBy: req.user?.email,
          role: userRole,
          reason: req.body?.reason || 'Booking cancelled by user',
        },
      });
    } catch (auditErr) {
      console.error('Failed to log cancellation audit:', auditErr);
    }

    // 6. Send appropriate notification (In-app, Email, WhatsApp)
    try {
      booking.status = 'Cancelled';
      await notifyBookingCancelled(
        booking,
        req.user?.name || req.user?.email || 'User',
        req.body?.reason || ''
      );
    } catch (notifErr) {
      console.error('Failed to dispatch cancellation notification:', notifErr);
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

const handleRecurringBooking = async (req, res) => {
  try {
    const {
      hallId,
      reason,
      startDate,
      endDate,
      weekdays,
      periodSlot,
      forceAvailableOnly = false,
      remarks = '',
    } = req.body;

    if (!hallId || !reason || !startDate || !endDate || !weekdays || !periodSlot) {
      return res.status(400).json({
        message: 'Missing required fields for recurring booking (hallId, reason, startDate, endDate, weekdays, periodSlot).',
      });
    }

    const result = await createRecurringBooking({
      hallId: Number(hallId),
      reason,
      startDate,
      endDate,
      weekdays,
      periodSlot,
      remarks,
      user: req.user,
      forceAvailableOnly: Boolean(forceAvailableOnly),
    });

    if (result.conflict) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error handling recurring booking:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

const getAuditLogsForBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await getBookingAuditLogs(id, req.user);
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs for booking:', error);
    const status = error.message.includes('authorized') ? 403 : error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ message: error.message });
  }
};

const getAllAuditLogsList = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view full audit logs.' });
    }
    const { limit = 100, offset = 0 } = req.query;
    const logs = await getAllAuditLogs({ limit: Number(limit), offset: Number(offset) });
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    return res.status(500).json({ message: error.message });
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
  getHallPeriodAvailability,
  handleRecurringBooking,
  getAuditLogsForBooking,
  getAllAuditLogsList,
};
