const pool = require('../config/db');
const { normalizeRole } = require('./permissionMiddleware');

/**
 * Middleware: Enforces that Department Admins can only access and manipulate
 * resources belonging strictly to their assigned department.
 * Master Admin has college-wide access and bypasses department restrictions.
 */
const requireDepartmentScope = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const role = normalizeRole(user.role);

    // Master Admin has college-wide access
    if (role === 'MASTER_ADMIN') {
      return next();
    }

    // Must be a Department Admin
    if (role !== 'DEPARTMENT_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Only authorized administrators can access this resource.',
      });
    }

    // Resolve user's assigned department ID if not on token
    let userDeptId = user.department_id;
    if (!userDeptId) {
      const [rows] = await pool.query(
        'SELECT department_id, department FROM staff WHERE staff_id = ? LIMIT 1',
        [user.staffId || user.id]
      );
      if (rows.length && rows[0].department_id) {
        userDeptId = rows[0].department_id;
      } else if (rows.length && rows[0].department) {
        const [dRows] = await pool.query(
          'SELECT DeptID FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1',
          [rows[0].department]
        );
        if (dRows.length) userDeptId = dRows[0].DeptID;
      }
    }

    if (!userDeptId) {
      return res.status(403).json({
        success: false,
        code: 'NO_DEPARTMENT_ASSIGNED',
        message: 'No department has been assigned to your administrator account.',
      });
    }

    req.userDepartmentId = Number(userDeptId);

    // 1. Check deptId parameter if present in request (e.g. /faculty/:deptId or body.deptId)
    const targetDeptId = req.params.deptId || req.body?.deptId || req.body?.DeptID || req.query?.deptId;
    if (targetDeptId && Number(targetDeptId) !== Number(userDeptId)) {
      return res.status(403).json({
        success: false,
        code: 'DEPARTMENT_MISMATCH',
        message: 'Access denied: You cannot view or modify data belonging to another department.',
      });
    }

    // 2. If resource ID is provided (e.g. venue :id or booking :id), check resource ownership
    const resourceId = req.params.id;
    if (resourceId && req.baseUrl.includes('venue')) {
      const [hall] = await pool.query('SELECT DeptID, ownership_type FROM halls WHERE HallID = ?', [resourceId]);
      if (hall.length && hall[0].ownership_type === 'DEPARTMENT' && Number(hall[0].DeptID) !== Number(userDeptId)) {
        return res.status(403).json({
          success: false,
          code: 'DEPARTMENT_MISMATCH',
          message: 'Access denied: You cannot modify venues belonging to another department.',
        });
      }
    }

    next();
  } catch (err) {
    console.error('Department scope validation failed:', err);
    return res.status(500).json({ success: false, message: 'Department scope evaluation error' });
  }
};

module.exports = { requireDepartmentScope };
