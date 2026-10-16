const pool = require('../config/db');
const {
  createAcademicAllocation,
  updateAcademicAllocation,
  getAcademicCalendarOccurrences,
  setOccurrenceRemarkAndStatus,
  detectAcademicAllocationConflicts,
} = require('../services/academicService');
const { getPagination, makePagination } = require('../utils/pagination');
const { normalizeRole } = require('../middlewares/permissionMiddleware');
const { createNotification } = require('../services/notificationService');
const whatsappService = require('../services/whatsappService');

/**
 * 1. GET /api/academic-calendar (or /api/academic-allocations/calendar)
 * Returns calendar occurrences expanded dynamically from recurring rules + overrides
 */
const getCalendar = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const {
      startDate,
      endDate,
      facultyId,
      departmentId,
      venueId,
      status,
    } = req.query;

    // Default to current month if dates not provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);

    const effectiveStart = startDate || defaultStart;
    const effectiveEnd = endDate || defaultEnd;

    let targetFacultyId = null;
    let targetDeptId = null;
    let targetVenueId = venueId ? Number(venueId) : null;

    if (userRole === 'FACULTY') {
      // Faculty ONLY views their own schedule
      targetFacultyId = userId;
    } else if (userRole === 'DEPARTMENT_ADMIN') {
      // Department Admin views their department's schedule or specific faculty/venue
      targetDeptId = req.userDepartmentId || req.user?.departmentId;
      if (facultyId) targetFacultyId = Number(facultyId);
      if (departmentId && Number(departmentId) === Number(targetDeptId)) {
        targetDeptId = Number(departmentId);
      }
    } else {
      // Master Admin can filter arbitrarily
      if (facultyId) targetFacultyId = Number(facultyId);
      if (departmentId) targetDeptId = Number(departmentId);
    }

    const occurrences = await getAcademicCalendarOccurrences({
      facultyId: targetFacultyId,
      departmentId: targetDeptId,
      venueId: targetVenueId,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      status: status || null,
    });

    res.json({
      success: true,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      count: occurrences.length,
      occurrences,
    });
  } catch (error) {
    console.error('Error fetching academic calendar:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch academic calendar', error: error.message });
  }
};

/**
 * 2. POST /api/academic-allocations
 * Creates a new recurring Academic Semester Allocation
 */
const createAllocation = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const {
      venueId,
      academicYear,
      semester,
      subjectName,
      subjectCode,
      yearOfStudy,
      section,
      startDate,
      endDate,
      purpose,
      rules,
      departmentId,
    } = req.body;

    let targetFacultyId;
    if (userRole === 'FACULTY') {
      // Faculty is strictly locked to their own ID
      targetFacultyId = userId;
    } else {
      // Admin can specify faculty or default to self
      targetFacultyId = req.body.facultyId ? Number(req.body.facultyId) : userId;
    }

    let targetDeptId = departmentId || null;
    if (userRole === 'DEPARTMENT_ADMIN') {
      targetDeptId = req.userDepartmentId || req.user?.departmentId || targetDeptId;
    }

    const result = await createAcademicAllocation({
      facultyId: targetFacultyId,
      departmentId: targetDeptId,
      venueId: Number(venueId),
      academicYear,
      semester,
      subjectName,
      subjectCode: subjectCode || '',
      yearOfStudy,
      section,
      startDate,
      endDate,
      purpose: purpose || '',
      rules: rules || [],
      user: req.user,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating academic allocation:', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create academic allocation',
      conflict: error.conflict || null,
    });
  }
};

/**
 * 3. GET /api/academic-allocations
 * List allocations with pagination & filters
 */
const getAllocations = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;
    const { page, limit, offset } = getPagination(req.query);

    const whereClauses = [];
    const params = [];

    if (userRole === 'FACULTY') {
      whereClauses.push('aa.faculty_id = ?');
      params.push(userId);
    } else if (userRole === 'DEPARTMENT_ADMIN') {
      const deptId = req.userDepartmentId || req.user?.departmentId;
      if (deptId) {
        whereClauses.push('(aa.department_id = ? OR h.DeptID = ?)');
        params.push(deptId, deptId);
      }
      if (req.query.facultyId) {
        whereClauses.push('aa.faculty_id = ?');
        params.push(Number(req.query.facultyId));
      }
    } else {
      // MASTER_ADMIN
      if (req.query.facultyId) {
        whereClauses.push('aa.faculty_id = ?');
        params.push(Number(req.query.facultyId));
      }
      if (req.query.departmentId) {
        whereClauses.push('(aa.department_id = ? OR h.DeptID = ?)');
        params.push(Number(req.query.departmentId), Number(req.query.departmentId));
      }
    }

    if (req.query.venueId) {
      whereClauses.push('aa.venue_id = ?');
      params.push(Number(req.query.venueId));
    }

    if (req.query.status) {
      whereClauses.push('aa.status = ?');
      params.push(String(req.query.status).toUpperCase());
    }

    if (req.query.academicYear) {
      whereClauses.push('aa.academic_year = ?');
      params.push(String(req.query.academicYear));
    }

    if (req.query.semester) {
      whereClauses.push('aa.semester = ?');
      params.push(String(req.query.semester));
    }

    if (req.query.search?.trim()) {
      whereClauses.push('(aa.subject_name LIKE ? OR aa.subject_code LIKE ? OR h.HallName LIKE ? OR s.full_name LIKE ?)');
      const term = `%${req.query.search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM academic_allocations aa
       JOIN halls h ON aa.venue_id = h.HallID
       JOIN staff s ON aa.faculty_id = s.staff_id
       ${whereStr}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT aa.id, aa.faculty_id, aa.department_id, aa.venue_id, aa.academic_year,
              aa.semester, aa.subject_name, aa.subject_code, aa.year_of_study, aa.section,
              aa.start_date, aa.end_date, aa.purpose, aa.status, aa.rejection_reason,
              aa.approved_by, aa.approved_at, aa.created_at, aa.updated_at,
              h.HallName AS venue_name, h.Location AS venue_location, h.ownership_type,
              s.full_name AS faculty_name, s.email AS faculty_email,
              d.DeptName AS department_name,
              appr.full_name AS approved_by_name
       FROM academic_allocations aa
       JOIN halls h ON aa.venue_id = h.HallID
       JOIN staff s ON aa.faculty_id = s.staff_id
       LEFT JOIN departments d ON aa.department_id = d.DeptID
       LEFT JOIN staff appr ON aa.approved_by = appr.staff_id
       ${whereStr}
       ORDER BY aa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Hydrate rules for each allocation
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const [rules] = await pool.query(
        `SELECT allocation_id, day_of_week, day_index, period_id, start_time, end_time
         FROM academic_allocation_rules
         WHERE allocation_id IN (?)
         ORDER BY day_index, period_id`,
        [ids]
      );
      const ruleMap = new Map();
      rules.forEach((rule) => {
        if (!ruleMap.has(rule.allocation_id)) ruleMap.set(rule.allocation_id, []);
        ruleMap.get(rule.allocation_id).push(rule);
      });

      rows.forEach((r) => {
        r.rules = ruleMap.get(r.id) || [];
      });
    }

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (error) {
    console.error('Error fetching academic allocations:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve allocations', error: error.message });
  }
};

/**
 * 4. GET /api/academic-allocations/:id
 * Single allocation details with rules and overrides
 */
const getAllocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const [rows] = await pool.query(
      `SELECT aa.*, h.HallName AS venue_name, h.Location AS venue_location, h.ownership_type, h.DeptID AS venue_dept_id,
              s.full_name AS faculty_name, s.email AS faculty_email, s.phone AS faculty_phone,
              d.DeptName AS department_name, appr.full_name AS approved_by_name
       FROM academic_allocations aa
       JOIN halls h ON aa.venue_id = h.HallID
       JOIN staff s ON aa.faculty_id = s.staff_id
       LEFT JOIN departments d ON aa.department_id = d.DeptID
       LEFT JOIN staff appr ON aa.approved_by = appr.staff_id
       WHERE aa.id = ? LIMIT 1`,
      [Number(id)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Academic allocation not found.' });
    }
    const alloc = rows[0];

    // Authorization checks
    if (userRole === 'FACULTY' && Number(alloc.faculty_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own allocations.' });
    }
    if (userRole === 'DEPARTMENT_ADMIN') {
      const deptId = req.userDepartmentId || req.user?.departmentId;
      if (deptId && Number(alloc.department_id) !== Number(deptId) && Number(alloc.venue_dept_id) !== Number(deptId)) {
        return res.status(403).json({ success: false, message: 'Access denied to allocations outside your department.' });
      }
    }

    // Rules
    const [rules] = await pool.query(
      'SELECT id, day_of_week, day_index, period_id, start_time, end_time FROM academic_allocation_rules WHERE allocation_id = ? ORDER BY day_index, period_id',
      [alloc.id]
    );

    // Overrides
    const [overrides] = await pool.query(
      `SELECT o.id, DATE_FORMAT(o.occurrence_date, '%Y-%m-%d') AS occurrence_date, o.period_id,
              o.status, o.remark, o.alternate_faculty_id, alt.full_name AS alternate_faculty_name, o.updated_at
       FROM academic_allocation_occurrences o
       LEFT JOIN staff alt ON o.alternate_faculty_id = alt.staff_id
       WHERE o.allocation_id = ?
       ORDER BY o.occurrence_date DESC`,
      [alloc.id]
    );

    alloc.rules = rules;
    alloc.overrides = overrides;

    res.json({ success: true, data: alloc });
  } catch (error) {
    console.error('Error fetching allocation by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve allocation', error: error.message });
  }
};

/**
 * 5. PATCH /api/academic-allocations/:id/status
 * Approves or Rejects an academic allocation
 */
const updateAllocationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(String(status).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be APPROVED, REJECTED, or CANCELLED.' });
    }

    const newStatus = String(status).toUpperCase();

    const [rows] = await pool.query(
      `SELECT aa.*, h.HallName AS venue_name, h.ownership_type, h.DeptID AS venue_dept_id, s.full_name AS faculty_name, s.email AS faculty_email, s.phone AS faculty_phone
       FROM academic_allocations aa
       JOIN halls h ON aa.venue_id = h.HallID
       JOIN staff s ON aa.faculty_id = s.staff_id
       WHERE aa.id = ? LIMIT 1`,
      [Number(id)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Allocation not found.' });
    }
    const alloc = rows[0];

    // Permissions:
    // Faculty can only CANCEL their own allocation
    if (userRole === 'FACULTY') {
      if (Number(alloc.faculty_id) !== Number(userId)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (newStatus !== 'CANCELLED') {
        return res.status(403).json({ success: false, message: 'Faculty may only cancel their allocation.' });
      }
    }

    // Department Admin can only approve/reject department-owned venues of their department
    if (userRole === 'DEPARTMENT_ADMIN') {
      const deptId = req.userDepartmentId || req.user?.departmentId;
      if (alloc.ownership_type === 'COMMON') {
        return res.status(403).json({ success: false, message: 'Only Master Admin can approve allocations for Common Venues.' });
      }
      if (deptId && Number(alloc.venue_dept_id) !== Number(deptId)) {
        return res.status(403).json({ success: false, message: 'You cannot manage venues belonging to another department.' });
      }
    }

    await pool.query(
      `UPDATE academic_allocations
       SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [newStatus, reason || null, newStatus === 'APPROVED' ? userId : null, alloc.id]
    );

    // Notify Faculty
    try {
      const title = `Academic Allocation ${newStatus === 'APPROVED' ? 'Approved' : newStatus === 'REJECTED' ? 'Rejected' : 'Cancelled'}`;
      const msg = `Your allocation request for ${alloc.subject_name} at ${alloc.venue_name} has been ${newStatus.toLowerCase()}.${reason ? ' Reason: ' + reason : ''}`;

      await createNotification({
        userId: alloc.faculty_id,
        title,
        message: msg,
        type: `academic_allocation_${newStatus.toLowerCase()}`,
      });

      if (alloc.faculty_phone) {
        await whatsappService.sendWhatsAppMessage({
          to: alloc.faculty_phone,
          userId: alloc.faculty_id,
          message: `${newStatus === 'APPROVED' ? '✅' : '⚠️'} *NEC Venue Portal: Academic Allocation Update*\n\nDear ${alloc.faculty_name},\nYour semester allocation request for *${alloc.subject_name}* at *${alloc.venue_name}* is now *${newStatus}*.\n${reason ? 'Note: ' + reason : ''}`,
        });
      }
    } catch (notifErr) {
      console.warn('Notification warning:', notifErr.message);
    }

    res.json({ success: true, message: `Allocation marked as ${newStatus}.`, status: newStatus });
  } catch (error) {
    console.error('Error updating allocation status:', error);
    res.status(500).json({ success: false, message: 'Failed to update allocation status', error: error.message });
  }
};

/**
 * 6. DELETE /api/academic-allocations/:id
 * Cancels or deletes allocation
 */
const deleteAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user?.role);
    const userId = req.user?.staffId || req.user?.id;

    const [rows] = await pool.query('SELECT faculty_id FROM academic_allocations WHERE id = ?', [Number(id)]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Allocation not found.' });
    }

    if (userRole === 'FACULTY' && Number(rows[0].faculty_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own allocation.' });
    }

    await pool.query('DELETE FROM academic_allocations WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Academic allocation deleted successfully.' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ success: false, message: 'Failed to delete allocation', error: error.message });
  }
};

/**
 * 7. POST /api/academic-allocations/:id/occurrences/:date/remark
 * or PATCH /api/academic-allocations/:id/occurrences/:date/status
 * Sets status, remark, and optional alternate faculty for an individual occurrence
 */
const updateOccurrence = async (req, res) => {
  try {
    const { id, date } = req.params;
    const { periodId, status, remark, alternateFacultyId } = req.body;

    if (!periodId) {
      return res.status(400).json({ success: false, message: 'periodId is required.' });
    }

    const result = await setOccurrenceRemarkAndStatus({
      allocationId: id,
      occurrenceDate: date,
      periodId,
      status: status || 'SCHEDULED',
      remark: remark || '',
      alternateFacultyId: alternateFacultyId ? Number(alternateFacultyId) : null,
      user: req.user,
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating occurrence remark:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * 6. GET /api/academic-allocations/venue-history
 * Faculty historical and recent venue usage
 */
const { getFacultyVenueUsageHistory } = require('../services/venueHistoryService');

const getVenueUsageHistory = async (req, res) => {
  try {
    const facultyId = req.user?.staffId || req.user?.id;
    const facultyEmail = req.user?.email;
    const { fromDate, toDate, venueId, departmentId, bookingType, status } = req.query;

    const result = await getFacultyVenueUsageHistory({
      facultyId,
      facultyEmail,
      fromDate,
      toDate,
      venueId,
      departmentId,
      bookingType,
      status,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching faculty venue usage history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve venue usage history', error: error.message });
  }
};

/**
 * 7. PUT /api/academic-allocations/:id
 * Updates an academic allocation (venue, rules, details) and verifies conflicts
 */
const updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      venueId,
      subjectName,
      subjectCode,
      yearOfStudy,
      section,
      academicYear,
      semester,
      startDate,
      endDate,
      purpose,
      rules,
    } = req.body;

    const result = await updateAcademicAllocation({
      allocationId: id,
      venueId,
      subjectName,
      subjectCode,
      yearOfStudy,
      section,
      academicYear,
      semester,
      startDate,
      endDate,
      purpose,
      rules,
      user: req.user,
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating academic allocation:', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update academic allocation',
      conflict: error.conflict || null,
    });
  }
};

module.exports = {
  getCalendar,
  createAllocation,
  updateAllocation,
  getAllocations,
  getAllocationById,
  updateAllocationStatus,
  deleteAllocation,
  updateOccurrence,
  getVenueUsageHistory,
};
