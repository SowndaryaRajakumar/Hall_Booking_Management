const pool = require('../config/db');
const bcrypt = require('bcrypt');
const isStrongPassword = (password) => {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};
const nullableValue = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
};
const getProfile = async (req, res) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - invalid session token',
      });
    }

    const [rows] = await pool.query(
      `SELECT staff_id, email, full_name, department, designation, employee_id, phone, profile_image, role, created_at, is_first_login
       FROM staff
       WHERE staff_id = ?
       LIMIT 1`,
      [staffId]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }
    const staff = rows[0];
    return res.json({
      success: true,
      data: {
        staff_id: staff.staff_id,
        id: staff.staff_id,
        full_name: staff.full_name,
        name: staff.full_name,
        email: staff.email,
        phone: staff.phone || null,
        department: staff.department || null,
        designation: staff.designation || null,
        employee_id: staff.employee_id || null,
        employeeId: staff.employee_id || null,
        profile_image: staff.profile_image || null,
        role: staff.role, // 'admin' or 'staff'
        status: 'Active',
        created_at: staff.created_at,
        is_first_login: Boolean(staff.is_first_login),
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - invalid session token',
      });
    }
    const [existingRows] = await pool.query(
      'SELECT staff_id, role, email, full_name, department, phone, designation, employee_id, profile_image FROM staff WHERE staff_id = ? LIMIT 1',
      [staffId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }
    const currentStaff = existingRows[0];
    const { full_name, name, email, phone, designation, employee_id, department } = req.body || {};
    const updatedName = String(full_name || name || currentStaff.full_name || '').trim();
    if (!updatedName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required',
      });
    }
    const updatedEmail = String(email || currentStaff.email || '').trim().toLowerCase();
    if (!updatedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updatedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }
    const [dupRows] = await pool.query(
      'SELECT staff_id FROM staff WHERE LOWER(email) = ? AND staff_id != ? LIMIT 1',
      [updatedEmail, staffId]
    );
    if (dupRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists. Please choose a different email address.',
      });
    }
    const updatedPhone = phone !== undefined ? nullableValue(phone) : currentStaff.phone;
    const updatedDesignation = designation !== undefined ? nullableValue(designation) : currentStaff.designation;
    const updatedEmployeeId = employee_id !== undefined ? nullableValue(employee_id) : currentStaff.employee_id;
    const updatedDepartment = department !== undefined && String(department).trim()
      ? String(department).trim()
      : currentStaff.department;
    await pool.query(
      `UPDATE staff
       SET full_name = ?,
           email = ?,
           phone = ?,
           department = ?,
           designation = ?,
           employee_id = ?
       WHERE staff_id = ?`,
      [
        updatedName,
        updatedEmail,
        updatedPhone,
        updatedDepartment,
        updatedDesignation,
        updatedEmployeeId,
        staffId,
      ]
    );
    const [refetched] = await pool.query(
      `SELECT staff_id, email, full_name, department, designation, employee_id, phone, profile_image, role, created_at, is_first_login
       FROM staff
       WHERE staff_id = ?
       LIMIT 1`,
      [staffId]
    );
    const staff = refetched[0];
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        staff_id: staff.staff_id,
        id: staff.staff_id,
        full_name: staff.full_name,
        name: staff.full_name,
        email: staff.email,
        phone: staff.phone || null,
        department: staff.department || null,
        designation: staff.designation || null,
        employee_id: staff.employee_id || null,
        employeeId: staff.employee_id || null,
        profile_image: staff.profile_image || null,
        role: staff.role,
        status: 'Active',
        created_at: staff.created_at,
        is_first_login: Boolean(staff.is_first_login),
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.',
    });
  }
};
const changePassword = async (req, res) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - invalid session token',
      });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !String(currentPassword).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required',
      });
    }
    if (!newPassword || !String(newPassword).trim()) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }
    if (!confirmPassword || !String(confirmPassword).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm your new password',
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }
    const [rows] = await pool.query(
      'SELECT staff_id, password, is_first_login, auth_version FROM staff WHERE staff_id = ? LIMIT 1',
      [staffId]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }
    const staff = rows[0];
    const storedPassword = String(staff.password || '');
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
    let isCurrentValid = false;
    if (isBcryptHash) {
      isCurrentValid = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      isCurrentValid =
        Boolean(staff.is_first_login) &&
        currentPassword.length === storedPassword.length &&
        currentPassword === storedPassword;
    }
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid current password',
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE staff
       SET password = ?,
           is_first_login = FALSE,
           auth_version = auth_version + 1
       WHERE staff_id = ?`,
      [hashedNewPassword, staffId]
    );
    return res.json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password. Please try again later.',
    });
  }
};
module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};