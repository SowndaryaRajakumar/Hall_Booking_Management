const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

const optionalProfileColumns = ['phone', 'designation', 'employee_id', 'profile_image'];
const nullableValue = (value) => typeof value === 'string' ? value.trim() || null : value ?? null;

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
    const where = req.query.search?.trim() ? `WHERE full_name LIKE ? OR email LIKE ? OR department LIKE ? OR role LIKE ?` : '';
    const search = `%${(req.query.search || '').trim()}%`;
    const filterParams = where ? [search, search, search, search] : [];
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM staff ${where}`, filterParams);
    const [rows] = await pool.query(`
      SELECT
        staff_id,
        full_name,
        email,
        department,
        role,
        is_first_login,
        phone,
        designation,
        employee_id,
        profile_image
      FROM staff
      ${where} ORDER BY full_name LIMIT ? OFFSET ?
    `, [...filterParams, limit, offset]);

    res.json({
      success: true,
      data: rows,
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
    if (!full_name || !email || !department || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert staff
    await pool.query(
      `INSERT INTO staff
      (full_name,email,password,department,role,is_first_login,phone,designation,employee_id,profile_image)
      VALUES (?,?,?,?,?,1,?,?,?,?)`,
      [
        full_name,
        email,
        hashedPassword,
        department,
        role,
        nullableValue(phone),
        nullableValue(designation),
        nullableValue(employee_id),
        nullableValue(profile_image)
      ]
    );

    res.status(201).json({
      success: true,
      message: "Faculty added successfully"
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

    if (!String(full_name || '').trim() || !String(email || '').trim() || !String(department || '').trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, and department are required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && String(req.user?.staffId) !== String(id)) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile' });
    }

    const [existingRows] = await pool.query(
      'SELECT staff_id, role FROM staff WHERE staff_id = ? LIMIT 1',
      [id]
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Faculty may update their own visible details but must not elevate roles.
    const nextRole = isAdmin ? role : existingRows[0].role;

    const [result] = await pool.query(
      `UPDATE staff
       SET full_name = ?, email = ?, department = ?, role = ?, phone = ?, designation = ?, employee_id = ?, profile_image = ?
       WHERE staff_id = ?`,
      [String(full_name).trim(), String(email).trim(), String(department).trim(), nextRole, nullableValue(phone), nullableValue(designation), nullableValue(employee_id), nullableValue(profile_image), id]
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

    // Check if staff exists
    const [rows] = await pool.query(
      "SELECT * FROM staff WHERE staff_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
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
