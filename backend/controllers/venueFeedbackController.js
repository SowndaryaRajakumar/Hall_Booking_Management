const pool = require('../config/db');
const {
  createVenueFeedback,
  escalateFeedback,
  updateFeedbackStatus,
  notifySubmitter,
  getVenueFeedbackHistory,
  VALID_TYPES,
  VALID_PRIORITIES,
  VALID_STATUSES,
} = require('../services/venueFeedbackService');
const { getPagination, makePagination } = require('../utils/pagination');
const { normalizeRole } = require('../middlewares/permissionMiddleware');

const resolveCallerDeptId = async (user) => {
  if (!user) return null;
  if (user.departmentId) return Number(user.departmentId);
  if (user.department_id) return Number(user.department_id);
  const staffId = user.staffId || user.id;
  if (!staffId) return null;
  const [rows] = await pool.query('SELECT department_id FROM staff WHERE staff_id = ? LIMIT 1', [staffId]);
  return rows.length && rows[0].department_id ? Number(rows[0].department_id) : null;
};

/**
 * 1. GET /api/venue-feedback
 * Paginated list of complaints & feedback with role-based scoping and filters
 */
const getFeedbackList = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const whereClauses = [];
    const params = [];

    // Role-based visibility scoping
    if (userRole === 'FACULTY') {
      whereClauses.push('vf.submitted_by = ?');
      params.push(userId);
    } else if (userRole === 'DEPARTMENT_ADMIN') {
      const deptId = await resolveCallerDeptId(req.user);
      if (deptId) {
        whereClauses.push('(vf.department_id = ? OR h.DeptID = ?)');
        params.push(deptId, deptId);
      }
    } else if (userRole === 'MASTER_ADMIN') {
      // Master admin scope filtering:
      // 1. Common Venue complaints directly from Faculty
      // 2. Department Venue complaints ONLY after Department Admin escalation
      const scope = String(req.query.scope || 'all').toLowerCase();
      if (scope === 'common') {
        whereClauses.push("h.ownership_type = 'COMMON'");
      } else if (scope === 'department' || scope === 'escalated') {
        whereClauses.push("(h.ownership_type = 'DEPARTMENT' AND (vf.status = 'ESCALATED' OR vf.escalated_at IS NOT NULL))");
      } else {
        // 'all' scope: Common Venues + Escalated Department Venues
        whereClauses.push("(h.ownership_type = 'COMMON' OR (h.ownership_type = 'DEPARTMENT' AND (vf.status = 'ESCALATED' OR vf.escalated_at IS NOT NULL)))");
      }
    }

    if (req.query.venueId && req.query.venueId !== 'all') {
      whereClauses.push('vf.venue_id = ?');
      params.push(Number(req.query.venueId));
    }

    if (req.query.status && req.query.status !== 'all') {
      whereClauses.push('vf.status = ?');
      params.push(String(req.query.status).toUpperCase());
    }

    if (req.query.priority && req.query.priority !== 'all') {
      whereClauses.push('vf.priority = ?');
      params.push(String(req.query.priority).toUpperCase());
    }

    if (req.query.type && req.query.type !== 'all') {
      whereClauses.push('vf.type = ?');
      params.push(String(req.query.type).toUpperCase());
    }

    if (req.query.search?.trim()) {
      whereClauses.push('(vf.subject LIKE ? OR vf.description LIKE ? OR h.HallName LIKE ? OR s.full_name LIKE ?)');
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM venue_feedback vf
       JOIN halls h ON vf.venue_id = h.HallID
       JOIN staff s ON vf.submitted_by = s.staff_id
       ${whereStr}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT vf.*,
              h.HallName AS venue_name, h.Location AS venue_location, h.ownership_type, h.VenueType,
              h.DeptID AS venue_dept_id,
              d.DeptName AS department_name,
              s.full_name AS submitter_name, s.email AS submitter_email, s.role AS submitter_role,
              r.full_name AS resolver_name,
              esc.full_name AS escalator_name
       FROM venue_feedback vf
       JOIN halls h ON vf.venue_id = h.HallID
       LEFT JOIN departments d ON (vf.department_id = d.DeptID OR h.DeptID = d.DeptID)
       JOIN staff s ON vf.submitted_by = s.staff_id
       LEFT JOIN staff r ON vf.resolved_by = r.staff_id
       LEFT JOIN staff esc ON vf.escalated_by = esc.staff_id
       ${whereStr}
       ORDER BY
         CASE vf.status
           WHEN 'ESCALATED' THEN 1
           WHEN 'OPEN' THEN 2
           WHEN 'IN_PROGRESS' THEN 3
           WHEN 'RESOLVED' THEN 4
           WHEN 'CLOSED' THEN 5
           ELSE 6
         END,
         CASE vf.priority
           WHEN 'CRITICAL' THEN 1
           WHEN 'HIGH' THEN 2
           WHEN 'MEDIUM' THEN 3
           WHEN 'LOW' THEN 4
           ELSE 5
         END,
         vf.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (error) {
    console.error('Error fetching venue feedback list:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve feedback list', error: error.message });
  }
};

/**
 * 2. POST /api/venue-feedback
 * Submit a new complaint or feedback
 */
const createFeedback = async (req, res) => {
  try {
    const userId = req.user?.staffId || req.user?.id;
    const { venueId, type, priority, subject, description, relatedBookingId, feedbackDate, date } = req.body;

    const result = await createVenueFeedback({
      venueId: Number(venueId),
      type,
      priority,
      subject,
      description,
      relatedBookingId: relatedBookingId ? Number(relatedBookingId) : null,
      feedbackDate: feedbackDate || date || null,
      submittedBy: userId,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating venue feedback:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 3. POST /api/venue-feedback/:id/escalate
 * Department Admin escalates issue to Master Admin
 */
const escalateVenueFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalationReason, internalRemarks } = req.body;

    const result = await escalateFeedback({
      feedbackId: Number(id),
      escalationReason,
      internalRemarks,
      user: req.user,
    });

    res.json(result);
  } catch (error) {
    console.error('Error escalating feedback:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 4. GET /api/venue-feedback/:id
 * Retrieve single feedback issue with full details
 */
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT vf.*,
              h.HallName AS venue_name, h.Location AS venue_location, h.ownership_type, h.Capacity,
              d.DeptName AS department_name,
              s.full_name AS submitter_name, s.email AS submitter_email, s.phone AS submitter_phone,
              r.full_name AS resolver_name,
              esc.full_name AS escalator_name
       FROM venue_feedback vf
       JOIN halls h ON vf.venue_id = h.HallID
       LEFT JOIN departments d ON (vf.department_id = d.DeptID OR h.DeptID = d.DeptID)
       JOIN staff s ON vf.submitted_by = s.staff_id
       LEFT JOIN staff r ON vf.resolved_by = r.staff_id
       LEFT JOIN staff esc ON vf.escalated_by = esc.staff_id
       WHERE vf.id = ? LIMIT 1`,
      [Number(id)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Feedback record not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error retrieving feedback by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve feedback', error: error.message });
  }
};

/**
 * 5. PATCH /api/venue-feedback/:id/status
 * Update status, resolution, and internal remarks
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, internalRemarks } = req.body;
    const userId = req.user?.staffId || req.user?.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const result = await updateFeedbackStatus({
      feedbackId: Number(id),
      status,
      resolution,
      internalRemarks,
      resolvedBy: userId,
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 6. POST /api/venue-feedback/:id/notify
 * Manually trigger update notification (Email, WhatsApp, In-App) to submitter
 */
const notifySubmitterHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { channels, customMessage } = req.body;

    const result = await notifySubmitter({
      feedbackId: Number(id),
      channels: Array.isArray(channels) ? channels : ['in_app'],
      customMessage: customMessage || '',
      user: req.user,
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending submitter update:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 7. PUT /api/venue-feedback/:id
 * Edit feedback record
 */
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, priority, subject, description } = req.body;

    const [rows] = await pool.query('SELECT id, submitted_by FROM venue_feedback WHERE id = ?', [Number(id)]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    if (userRole !== 'MASTER_ADMIN' && Number(rows[0].submitted_by) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own feedback submission.' });
    }

    await pool.query(
      `UPDATE venue_feedback
       SET type = COALESCE(?, type),
           priority = COALESCE(?, priority),
           subject = COALESCE(?, subject),
           description = COALESCE(?, description),
           updated_at = NOW()
       WHERE id = ?`,
      [type || null, priority || null, subject || null, description || null, Number(id)]
    );

    res.json({ success: true, message: 'Feedback record updated successfully.' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 8. DELETE /api/venue-feedback/:id
 */
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const [rows] = await pool.query('SELECT submitted_by FROM venue_feedback WHERE id = ?', [Number(id)]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    if (userRole !== 'MASTER_ADMIN' && Number(rows[0].submitted_by) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this feedback.' });
    }

    await pool.query('DELETE FROM venue_feedback WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. GET /api/venue-feedback/venue/:venueId/history
 */
const getVenueHistory = async (req, res) => {
  try {
    const { venueId } = req.params;
    const history = await getVenueFeedbackHistory(venueId);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching venue history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve venue history', error: error.message });
  }
};

module.exports = {
  getFeedbackList,
  createFeedback,
  escalateVenueFeedback,
  getFeedbackById,
  updateStatus,
  notifySubmitterHandler,
  updateFeedback,
  deleteFeedback,
  getVenueHistory,
};
