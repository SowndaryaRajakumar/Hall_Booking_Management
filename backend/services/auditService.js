const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

/**
 * Service to record and fetch booking audit trails.
 */

const logBookingAction = async ({
  bookingId,
  userId,
  action,
  oldStatus = null,
  newStatus = null,
  details = null,
}) => {
  try {
    if (!bookingId || !userId || !action) {
      console.warn('logBookingAction: missing required fields (bookingId, userId, or action).');
      return null;
    }

    const [result] = await pool.query(
      `INSERT INTO booking_audit_logs (booking_id, user_id, action, old_status, new_status, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [bookingId, userId, action, oldStatus, newStatus, details]
    );

    return result.insertId;
  } catch (error) {
    console.error('Failed to write booking audit log:', error);
    return null;
  }
};

const getBookingAuditLogs = async (bookingId, reqUser) => {
  // 1. Verify access: Faculty can only view audit trail of their own booking
  const [bookingRows] = await pool.query(
    `SELECT id, staff_email, staff_id, hall_name, date, time_from, time_to, status FROM bookings WHERE id = ?`,
    [bookingId]
  );

  if (!bookingRows.length) {
    return { status: 404, message: 'Booking not found' };
  }

  const booking = bookingRows[0];
  const role = String(reqUser?.role || '').toLowerCase();
  const userEmail = reqUser?.email;
  const staffId = reqUser?.staffId;

  if (role !== 'admin') {
    const isOwner =
      (userEmail && booking.staff_email === userEmail) ||
      (staffId && Number(booking.staff_id) === Number(staffId));

    if (!isOwner) {
      return { status: 403, message: 'You are not authorized to view the audit history for this booking.' };
    }
  }

  // 2. Fetch logs with actor details
  const [logs] = await pool.query(
    `SELECT
       a.id,
       a.booking_id,
       a.user_id,
       a.action,
       a.old_status,
       a.new_status,
       a.details,
       a.created_at,
       s.full_name AS actor_name,
       s.email AS actor_email,
       s.role AS actor_role
     FROM booking_audit_logs a
     LEFT JOIN staff s ON a.user_id = s.staff_id
     WHERE a.booking_id = ?
     ORDER BY a.created_at ASC`,
    [bookingId]
  );

  return {
    status: 200,
    booking,
    logs: logs.map((log) => ({
      id: log.id,
      bookingId: log.booking_id,
      userId: log.user_id,
      action: log.action,
      oldStatus: log.old_status,
      newStatus: log.new_status,
      details: log.details,
      createdAt: log.created_at,
      actorName: log.actor_name || 'System / Staff',
      actorEmail: log.actor_email || '',
      actorRole: log.actor_role || 'staff',
    })),
  };
};

const getAllAuditLogs = async (queryParams, reqUser) => {
  const role = String(reqUser?.role || '').toLowerCase();
  if (role !== 'admin') {
    return { status: 403, message: 'Only administrators can view all audit logs.' };
  }

  const { page, limit, offset } = getPagination(queryParams);
  const actionFilter = String(queryParams.action || '').trim();
  const search = String(queryParams.search || '').trim();

  let where = 'WHERE 1=1';
  const params = [];

  if (actionFilter) {
    where += ' AND a.action = ?';
    params.push(actionFilter);
  }

  if (search) {
    where += ' AND (b.hall_name LIKE ? OR s.full_name LIKE ? OR CAST(a.booking_id AS CHAR) LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM booking_audit_logs a
     LEFT JOIN bookings b ON a.booking_id = b.id
     LEFT JOIN staff s ON a.user_id = s.staff_id
     ${where}`,
    params
  );

  const [logs] = await pool.query(
    `SELECT
       a.id,
       a.booking_id,
       a.user_id,
       a.action,
       a.old_status,
       a.new_status,
       a.details,
       a.created_at,
       b.hall_name,
       b.date AS booking_date,
       s.full_name AS actor_name,
       s.email AS actor_email,
       s.role AS actor_role
     FROM booking_audit_logs a
     LEFT JOIN bookings b ON a.booking_id = b.id
     LEFT JOIN staff s ON a.user_id = s.staff_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    status: 200,
    data: logs,
    pagination: makePagination({ page, limit, total: countRow.total }),
  };
};

/**
 * Log administrative or system actions (venues, admins, departments, permissions, etc.)
 */
const logSystemAction = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO system_audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
      ]
    );
    return result.insertId;
  } catch (err) {
    console.error('Failed to write system audit log:', err);
    return null;
  }
};

/**
 * Fetch system audit logs with filtering and pagination
 */
const getSystemAuditLogs = async (queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const action = String(queryParams.action || '').trim();
  const entityType = String(queryParams.entityType || '').trim();
  const search = String(queryParams.search || '').trim();

  let where = 'WHERE 1=1';
  const params = [];

  if (action) {
    where += ' AND sal.action = ?';
    params.push(action);
  }

  if (entityType) {
    where += ' AND sal.entity_type = ?';
    params.push(entityType);
  }

  if (search) {
    where += ' AND (sal.action LIKE ? OR sal.entity_type LIKE ? OR s.full_name LIKE ? OR s.email LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM system_audit_logs sal
     LEFT JOIN staff s ON sal.user_id = s.staff_id
     ${where}`,
    params
  );

  const [logs] = await pool.query(
    `SELECT
       sal.id,
       sal.user_id,
       sal.action,
       sal.entity_type,
       sal.entity_id,
       sal.old_value,
       sal.new_value,
       sal.ip_address,
       sal.created_at,
       s.full_name AS actor_name,
       s.email AS actor_email,
       s.role AS actor_role
     FROM system_audit_logs sal
     LEFT JOIN staff s ON sal.user_id = s.staff_id
     ${where}
     ORDER BY sal.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    status: 200,
    data: logs,
    pagination: makePagination({ page, limit, total: countRow.total }),
  };
};

module.exports = {
  logBookingAction,
  getBookingAuditLogs,
  getAllAuditLogs,
  logSystemAction,
  getSystemAuditLogs,
};
