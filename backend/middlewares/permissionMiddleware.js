const pool = require('../config/db');

/**
 * Normalizes user roles across legacy and upgraded identifiers.
 */
const normalizeRole = (role = '') => {
  const r = String(role).trim().toUpperCase();
  if (r === 'ADMIN' || r === 'MASTER_ADMIN') return 'MASTER_ADMIN';
  if (r === 'DEPARTMENT_ADMIN' || r === 'DEPT_ADMIN') return 'DEPARTMENT_ADMIN';
  if (r === 'STAFF' || r === 'FACULTY') return 'FACULTY';
  return r;
};

/**
 * Fetches all effective permission keys for a user.
 * Master Admin inherently has all permissions.
 * Department Admin checks user-specific overrides then role-level defaults.
 */
const getUserPermissions = async (userId, rawRole) => {
  const role = normalizeRole(rawRole);

  if (role === 'MASTER_ADMIN') {
    const [allPerms] = await pool.query('SELECT permission_key FROM permissions');
    return allPerms.map((p) => p.permission_key);
  }

  // 1. Fetch all system permissions
  const [allPerms] = await pool.query('SELECT id, permission_key FROM permissions');

  // 2. Fetch role defaults
  const [rolePerms] = await pool.query(
    'SELECT permission_id, enabled FROM role_permissions WHERE role = ?',
    [role]
  );
  const roleMap = new Map();
  rolePerms.forEach((rp) => roleMap.set(rp.permission_id, Boolean(rp.enabled)));

  // 3. Fetch user-specific overrides
  const [userPerms] = await pool.query(
    'SELECT permission_id, enabled FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  const userMap = new Map();
  userPerms.forEach((up) => userMap.set(up.permission_id, Boolean(up.enabled)));

  // Combine: User override takes precedence over role default
  const effectivePermissions = [];
  for (const perm of allPerms) {
    let isEnabled = false;
    if (userMap.has(perm.id)) {
      isEnabled = userMap.get(perm.id);
    } else if (roleMap.has(perm.id)) {
      isEnabled = roleMap.get(perm.id);
    }

    if (isEnabled) {
      effectivePermissions.push(perm.permission_key);
    }
  }

  return effectivePermissions;
};

/**
 * Middleware: Enforces that the authenticated user possesses at least one of the specified permissions.
 */
const requirePermission = (...permissionKeys) => {
  const keys = permissionKeys.flat();
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const role = normalizeRole(user.role);

      // Master Admin always has full bypass
      if (role === 'MASTER_ADMIN') {
        req.permissions = await getUserPermissions(user.staffId || user.id, role);
        return next();
      }

      const permissions = await getUserPermissions(user.staffId || user.id, role);
      req.permissions = permissions;

      const hasRequired = keys.some((k) => permissions.includes(k));
      if (!hasRequired) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          permission: keys.join(' | '),
          message: `Access denied. You do not have the required permission: ${keys.join(' or ')}`,
        });
      }

      next();
    } catch (err) {
      console.error('Permission check failed:', err);
      return res.status(500).json({ success: false, message: 'Authorization evaluation error' });
    }
  };
};

/**
 * Middleware: Enforces that the user has one of the specified roles.
 */
const requireRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.flat().map((r) => normalizeRole(r));
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_DENIED',
        message: `Forbidden: requires one of [${normalizedAllowed.join(', ')}]`,
      });
    }
    next();
  };
};

module.exports = {
  normalizeRole,
  getUserPermissions,
  requirePermission,
  requireRole,
};
