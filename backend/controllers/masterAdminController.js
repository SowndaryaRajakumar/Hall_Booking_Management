const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { getPagination, makePagination } = require('../utils/pagination');
const { logSystemAction, getSystemAuditLogs } = require('../services/auditService');
const { getUserPreferences, updatePreferences } = require('../services/notificationService');

/**
 * 1. MASTER ADMIN DASHBOARD METRICS
 */
const getMasterAdminDashboard = async (req, res) => {
  try {
    const [[deptsRow]] = await pool.query('SELECT COUNT(*) AS total FROM departments WHERE IsActive = 1');
    const [[deptAdminsRow]] = await pool.query("SELECT COUNT(*) AS total FROM staff WHERE role = 'DEPARTMENT_ADMIN'");
    const [[facultyRow]] = await pool.query("SELECT COUNT(*) AS total FROM staff WHERE role IN ('FACULTY', 'staff')");
    const [[allVenuesRow]] = await pool.query('SELECT COUNT(*) AS total FROM halls');
    const [[commonVenuesRow]] = await pool.query("SELECT COUNT(*) AS total FROM halls WHERE ownership_type = 'COMMON'");
    const [[deptVenuesRow]] = await pool.query("SELECT COUNT(*) AS total FROM halls WHERE ownership_type = 'DEPARTMENT'");
    const [[activeVenuesRow]] = await pool.query('SELECT COUNT(*) AS total FROM halls WHERE ActiveStatus = 1');

    const [[todaysBookingsRow]] = await pool.query(
      'SELECT COUNT(*) AS total FROM bookings WHERE DATE(date) = CURDATE()'
    );
    const [[pendingRow]] = await pool.query("SELECT COUNT(*) AS total FROM bookings WHERE status = 'Pending'");
    const [[approvedRow]] = await pool.query("SELECT COUNT(*) AS total FROM bookings WHERE status = 'Approved'");
    const [[cancelledRow]] = await pool.query("SELECT COUNT(*) AS total FROM bookings WHERE status = 'Cancelled'");

    const [recentBookings] = await pool.query(
      `SELECT b.id, b.hall_name, b.staff_name, b.staff_email, b.date, b.time_from, b.time_to, b.status, b.reason, b.created_at,
              h.ownership_type, d.DeptName AS department
       FROM bookings b
       LEFT JOIN halls h ON b.hall_id = h.HallID
       LEFT JOIN departments d ON h.DeptID = d.DeptID
       ORDER BY b.created_at DESC
       LIMIT 10`
    );

    const [[academicAllocsRow]] = await pool.query('SELECT COUNT(*) AS total FROM academic_allocations');
    const [[pendingAcademicRow]] = await pool.query("SELECT COUNT(*) AS total FROM academic_allocations WHERE status = 'PENDING'");
    const [[openComplaintsRow]] = await pool.query("SELECT COUNT(*) AS total FROM venue_feedback WHERE status IN ('OPEN', 'IN_PROGRESS')");
    const [[highPriorityIssuesRow]] = await pool.query("SELECT COUNT(*) AS total FROM venue_feedback WHERE priority IN ('HIGH', 'CRITICAL') AND status IN ('OPEN', 'IN_PROGRESS')");

    const [recentVenueFeedback] = await pool.query(
      `SELECT vf.id, vf.type, vf.priority, vf.status, vf.subject, vf.created_at, h.HallName AS venue_name, s.full_name AS submitter_name
       FROM venue_feedback vf
       JOIN halls h ON vf.venue_id = h.HallID
       JOIN staff s ON vf.submitted_by = s.staff_id
       ORDER BY vf.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        totalDepartments: deptsRow.total || 0,
        totalDepartmentAdmins: deptAdminsRow.total || 0,
        totalFaculty: facultyRow.total || 0,
        totalVenues: allVenuesRow.total || 0,
        commonVenues: commonVenuesRow.total || 0,
        departmentVenues: deptVenuesRow.total || 0,
        activeVenues: activeVenuesRow.total || 0,
        todaysBookings: todaysBookingsRow.total || 0,
        pendingRequests: pendingRow.total || 0,
        approvedBookings: approvedRow.total || 0,
        cancelledBookings: cancelledRow.total || 0,
        academicAllocations: academicAllocsRow.total || 0,
        pendingAcademicAllocations: pendingAcademicRow.total || 0,
        openVenueComplaints: openComplaintsRow.total || 0,
        highPriorityIssues: highPriorityIssuesRow.total || 0,
        recentVenueFeedback,
        recentBookings,
      },
    });
  } catch (err) {
    console.error('Error in getMasterAdminDashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics' });
  }
};

/**
 * 2. DEPARTMENT ADMIN MANAGEMENT
 */
const getDepartmentAdmins = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const search = req.query.search?.trim();

  try {
    let where = "WHERE s.role = 'DEPARTMENT_ADMIN'";
    const params = [];

    if (search) {
      where += ' AND (s.full_name LIKE ? OR s.email LIKE ? OR d.DeptName LIKE ? OR s.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM staff s LEFT JOIN departments d ON s.department_id = d.DeptID ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT s.staff_id, s.full_name, s.email, s.phone, s.department, s.department_id, s.designation,
              s.employee_id, s.status, s.role, s.created_at, d.DeptName, d.DeptCode
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.DeptID
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
    console.error('Error in getDepartmentAdmins:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch department admins' });
  }
};

const createDepartmentAdmin = async (req, res) => {
  try {
    const { fullName, email, password, departmentId, phone, designation, employeeId } = req.body;

    if (!fullName || !email || !password || !departmentId) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and department are required' });
    }

    const [existing] = await pool.query('SELECT staff_id FROM staff WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const [deptRows] = await pool.query('SELECT DeptID, DeptName FROM departments WHERE DeptID = ?', [departmentId]);
    if (!deptRows.length) {
      return res.status(404).json({ success: false, message: 'Specified department does not exist' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO staff (full_name, email, password, department, department_id, role, status, is_first_login, phone, designation, employee_id)
       VALUES (?, ?, ?, ?, ?, 'DEPARTMENT_ADMIN', 'active', 1, ?, ?, ?)`,
      [
        fullName.trim(),
        email.trim(),
        hashedPassword,
        deptRows[0].DeptName,
        departmentId,
        phone || null,
        designation || null,
        employeeId || null,
      ]
    );

    const adminId = result.insertId;

    // Seed default role-level permissions to user_permissions as defaults
    const [rolePerms] = await pool.query(
      "SELECT permission_id, enabled FROM role_permissions WHERE role = 'DEPARTMENT_ADMIN'"
    );
    for (const rp of rolePerms) {
      await pool.query(
        'INSERT IGNORE INTO user_permissions (user_id, permission_id, enabled) VALUES (?, ?, ?)',
        [adminId, rp.permission_id, rp.enabled]
      );
    }

    // Default notification preferences
    await pool.query('INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled) VALUES (?, 1, 1)', [adminId]);

    // Log action
    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'ADMIN_CREATED',
      entityType: 'STAFF',
      entityId: adminId,
      newValue: { fullName, email, department: deptRows[0].DeptName, role: 'DEPARTMENT_ADMIN' },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Department Admin created successfully',
      adminId,
    });
  } catch (err) {
    console.error('Error in createDepartmentAdmin:', err);
    res.status(500).json({ success: false, message: 'Failed to create department admin' });
  }
};

const updateDepartmentAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const { fullName, email, departmentId, phone, designation, employeeId } = req.body;

    const [adminRows] = await pool.query('SELECT * FROM staff WHERE staff_id = ? AND role = ?', [id, 'DEPARTMENT_ADMIN']);
    if (!adminRows.length) {
      return res.status(404).json({ success: false, message: 'Department Admin not found' });
    }

    let deptName = adminRows[0].department;
    if (departmentId && Number(departmentId) !== Number(adminRows[0].department_id)) {
      const [dRows] = await pool.query('SELECT DeptName FROM departments WHERE DeptID = ?', [departmentId]);
      if (dRows.length) deptName = dRows[0].DeptName;
    }

    await pool.query(
      `UPDATE staff
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           department_id = COALESCE(?, department_id),
           department = ?,
           phone = COALESCE(?, phone),
           designation = COALESCE(?, designation),
           employee_id = COALESCE(?, employee_id)
       WHERE staff_id = ?`,
      [
        fullName?.trim() || null,
        email?.trim() || null,
        departmentId || null,
        deptName,
        phone || null,
        designation || null,
        employeeId || null,
        id,
      ]
    );

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'ADMIN_UPDATED',
      entityType: 'STAFF',
      entityId: Number(id),
      oldValue: adminRows[0],
      newValue: { fullName, email, departmentId, deptName, phone },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Department Admin updated successfully' });
  } catch (err) {
    console.error('Error in updateDepartmentAdmin:', err);
    res.status(500).json({ success: false, message: 'Failed to update department admin' });
  }
};

const toggleAdminStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT staff_id, full_name, email, status FROM staff WHERE staff_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Admin not found' });

    const currentStatus = rows[0].status || 'active';
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await pool.query('UPDATE staff SET status = ?, auth_version = auth_version + 1 WHERE staff_id = ?', [nextStatus, id]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: nextStatus === 'active' ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      entityType: 'STAFF',
      entityId: Number(id),
      oldValue: { status: currentStatus },
      newValue: { status: nextStatus },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Department Admin has been ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`,
      status: nextStatus,
    });
  } catch (err) {
    console.error('Error in toggleAdminStatus:', err);
    res.status(500).json({ success: false, message: 'Failed to update admin status' });
  }
};

const resetAdminPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE staff SET password = ?, auth_version = auth_version + 1 WHERE staff_id = ?', [hashedPassword, id]);

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'STAFF',
      entityId: Number(id),
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Error in resetAdminPassword:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

/**
 * 3. PERMISSION & ACCESS MANAGEMENT
 */
const getAllPermissions = async (req, res) => {
  try {
    const [perms] = await pool.query('SELECT * FROM permissions ORDER BY category ASC, id ASC');
    res.json({ success: true, data: perms });
  } catch (err) {
    console.error('Error in getAllPermissions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
  }
};

const getAdminPermissions = async (req, res) => {
  const { id } = req.params;
  try {
    const [adminRows] = await pool.query('SELECT staff_id, full_name, email, role, department FROM staff WHERE staff_id = ?', [id]);
    if (!adminRows.length) return res.status(404).json({ success: false, message: 'Admin not found' });

    const admin = adminRows[0];
    const [allPerms] = await pool.query('SELECT * FROM permissions ORDER BY category ASC, id ASC');

    const [userPerms] = await pool.query('SELECT permission_id, enabled FROM user_permissions WHERE user_id = ?', [id]);
    const userMap = new Map();
    userPerms.forEach((up) => userMap.set(up.permission_id, Boolean(up.enabled)));

    const [rolePerms] = await pool.query("SELECT permission_id, enabled FROM role_permissions WHERE role = 'DEPARTMENT_ADMIN'");
    const roleMap = new Map();
    rolePerms.forEach((rp) => roleMap.set(rp.permission_id, Boolean(rp.enabled)));

    const permissions = allPerms.map((perm) => {
      const isCustomized = userMap.has(perm.id);
      const enabled = isCustomized ? userMap.get(perm.id) : (roleMap.get(perm.id) || false);
      return {
        id: perm.id,
        key: perm.permission_key,
        name: perm.permission_name,
        category: perm.category,
        description: perm.description,
        enabled,
        isCustomized,
      };
    });

    res.json({ success: true, admin, permissions });
  } catch (err) {
    console.error('Error in getAdminPermissions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin permissions' });
  }
};

const updateAdminPermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // Array of { id, key, enabled }

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'Permissions array required' });
  }

  try {
    for (const p of permissions) {
      let permId = p.id;
      if (!permId && p.key) {
        const [pRows] = await pool.query('SELECT id FROM permissions WHERE permission_key = ?', [p.key]);
        if (pRows.length) permId = pRows[0].id;
      }

      if (permId) {
        await pool.query(
          `INSERT INTO user_permissions (user_id, permission_id, enabled)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
          [id, permId, p.enabled ? 1 : 0]
        );
      }
    }

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'PERMISSIONS_CHANGED',
      entityType: 'STAFF',
      entityId: Number(id),
      newValue: permissions,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (err) {
    console.error('Error in updateAdminPermissions:', err);
    res.status(500).json({ success: false, message: 'Failed to update permissions' });
  }
};

/**
 * 4. VENUE MANAGEMENT (COMMON & DEPARTMENT VENUES)
 */
const getVenues = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const ownershipType = req.query.ownershipType;
  const venueType = req.query.venueType;
  const search = req.query.search?.trim();

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (ownershipType) {
      where += ' AND h.ownership_type = ?';
      params.push(ownershipType);
    }
    if (venueType) {
      where += ' AND h.VenueType = ?';
      params.push(venueType);
    }
    if (search) {
      where += ' AND (h.HallName LIKE ? OR h.Location LIKE ? OR d.DeptName LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM halls h LEFT JOIN departments d ON h.DeptID = d.DeptID ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.VenueType, h.ownership_type, h.category,
              h.approval_role, h.DeptID, h.ActiveStatus, h.ImageURL, d.DeptName, d.DeptCode
       FROM halls h
       LEFT JOIN departments d ON h.DeptID = d.DeptID
       ${where}
       ORDER BY h.ownership_type ASC, h.HallName ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: makePagination({ page, limit, total: countRow.total }),
    });
  } catch (err) {
    console.error('Error in getVenues:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch venues' });
  }
};

const createVenue = async (req, res) => {
  try {
    const {
      hallName,
      location,
      capacity,
      deptId,
      venueType,
      ownershipType = 'DEPARTMENT',
      category,
      approvalRole = 'DEPARTMENT_ADMIN',
    } = req.body;

    if (!hallName || !location || !capacity) {
      return res.status(400).json({ success: false, message: 'Hall name, location, and capacity are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO halls (HallName, Location, Capacity, DeptID, VenueType, ownership_type, category, approval_role, ActiveStatus, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        hallName.trim(),
        location.trim(),
        capacity,
        deptId || 1, // Fallback default department
        venueType || 'Classroom',
        ownershipType,
        category || venueType || 'Common',
        ownershipType === 'COMMON' ? (approvalRole || 'MASTER_ADMIN') : 'DEPARTMENT_ADMIN',
        req.user?.staffId || req.user?.id || null,
      ]
    );

    const venueId = result.insertId;

    // If COMMON venue, grant access to all active departments by default
    if (ownershipType === 'COMMON') {
      const [depts] = await pool.query('SELECT DeptID FROM departments WHERE IsActive = 1');
      for (const d of depts) {
        await pool.query(
          'INSERT IGNORE INTO venue_access (venue_id, department_id, access_type, status) VALUES (?, ?, ?, 1)',
          [venueId, d.DeptID, 'ALLOWED']
        );
      }
    }

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'VENUE_CREATED',
      entityType: 'VENUE',
      entityId: venueId,
      newValue: req.body,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'Venue created successfully', venueId });
  } catch (err) {
    console.error('Error in createVenue:', err);
    res.status(500).json({ success: false, message: 'Failed to create venue' });
  }
};

/**
 * Dedicated endpoint for creating Common Venues (College-wide)
 * Backend forces:
 * - ownership_type = 'COMMON'
 * - DeptID = NULL
 * - approval_role = 'MASTER_ADMIN'
 */
const createCommonVenue = async (req, res) => {
  try {
    const {
      hallName,
      location,
      capacity,
      venueType,
      numberOfSystems,
      facilities,
      additionalFeatures,
      activeStatus = 1,
    } = req.body;

    const image = req.file ? req.file.filename : (req.body.image || null);

    if (!hallName || !location || !capacity) {
      return res.status(400).json({ success: false, message: 'Venue name, location, and capacity are required.' });
    }

    // STRICT BACKEND ENFORCEMENT:
    // ownership_type = COMMON
    // DeptID = NULL
    // approval_role = MASTER_ADMIN
    const forcedOwnershipType = 'COMMON';
    const forcedDeptID = null;
    const forcedApprovalRole = 'MASTER_ADMIN';

    const [result] = await pool.query(
      `INSERT INTO halls
       (HallName, Location, Capacity, DeptID, VenueType, ownership_type, category, approval_role,
        NumberOfSystems, AdditionalFeatures, ImageURL, ActiveStatus, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hallName.trim(),
        location.trim(),
        Number(capacity),
        forcedDeptID,
        venueType || 'AUDITORIUM',
        forcedOwnershipType,
        'COMMON',
        forcedApprovalRole,
        numberOfSystems ? Number(numberOfSystems) : 0,
        additionalFeatures || '',
        image || null,
        activeStatus !== undefined ? (activeStatus ? 1 : 0) : 1,
        req.user?.staffId || req.user?.id || null,
      ]
    );

    const venueId = result.insertId;

    // Grant access to all active departments in venue_access
    const [depts] = await pool.query('SELECT DeptID FROM departments WHERE IsActive = 1');
    for (const d of depts) {
      await pool.query(
        'INSERT IGNORE INTO venue_access (venue_id, department_id, access_type, status) VALUES (?, ?, ?, 1)',
        [venueId, d.DeptID, 'ALLOWED']
      );
    }

    // Save facilities mapping if provided
    if (Array.isArray(facilities) && facilities.length) {
      for (const facId of facilities) {
        if (facId) {
          await pool.query(
            'INSERT IGNORE INTO venue_facility_mapping (venue_id, facility_id) VALUES (?, ?)',
            [venueId, Number(facId)]
          );
        }
      }
    }

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'COMMON_VENUE_CREATED',
      entityType: 'VENUE',
      entityId: venueId,
      newValue: {
        hallName,
        location,
        capacity,
        venueType,
        ownership_type: forcedOwnershipType,
        DeptID: forcedDeptID,
        approval_role: forcedApprovalRole,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Common venue created successfully.',
      venueId,
      venue: {
        hallId: venueId,
        hallName: hallName.trim(),
        location: location.trim(),
        capacity: Number(capacity),
        venueType: venueType || 'AUDITORIUM',
        ownershipType: 'COMMON',
        ownership_type: 'COMMON',
        deptId: null,
        DeptID: null,
        approvalRole: 'MASTER_ADMIN',
        approval_role: 'MASTER_ADMIN',
      },
    });
  } catch (err) {
    console.error('Error in createCommonVenue:', err);
    res.status(500).json({ success: false, message: 'Failed to create common venue', error: err.message });
  }
};

const updateVenue = async (req, res) => {
  const { id } = req.params;
  try {
    const {
      hallName,
      location,
      capacity,
      deptId,
      venueType,
      ownershipType,
      category,
      approvalRole,
      activeStatus,
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM halls WHERE HallID = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Venue not found' });

    await pool.query(
      `UPDATE halls
       SET HallName = COALESCE(?, HallName),
           Location = COALESCE(?, Location),
           Capacity = COALESCE(?, Capacity),
           DeptID = COALESCE(?, DeptID),
           VenueType = COALESCE(?, VenueType),
           ownership_type = COALESCE(?, ownership_type),
           category = COALESCE(?, category),
           approval_role = COALESCE(?, approval_role),
           ActiveStatus = COALESCE(?, ActiveStatus)
       WHERE HallID = ?`,
      [
        hallName?.trim() || null,
        location?.trim() || null,
        capacity || null,
        deptId || null,
        venueType || null,
        ownershipType || null,
        category || null,
        approvalRole || null,
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

    res.json({ success: true, message: 'Venue updated successfully' });
  } catch (err) {
    console.error('Error in updateVenue:', err);
    res.status(500).json({ success: false, message: 'Failed to update venue' });
  }
};

/**
 * 5. VENUE ACCESS CONTROL (Which departments can book a common venue)
 */
const getVenueAccessRules = async (req, res) => {
  const { id } = req.params;
  try {
    const [hallRows] = await pool.query('SELECT HallID, HallName, ownership_type FROM halls WHERE HallID = ?', [id]);
    if (!hallRows.length) return res.status(404).json({ success: false, message: 'Venue not found' });

    const [departments] = await pool.query('SELECT DeptID, DeptName, DeptCode FROM departments WHERE IsActive = 1 ORDER BY DeptName ASC');
    const [accessRows] = await pool.query('SELECT department_id, access_type, status FROM venue_access WHERE venue_id = ?', [id]);

    const accessMap = new Map();
    accessRows.forEach((r) => accessMap.set(r.department_id, r.access_type === 'ALLOWED' && Boolean(r.status)));

    const accessList = departments.map((d) => ({
      departmentId: d.DeptID,
      departmentName: d.DeptName,
      departmentCode: d.DeptCode,
      allowed: accessMap.has(d.DeptID) ? accessMap.get(d.DeptID) : (hallRows[0].ownership_type === 'COMMON'),
    }));

    res.json({ success: true, venue: hallRows[0], accessList });
  } catch (err) {
    console.error('Error in getVenueAccessRules:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch venue access rules' });
  }
};

const updateVenueAccessRules = async (req, res) => {
  const { id } = req.params;
  const { allowedDepartmentIds } = req.body; // Array of DeptIDs allowed

  if (!Array.isArray(allowedDepartmentIds)) {
    return res.status(400).json({ success: false, message: 'allowedDepartmentIds array required' });
  }

  try {
    const [depts] = await pool.query('SELECT DeptID FROM departments WHERE IsActive = 1');
    const allowedSet = new Set(allowedDepartmentIds.map(Number));

    for (const d of depts) {
      const isAllowed = allowedSet.has(d.DeptID);
      await pool.query(
        `INSERT INTO venue_access (venue_id, department_id, access_type, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE access_type = VALUES(access_type), status = VALUES(status)`,
        [id, d.DeptID, isAllowed ? 'ALLOWED' : 'RESTRICTED', isAllowed ? 1 : 0]
      );
    }

    await logSystemAction({
      userId: req.user?.staffId || req.user?.id,
      action: 'VENUE_ACCESS_UPDATED',
      entityType: 'VENUE_ACCESS',
      entityId: Number(id),
      newValue: { allowedDepartmentIds },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Venue department access rules updated successfully' });
  } catch (err) {
    console.error('Error in updateVenueAccessRules:', err);
    res.status(500).json({ success: false, message: 'Failed to update venue access rules' });
  }
};

/**
 * 6. SYSTEM AUDIT LOGS
 */
const getAuditLogs = async (req, res) => {
  try {
    const result = await getSystemAuditLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error('Error in getAuditLogs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

/**
 * 7. MASTER ADMIN NOTIFICATION SETTINGS
 */
const getNotificationSettings = async (req, res) => {
  try {
    const adminId = req.user?.staffId || req.user?.id;
    const { getMasterNotificationSettings } = require('../services/notificationService');
    const settings = await getMasterNotificationSettings(adminId);
    res.json({ success: true, data: settings, settings });
  } catch (err) {
    console.error('Error in getNotificationSettings:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notification settings' });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const adminId = req.user?.staffId || req.user?.id;
    const { updateMasterNotificationSettings } = require('../services/notificationService');
    const updated = await updateMasterNotificationSettings(adminId, req.body);
    await logSystemAction({
      userId: adminId,
      action: 'NOTIFICATION_SETTINGS_UPDATED',
      entityType: 'NOTIFICATION_SETTINGS',
      entityId: adminId,
      newValue: updated,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Notification settings updated successfully', data: updated, settings: updated });
  } catch (err) {
    console.error('Error in updateNotificationSettings:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification settings' });
  }
};

module.exports = {
  getMasterAdminDashboard,
  getDepartmentAdmins,
  createDepartmentAdmin,
  updateDepartmentAdmin,
  toggleAdminStatus,
  resetAdminPassword,
  getAllPermissions,
  getAdminPermissions,
  updateAdminPermissions,
  getVenues,
  createVenue,
  createCommonVenue,
  updateVenue,
  getVenueAccessRules,
  updateVenueAccessRules,
  getAuditLogs,
  getNotificationSettings,
  updateNotificationSettings,
};
