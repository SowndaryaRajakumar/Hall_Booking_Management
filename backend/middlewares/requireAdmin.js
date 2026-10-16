const { normalizeRole } = require('./permissionMiddleware');

const requireAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role !== 'MASTER_ADMIN' && role !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ message: 'Admin access is required.' });
  }

  next();
};

module.exports = requireAdmin;
