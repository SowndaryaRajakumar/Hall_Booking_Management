const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Make sure this path is correct
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';



const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err);
      return res.status(403).json({ message: 'Forbidden - Invalid token' });
    }
    try {
      const [rows] = await db.query('SELECT auth_version FROM staff WHERE staff_id = ? LIMIT 1', [user.staffId]);
      if (!rows.length || Number(rows[0].auth_version) !== Number(user.authVersion || 0)) {
        return res.status(401).json({ message: 'Session has expired. Please log in again.' });
      }
      req.user = user;  // Attach the decoded token payload to the request
      next();
    } catch (dbError) {
      console.error('Session validation failed:', dbError);
      return res.status(500).json({ message: 'Unable to validate session' });
    }
  });
};

module.exports = authenticateToken;
