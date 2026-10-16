const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

const { normalizeRole } = require('../middlewares/permissionMiddleware');

const optionalProfileColumns = ['phone', 'designation', 'employee_id', 'profile_image'];
const nullableValue = (value) => typeof value === 'string' ? value.trim() || null : value ?? null;

const resolveCallerDept = async (req) => {
  if (req.userDepartmentId) return { id: Number(req.userDepartmentId), name: req.user?.department || null };
  if (req.user?.departmentId) return { id: Number(req.user.departmentId), name: req.user?.department || null };
  const staffId = req.user?.staffId || req.user?.id;
  if (!staffId) return { id: null, name: null };
  const [rows] = await pool.query('SELECT department_id, department FROM staff WHERE staff_id = ? LIMIT 1', [staffId]);
  if (rows.length) {
    let deptId = rows[0].department_id ? Number(rows[0].department_id) : null;
    let deptName = rows[0].department || null;
    if (!deptId && deptName) {
      const [dRows] = await pool.query('SELECT DeptID, DeptName FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1', [deptName]);
      if (dRows.length) {
        deptId = Number(dRows[0].DeptID);
        deptName = dRows[0].DeptName;
      }
    }
    return { id: deptId, name: deptName };
  }
  return { id: null, name: null };
};

// Get the authenticated staff member's details. Some existing deployments have
// an older staff table without the optional profile columns, so only select
// columns that actually exist rather than failing the entire profile request.
const getStaffDetails = async (req, res) => {
  try {
    const [columnRows] = await pool.query('SHOW COLUMNS FROM staff');
    const columns = new Set(columnRows.map(({ Field }) => Field));
    const selectColumns = ['staff_id', 'email', 'full_name', 'department', 'role', 'is_first_login']
      .concat(optionalProfileColumns.filter((column) => columns.has(column)))
      .join(', ');

    const staffId = req.user?.staffId;
    const email = req.user?.email;
    if (!staffId && !email) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    const [rows] = await pool.query(
      `SELECT ${selectColumns} FROM staff WHERE ${staffId ? 'staff_id = ?' : 'email = ?'} LIMIT 1`,
      [staffId || email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Return normalized profile object
    const staff = rows[0];
    res.json({
      success: true,
      data: {
        staff_id: staff.staff_id,
        full_name: staff.full_name,
        email: staff.email,
        department: staff.department,
        role: staff.role,
        is_first_login: Boolean(staff.is_first_login),
        phone: staff.phone || null,
        designation: staff.designation || null,
        employee_id: staff.employee_id || null,
        employeeId: staff.employee_id || null,
        profile_image: staff.profile_image || null,
        profilePhoto: staff.profile_image || null
      }
    });
  } catch (error) {
    console.error('Error fetching staff details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getStaffStats = async (req, res) => {
  try {
    const staffEmail = req.user.email; // Assuming the email is part of the authenticated user's token
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedBookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingBookings
      FROM bookings 
      WHERE staff_email = ?`,
      [staffEmail]
    );
    res.json({
      success: true,
      data: {
        totalBookings: parseInt(stats[0].totalBookings) || 0,
        approvedBookings: parseInt(stats[0].approvedBookings) || 0,
        pendingBookings: parseInt(stats[0].pendingBookings) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching staff statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
const getAllStaff = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  try {
    const userRole = normalizeRole(req.user?.role);
    const conditions = ["s.role IN ('FACULTY', 'staff')"];
    const filterParams = [];

    // Department Admin or Faculty can view faculty in their own department
    if (userRole === 'DEPARTMENT_ADMIN' || userRole === 'FACULTY') {
      const callerDept = await resolveCallerDept(req);
      if (callerDept.id) {
        conditions.push('(s.department_id = ? OR LOWER(s.department) = LOWER(?))');
        filterParams.push(callerDept.id, callerDept.name || '');
      }
    }

    if (req.query.search?.trim()) {
      conditions.push('(s.full_name LIKE ? OR s.email LIKE ? OR s.department LIKE ? OR s.role LIKE ?)');
      const search = `%${req.query.search.trim()}%`;
      filterParams.push(search, search, search, search);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM staff s ${where}`, filterParams);
    const [rows] = await pool.query(`
      SELECT
        s.staff_id,
        s.full_name,
        s.email,
        s.department,
        s.department_id,
        s.role,
        s.status,
        s.is_first_login,
        s.phone,
        s.designation,
        s.employee_id,
        s.profile_image
      FROM staff s
      ${where} ORDER BY s.full_name LIMIT ? OFFSET ?
    `, [...filterParams, limit, offset]);

    const normalizedRows = rows.map((s) => ({
      ...s,
      id: s.staff_id,
      name: s.full_name,
      staffName: s.full_name,
      staffId: s.staff_id,
      userId: s.staff_id,
      UserID: s.staff_id,
    }));

    res.json({
      success: true,
      data: normalizedRows,
      pagination: makePagination({ page, limit, total: countRow.total })
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
const bcrypt = require("bcrypt");

const addStaff = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const {
      full_name,
      email,
      department,
      role,
      password,
      phone,
      designation,
      employee_id,
      profile_image
    } = req.body;

    // Validation
    if (!full_name || !email || !department || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

const mapDeptToOfficial = (input) => {
  if (!input) return '';
  const s = String(input).trim().toLowerCase();
  if (s === 'cse' || s === 'cs' || s === 'computer science') return 'Computer Science';
  if (s === 'ece' || s.includes('communication')) return 'Electronics and Communication Engineering';
  if (s === 'eee' || s.includes('electrical')) return 'Electrical Engineering';
  if (s === 'mech' || s.includes('mechanical')) return 'Mechanical Engineering';
  if (s === 'civil') return 'Civil Engineering';
  if (s === 'it' || s === 'information technology') return 'Information Technology';
  if (s === 'ai' || s === 'aids' || s.includes('artificial')) return 'Artificial Intelligence and Data Science';
  return input;
};

    // Role-based Department Restriction:
    if (userRole === 'DEPARTMENT_ADMIN') {
      const callerDept = await resolveCallerDept(req);
      const requestedOfficial = mapDeptToOfficial(department);
      const callerOfficial = mapDeptToOfficial(callerDept.name);

      const [dCheck] = await pool.query(
        'SELECT DeptID, DeptName FROM departments WHERE LOWER(DeptName) = LOWER(?) OR LOWER(DeptName) = LOWER(?) LIMIT 1',
        [requestedOfficial, department]
      );
      const requestedDeptId = dCheck.length ? Number(dCheck[0].DeptID) : null;

      const isSameId = callerDept.id && requestedDeptId && callerDept.id === requestedDeptId;
      const isSameName = callerOfficial && requestedOfficial && callerOfficial.toLowerCase() === requestedOfficial.toLowerCase();

      if (!isSameId && !isSameName) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Department Admins can only add faculty to their own assigned department.'
        });
      }
    } else if (userRole !== 'MASTER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can add faculty.'
      });
    }

    // Check if email already exists
    const [existing] = await pool.query(
      "SELECT staff_id FROM staff WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    // Resolve department_id
    const [deptRows] = await pool.query('SELECT DeptID, DeptName FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1', [String(department).trim()]);
    const deptId = deptRows.length ? Number(deptRows[0].DeptID) : null;
    const officialDeptName = deptRows.length ? deptRows[0].DeptName : department;

    // Password & Role
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = 'FACULTY';

    // Insert staff
    const [insertResult] = await pool.query(
      `INSERT INTO staff
      (full_name, email, password, department, department_id, role, status, is_first_login, phone, designation, employee_id, profile_image)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, ?)`,
      [
        String(full_name).trim(),
        String(email).trim(),
        hashedPassword,
        officialDeptName,
        deptId,
        assignedRole,
        nullableValue(phone),
        nullableValue(designation),
        nullableValue(employee_id),
        nullableValue(profile_image)
      ]
    );

    // Initialize notification preferences
    await pool.query('INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled) VALUES (?, 1, 1)', [insertResult.insertId]);

    res.status(201).json({
      success: true,
      message: "Faculty added successfully",
      staffId: insertResult.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, department, role, phone, designation, employee_id, profile_image } = req.body;
    const userRole = normalizeRole(req.user?.role);

    if (!String(full_name || '').trim() || !String(email || '').trim() || !String(department || '').trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, and department are required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const [existingRows] = await pool.query(
      'SELECT staff_id, role, department, department_id FROM staff WHERE staff_id = ? LIMIT 1',
      [id]
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const targetStaff = existingRows[0];

    // Department Admin restriction
    if (userRole === 'DEPARTMENT_ADMIN') {
      const callerDept = await resolveCallerDept(req);
      if (
        (callerDept.id && targetStaff.department_id && callerDept.id !== Number(targetStaff.department_id)) ||
        (callerDept.name && targetStaff.department && callerDept.name.toLowerCase() !== targetStaff.department.toLowerCase())
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Department Admins cannot modify faculty outside their department.'
        });
      }
    } else if (userRole !== 'MASTER_ADMIN' && String(req.user?.staffId || req.user?.id) !== String(id)) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile' });
    }

    // Role elevation prevention: Faculty edit always maintains role = FACULTY
    const nextRole = 'FACULTY';

    // Resolve department_id if department changed
    const [dRows] = await pool.query('SELECT DeptID, DeptName FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1', [String(department).trim()]);
    const deptId = dRows.length ? Number(dRows[0].DeptID) : targetStaff.department_id;
    const officialDeptName = dRows.length ? dRows[0].DeptName : department;

    const [result] = await pool.query(
      `UPDATE staff
       SET full_name = ?, email = ?, department = ?, department_id = ?, role = ?, phone = ?, designation = ?, employee_id = ?, profile_image = ?
       WHERE staff_id = ?`,
      [String(full_name).trim(), String(email).trim(), officialDeptName, deptId, nextRole, nullableValue(phone), nullableValue(designation), nullableValue(employee_id), nullableValue(profile_image), id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    res.json({
      success: true,
      message: "Faculty updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update faculty",
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = normalizeRole(req.user?.role);

    // Check if staff exists
    const [rows] = await pool.query(
      "SELECT staff_id, role, department, department_id FROM staff WHERE staff_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    const targetStaff = rows[0];

    // Department Admin restriction
    if (userRole === 'DEPARTMENT_ADMIN') {
      const callerDept = await resolveCallerDept(req);
      if (
        (callerDept.id && targetStaff.department_id && callerDept.id !== Number(targetStaff.department_id)) ||
        (callerDept.name && targetStaff.department && callerDept.name.toLowerCase() !== targetStaff.department.toLowerCase())
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Department Admins cannot delete faculty outside their department.'
        });
      }
      if (normalizeRole(targetStaff.role) === 'MASTER_ADMIN' || normalizeRole(targetStaff.role) === 'DEPARTMENT_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot delete an administrator account.'
        });
      }
    } else if (userRole !== 'MASTER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete faculty.'
      });
    }

    await pool.query(
      "DELETE FROM staff WHERE staff_id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Faculty deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete faculty",
    });
  }
};
module.exports = {
  getStaffDetails,
  getStaffStats,
  getAllStaff,
  addStaff,
  updateStaff,
  deleteStaff
};
