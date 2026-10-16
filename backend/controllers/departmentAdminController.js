const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { getPagination, makePagination } = require('../utils/pagination');
const { logBookingAction, logSystemAction } = require('../services/auditService');
const {
  notifyBookingApproved,
  notifyBookingRejected,
  notifyBookingCancelled,
} = require('../services/notificationService');

/**
 * Helper to resolve the authenticated Department Admin's department ID.
 */
const resolveDeptId = async (req) => {
  if (req.userDepartmentId) return req.userDepartmentId;
  if (req.user?.departmentId) return Number(req.user.departmentId);

  const [rows] = await pool.query(
    'SELECT department_id, department FROM staff WHERE staff_id = ? LIMIT 1',
    [req.user?.staffId || req.user?.id]
  );
  if (rows.length && rows[0].department_id) {
    return Number(rows[0].department_id);
  }
  if (rows.length && rows[0].department) {
    const [dRows] = await pool.query(
      'SELECT DeptID FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1',
      [rows[0].department]
    );
    if (dRows.length) return Number(dRows[0].DeptID);
  }
  return null;
};

/**
 * 1. DEPARTMENT DASHBOARD
 */
const getDepartmentDashboard = async (req, res) => {
  try {
    const deptId = await resolveDeptId(req);
    if (!deptId) {
      return res.status(403).json({ success: false, message: 'No department assigned' });
    }

    const [[facultyRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM staff WHERE department_id = ? AND role IN ('FACULTY', 'staff')",
      [deptId]
    );

    const [[venuesRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM halls WHERE DeptID = ?',
      [deptId]
    );

    const [[activeVenuesRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM halls WHERE DeptID = ? AND ActiveStatus = 1',
      [deptId]
    );

    const [[pendingRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE h.DeptID = ? AND b.status = 'Pending'`,
      [deptId]
    );

    const [[approvedRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE h.DeptID = ? AND b.status = 'Approved'`,
      [deptId]
    );

    const [[cancelledRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE h.DeptID = ? AND b.status = 'Cancelled'`,
      [deptId]
    );

    const [recentBookings] = await pool.query(
      `SELECT b.id, b.hall_name, b.staff_name, b.staff_email, b.date, b.time_from, b.time_to, b.status, b.reason, b.created_at
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE h.DeptID = ?
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [deptId]
    );

    const [[deptAcademicRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM academic_allocations aa
       LEFT JOIN halls h ON aa.venue_id = h.HallID
       WHERE aa.department_id = ? OR h.DeptID = ?`,
      [deptId, deptId]
    );

    const [[pendingAcademicRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM academic_allocations aa
       LEFT JOIN halls h ON aa.venue_id = h.HallID
       WHERE (aa.department_id = ? OR h.DeptID = ?) AND aa.status = 'PENDING'`,
      [deptId, deptId]
    );

    res.json({
      success: true,
      data: {
        totalFaculty: facultyRow.total || 0,
        totalVenues: venuesRow.total || 0,
        activeVenues: activeVenuesRow.total || 0,
        pendingBookings: pendingRow.total || 0,
        approvedBookings: approvedRow.total || 0,
        cancelledBookings: cancelledRow.total || 0,
        departmentAcademicAllocations: deptAcademicRow.total || 0,
        pendingAcademicAllocations: pendingAcademicRow.total || 0,
        recentBookings,
      },
    });
  } catch (err) {
    console.error('getDepartmentDashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve department dashboard metrics' });
  }
};

/**
 * 2. DEPARTMENT FACULTY MANAGEMENT
 */
const getDepartmentFaculty = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const search = req.query.search?.trim();

  try {
    const deptId = await resolveDeptId(req);
    let where = "WHERE s.department_id = ? AND s.role IN ('FACULTY', 'staff')";
    const params = [deptId];

    if (search) {
      where += ' AND (s.full_name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.designation LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM staff s ${where}`, params);
    const [rows] = await pool.query(
      `SELECT s.staff_id, s.full_name, s.email, s.phone, s.department, s.designation, s.employee_id, s.status, s.role, s.created_at
       FROM staff s
       ${where}
       ORDER BY s.full_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (err) {
    console.error('getDepartmentFaculty error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch department faculty' });
  }
};

const addDepartmentFaculty = async (req, res) => {
  try {
    const deptId = await resolveDeptId(req);
    const { fullName, email, password, phone, designation, employeeId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and temporary password are required' });
    }

    const [existing] = await pool.query('SELECT staff_id FROM staff WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Faculty with this email already exists' });
    }

    const [deptRows] = await pool.query('SELECT DeptName FROM departments WHERE DeptID = ?', [deptId]);
    const deptName = deptRows.length ? deptRows[0].DeptName : 'Department';

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO staff (full_name, email, password, department, department_id, role, status, is_first_login, phone, designation, employee_id)
       VALUES (?, ?, ?, ?, ?, 'FACULTY', 'active', 1, ?, ?, ?)`,
      [fullName.trim(), email.trim(), hashedPassword, deptName, deptId, phone || null, designation || null, employeeId || null]
    );

    // Initial notification preference
    await pool.query('INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled) VALUES (?, 1, 1)', [result.insertId]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'FACULTY_CREATED',
      entityType: 'STAFF',
      entityId: result.insertId,
      newValue: { fullName, email, department: deptName },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Faculty enrolled successfully', staffId: result.insertId });
  } catch (err) {
    console.error('addDepartmentFaculty error:', err);
    res.status(500).json({ success: false, message: 'Failed to enroll faculty' });
  }
};

const updateDepartmentFaculty = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const { fullName, email, phone, designation, employeeId } = req.body;

    const [existing] = await pool.query('SELECT * FROM staff WHERE staff_id = ? AND department_id = ?', [id, deptId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Faculty not found in your department' });
    }

    await pool.query(
      `UPDATE staff
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           designation = COALESCE(?, designation),
           employee_id = COALESCE(?, employee_id)
       WHERE staff_id = ?`,
      [fullName?.trim() || null, email?.trim() || null, phone || null, designation || null, employeeId || null, id]
    );

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'FACULTY_UPDATED',
      entityType: 'STAFF',
      entityId: Number(id),
      oldValue: existing[0],
      newValue: { fullName, email, phone, designation, employeeId },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Faculty updated successfully' });
  } catch (err) {
    console.error('updateDepartmentFaculty error:', err);
    res.status(500).json({ success: false, message: 'Failed to update faculty' });
  }
};

const toggleFacultyStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const [rows] = await pool.query('SELECT staff_id, status FROM staff WHERE staff_id = ? AND department_id = ?', [id, deptId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Faculty not found in your department' });
    }

    const currentStatus = rows[0].status || 'active';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await pool.query('UPDATE staff SET status = ?, auth_version = auth_version + 1 WHERE staff_id = ?', [nextStatus, id]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: nextStatus === 'active' ? 'FACULTY_ACTIVATED' : 'FACULTY_DEACTIVATED',
      entityType: 'STAFF',
      entityId: Number(id),
      oldValue: { status: currentStatus },
      newValue: { status: nextStatus },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Faculty ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`, status: nextStatus });
  } catch (err) {
    console.error('toggleFacultyStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle faculty status' });
  }
};

/**
 * 3. DEPARTMENT VENUES MANAGEMENT
 */
const getDepartmentVenues = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const search = req.query.search?.trim();

  try {
    const deptId = await resolveDeptId(req);
    let where = 'WHERE h.DeptID = ? AND h.ownership_type = "DEPARTMENT"';
    const params = [deptId];

    if (search) {
      where += ' AND (h.HallName LIKE ? OR h.Location LIKE ? OR h.VenueType LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM halls h ${where}`, params);
    const [rows] = await pool.query(
      `SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.VenueType, h.category, h.ActiveStatus, h.NumberOfSystems, h.ImageURL
       FROM halls h
       ${where}
       ORDER BY h.HallName ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (err) {
    console.error('getDepartmentVenues error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch department venues' });
  }
};

const createDepartmentVenue = async (req, res) => {
  try {
    const deptId = await resolveDeptId(req);
    const { hallName, location, capacity, venueType, category, numberOfSystems } = req.body;

    if (!hallName || !location || !capacity) {
      return res.status(400).json({ success: false, message: 'Name, location, and capacity are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO halls (HallName, Location, Capacity, DeptID, VenueType, ownership_type, category, approval_role, NumberOfSystems, ActiveStatus, created_by)
       VALUES (?, ?, ?, ?, ?, 'DEPARTMENT', ?, 'DEPARTMENT_ADMIN', ?, 1, ?)`,
      [
        hallName.trim(),
        location.trim(),
        capacity,
        deptId,
        venueType || 'Classroom',
        category || venueType || 'Classroom',
        numberOfSystems || 0,
        req.user?.staffId || req.user?.id || null,
      ]
    );

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'VENUE_CREATED',
      entityType: 'VENUE',
      entityId: result.insertId,
      newValue: { hallName, location, deptId, venueType },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Department venue created successfully', venueId: result.insertId });
  } catch (err) {
    console.error('createDepartmentVenue error:', err);
    res.status(500).json({ success: false, message: 'Failed to create department venue' });
  }
};

const updateDepartmentVenue = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const { hallName, location, capacity, venueType, category, numberOfSystems, activeStatus } = req.body;

    const [existing] = await pool.query('SELECT * FROM halls WHERE HallID = ? AND DeptID = ?', [id, deptId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Venue not found in your department' });
    }

    await pool.query(
      `UPDATE halls
       SET HallName = COALESCE(?, HallName),
           Location = COALESCE(?, Location),
           Capacity = COALESCE(?, Capacity),
           VenueType = COALESCE(?, VenueType),
           category = COALESCE(?, category),
           NumberOfSystems = COALESCE(?, NumberOfSystems),
           ActiveStatus = COALESCE(?, ActiveStatus)
       WHERE HallID = ?`,
      [
        hallName?.trim() || null,
        location?.trim() || null,
        capacity || null,
        venueType || null,
        category || null,
        numberOfSystems || null,
        activeStatus === undefined ? null : (activeStatus ? 1 : 0),
        id,
      ]
    );

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'VENUE_UPDATED',
      entityType: 'VENUE',
      entityId: Number(id),
      oldValue: existing[0],
      newValue: req.body,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Department venue updated successfully' });
  } catch (err) {
    console.error('updateDepartmentVenue error:', err);
    res.status(500).json({ success: false, message: 'Failed to update department venue' });
  }
};

/**
 * 4. DEPARTMENT BOOKINGS
 */
const getDepartmentBookings = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const status = req.query.status;
  const search = req.query.search?.trim();

  try {
    const deptId = await resolveDeptId(req);
    let where = 'WHERE h.DeptID = ?';
    const params = [deptId];

    if (status) {
      where += ' AND b.status = ?';
      params.push(status);
    }

    if (search) {
      where += ' AND (b.staff_name LIKE ? OR b.staff_email LIKE ? OR b.hall_name LIKE ? OR b.reason LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM bookings b JOIN halls h ON b.hall_id = h.HallID ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT b.id, b.hall_id, b.hall_name, b.staff_name, b.staff_email, b.staff_phone, b.reason,
              b.date, b.time_from, b.time_to, b.status, b.remarks, b.created_at, b.staff_id,
              h.VenueType, h.Location
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (err) {
    console.error('getDepartmentBookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch department bookings' });
  }
};

const approveDepartmentBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const [bookingRows] = await pool.query(
      `SELECT b.*, h.DeptID, h.HallName
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE b.id = ? AND h.DeptID = ?`,
      [id, deptId]
    );

    if (!bookingRows.length) {
      return res.status(404).json({ success: false, message: 'Booking not found in your department' });
    }

    const booking = bookingRows[0];
    if (booking.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be approved' });
    }

    const [updateRes] = await pool.query("UPDATE bookings SET status = 'Approved' WHERE id = ? AND status = 'Pending'", [id]);
    if (updateRes.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be approved' });
    }

    await logBookingAction({
      bookingId: Number(id),
      userId: req.user?.staffId || req.user?.id,
      action: 'BOOKING_APPROVED',
      oldStatus: 'Pending',
      newStatus: 'Approved',
      details: { approvedBy: req.user?.email, remarks: req.body?.remarks || null },
    });

    // Notify Faculty (Email + WhatsApp)
    booking.status = 'Approved';
    await notifyBookingApproved(booking);

    res.json({ success: true, message: 'Booking approved successfully' });
  } catch (err) {
    console.error('approveDepartmentBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve booking' });
  }
};

const rejectDepartmentBooking = async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body;
  try {
    const deptId = await resolveDeptId(req);
    const [bookingRows] = await pool.query(
      `SELECT b.*, h.DeptID, h.HallName
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE b.id = ? AND h.DeptID = ?`,
      [id, deptId]
    );

    if (!bookingRows.length) {
      return res.status(404).json({ success: false, message: 'Booking not found in your department' });
    }

    const booking = bookingRows[0];
    if (booking.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });
    }

    const [updateRes] = await pool.query("UPDATE bookings SET status = 'Rejected', remarks = ? WHERE id = ? AND status = 'Pending'", [reason || null, id]);
    if (updateRes.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });
    }

    await logBookingAction({
      bookingId: Number(id),
      userId: req.user?.staffId || req.user?.id,
      action: 'BOOKING_REJECTED',
      oldStatus: 'Pending',
      newStatus: 'Rejected',
      details: { rejectedBy: req.user?.email, reason },
    });

    // Notify Faculty (Email + WhatsApp)
    booking.status = 'Rejected';
    await notifyBookingRejected(booking, reason);

    res.json({ success: true, message: 'Booking rejected successfully' });
  } catch (err) {
    console.error('rejectDepartmentBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject booking' });
  }
};

const cancelDepartmentBooking = async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body;
  try {
    const deptId = await resolveDeptId(req);
    const [bookingRows] = await pool.query(
      `SELECT b.*, h.DeptID, h.HallName
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       WHERE b.id = ? AND h.DeptID = ?`,
      [id, deptId]
    );

    if (!bookingRows.length) {
      return res.status(404).json({ success: false, message: 'Booking not found in your department' });
    }

    const booking = bookingRows[0];
    if (booking.status !== 'Pending' && booking.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Only pending or approved bookings can be cancelled' });
    }

    const [updateRes] = await pool.query("UPDATE bookings SET status = 'Cancelled', remarks = ? WHERE id = ? AND status IN ('Pending', 'Approved')", [reason || null, id]);
    if (updateRes.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Only pending or approved bookings can be cancelled' });
    }

    await logBookingAction({
      bookingId: Number(id),
      userId: req.user?.staffId || req.user?.id,
      action: 'BOOKING_CANCELLED',
      oldStatus: booking.status,
      newStatus: 'Cancelled',
      details: { cancelledBy: req.user?.email, reason },
    });

    booking.status = 'Cancelled';
    await notifyBookingCancelled(booking, req.user?.name || 'Department Admin', reason);

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('cancelDepartmentBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
};

/**
 * 5. DEPARTMENT REPORTS
 */
const getDepartmentReports = async (req, res) => {
  try {
    const deptId = await resolveDeptId(req);
    const { startDate, endDate, status } = req.query;

    let where = 'WHERE h.DeptID = ?';
    const params = [deptId];

    if (startDate) {
      where += ' AND b.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND b.date <= ?';
      params.push(endDate);
    }
    if (status) {
      where += ' AND b.status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.hall_name, b.staff_name, b.staff_email, b.date, b.time_from, b.time_to, b.status, b.reason, b.created_at
       FROM bookings b
       JOIN halls h ON b.hall_id = h.HallID
       ${where}
       ORDER BY b.date DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getDepartmentReports error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch department reports' });
  }
};

const deleteDepartmentFaculty = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const [existing] = await pool.query('SELECT * FROM staff WHERE staff_id = ? AND department_id = ?', [id, deptId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Faculty not found in your department' });
    }
    await pool.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM notification_preferences WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM staff WHERE staff_id = ?', [id]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'FACULTY_DELETED',
      entityType: 'STAFF',
      entityId: Number(id),
      oldValue: existing[0],
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (err) {
    console.error('deleteDepartmentFaculty error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete faculty' });
  }
};

const deleteDepartmentVenue = async (req, res) => {
  const { id } = req.params;
  try {
    const deptId = await resolveDeptId(req);
    const [existing] = await pool.query('SELECT * FROM halls WHERE HallID = ? AND DeptID = ?', [id, deptId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Venue not found in your department' });
    }
    const [bookingRows] = await pool.query('SELECT COUNT(*) AS bookingCount FROM bookings WHERE hall_id = ?', [id]);
    if (bookingRows[0].bookingCount > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete venue with existing booking records' });
    }
    await pool.query('DELETE FROM venue_facility_mapping WHERE venue_id = ?', [id]);
    await pool.query('DELETE FROM halls WHERE HallID = ?', [id]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'VENUE_DELETED',
      entityType: 'VENUE',
      entityId: Number(id),
      oldValue: existing[0],
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Department venue deleted successfully' });
  } catch (err) {
    console.error('deleteDepartmentVenue error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete department venue' });
  }
};

module.exports = {
  getDepartmentDashboard,
  getDepartmentFaculty,
  addDepartmentFaculty,
  updateDepartmentFaculty,
  toggleFacultyStatus,
  deleteDepartmentFaculty,
  getDepartmentVenues,
  createDepartmentVenue,
  updateDepartmentVenue,
  deleteDepartmentVenue,
  getDepartmentBookings,
  approveDepartmentBooking,
  rejectDepartmentBooking,
  cancelDepartmentBooking,
  getDepartmentReports,
};
