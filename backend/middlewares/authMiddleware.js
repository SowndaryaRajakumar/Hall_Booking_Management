const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const { normalizeRole } = require('./permissionMiddleware');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      console.error('JWT verification failed:', err);
      return res.status(403).json({ message: 'Forbidden - Invalid token' });
    }
    try {
      const staffId = decoded.staffId || decoded.id;
      const [rows] = await db.query(
        'SELECT staff_id, email, full_name, role, department, department_id, status, auth_version FROM staff WHERE staff_id = ? LIMIT 1',
        [staffId]
      );

      if (!rows.length) {
        return res.status(401).json({ message: 'User account not found. Please log in again.' });
      }

      const currentStaff = rows[0];

      if (currentStaff.status === 'inactive') {
        return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
      }

      if (Number(currentStaff.auth_version) !== Number(decoded.authVersion || 0)) {
        return res.status(401).json({ message: 'Session has expired. Please log in again.' });
      }

      const verifiedRole = normalizeRole(currentStaff.role);

      req.user = {
        ...decoded,
        staffId: currentStaff.staff_id,
        id: currentStaff.staff_id,
        email: currentStaff.email,
        name: currentStaff.full_name,
        department: currentStaff.department,
        departmentId: currentStaff.department_id,
        department_id: currentStaff.department_id,
        role: verifiedRole,
        rawRole: currentStaff.role,
        status: currentStaff.status,
      };

      next();
    } catch (dbError) {
      console.error('Session validation failed:', dbError);
      return res.status(500).json({ message: 'Unable to validate session' });
    }
  });
};

module.exports = authenticateToken;

