const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware that extracts user credentials from Authorization header if present.
 * Does not reject requests without tokens (passes through with req.user = null).
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const [rows] = await db.query(
      'SELECT staff_id, email, full_name, role, department, department_id, auth_version FROM staff WHERE staff_id = ? LIMIT 1',
      [decoded.staffId || decoded.id]
    );

    if (rows.length && Number(rows[0].auth_version || 0) === Number(decoded.authVersion || 0)) {
      req.user = {
        ...decoded,
        staffId: rows[0].staff_id,
        id: rows[0].staff_id,
        email: rows[0].email,
        name: rows[0].full_name,
        role: rows[0].role,
        department: rows[0].department,
        departmentId: rows[0].department_id,
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }

  next();
};

module.exports = optionalAuth;
