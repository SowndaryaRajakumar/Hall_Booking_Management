const pool = require('../config/db');

const PERMISSIONS_TO_SEED = [
  { key: 'VIEW_DASHBOARD', name: 'Dashboard', category: 'DASHBOARD', desc: 'Can view administrative dashboard overview' },
  { key: 'MANAGE_FACULTY', name: 'Faculty Management', category: 'FACULTY', desc: 'Can add, edit, and deactivate department faculty members' },
  { key: 'MANAGE_DEPARTMENT_VENUES', name: 'Department Hall Management', category: 'VENUES', desc: 'Can manage department halls, classrooms and labs' },
  { key: 'VIEW_VENUES', name: 'Venue Management', category: 'VENUES', desc: 'Can view and inspect department venue list' },
  { key: 'MANAGE_VENUES', name: 'Venue Management (Full)', category: 'VENUES', desc: 'Can manage all venues and facilities' },
  { key: 'MANAGE_BOOKINGS', name: 'Booking Management', category: 'BOOKINGS', desc: 'Can manage department bookings' },
  { key: 'VIEW_BOOKINGS', name: 'View Bookings', category: 'BOOKINGS', desc: 'Can view department booking requests and schedules' },
  { key: 'APPROVE_BOOKINGS', name: 'Approve Bookings', category: 'BOOKINGS', desc: 'Can approve pending department booking requests' },
  { key: 'REJECT_BOOKINGS', name: 'Reject Bookings', category: 'BOOKINGS', desc: 'Can reject pending department booking requests' },
  { key: 'CANCEL_BOOKINGS', name: 'Cancel Bookings', category: 'BOOKINGS', desc: 'Can cancel department bookings' },
  { key: 'VIEW_REPORTS', name: 'Reports', category: 'REPORTS', desc: 'Can view department booking reports' },
  { key: 'EXPORT_REPORTS', name: 'Export Reports', category: 'REPORTS', desc: 'Can export booking reports' },
  { key: 'EXPORT_PDF', name: 'Export PDF', category: 'REPORTS', desc: 'Can export reports to PDF' },
  { key: 'EXPORT_EXCEL', name: 'Export Excel', category: 'REPORTS', desc: 'Can export reports to Excel' },
  { key: 'VIEW_TIMETABLE', name: 'Timetable', category: 'TIMETABLE', desc: 'Can view timetable schedule' },
  { key: 'MANAGE_TIMETABLE', name: 'Manage Timetable', category: 'TIMETABLE', desc: 'Can manage and edit timetable schedule' },
  { key: 'VIEW_NOTIFICATIONS', name: 'Notifications', category: 'GENERAL', desc: 'Can access notifications center' },
  { key: 'VIEW_ANALYTICS', name: 'Analytics', category: 'REPORTS', desc: 'Can view department venue usage analytics' },
  { key: 'VIEW_AUDIT_LOGS', name: 'Audit Logs', category: 'ADMIN', desc: 'Can view system and booking audit logs' },
  { key: 'MANAGE_DEPARTMENT_ADMINS', name: 'Department Admins Management', category: 'ADMIN', desc: 'Can manage other department administrators' },
];

const DEPT_ADMIN_DEFAULTS = [
  'VIEW_DASHBOARD',
  'MANAGE_FACULTY',
  'MANAGE_DEPARTMENT_VENUES',
  'VIEW_VENUES',
  'MANAGE_VENUES',
  'MANAGE_BOOKINGS',
  'VIEW_BOOKINGS',
  'APPROVE_BOOKINGS',
  'REJECT_BOOKINGS',
  'CANCEL_BOOKINGS',
  'VIEW_REPORTS',
  'EXPORT_REPORTS',
  'EXPORT_PDF',
  'EXPORT_EXCEL',
  'VIEW_TIMETABLE',
  'VIEW_NOTIFICATIONS',
  'VIEW_ANALYTICS',
];

async function syncAllPermissions() {
  console.log('--- Starting Permission Sync & Role Normalization ---');

  // 1. Seed all permissions
  for (const perm of PERMISSIONS_TO_SEED) {
    await pool.query(
      `INSERT INTO permissions (permission_key, permission_name, category, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         permission_name = VALUES(permission_name),
         category = VALUES(category),
         description = VALUES(description)`,
      [perm.key, perm.name, perm.category, perm.desc]
    );
  }
  console.log('[OK] Seeded permissions table with comprehensive permission keys.');

  // 2. Fetch all permission rows
  const [allPerms] = await pool.query('SELECT id, permission_key FROM permissions');

  // 3. MASTER_ADMIN role permissions
  for (const p of allPerms) {
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('MASTER_ADMIN', ?, 1)
       ON DUPLICATE KEY UPDATE enabled = 1`,
      [p.id]
    );
  }

  // 4. DEPARTMENT_ADMIN role permissions
  for (const p of allPerms) {
    const isDefault = DEPT_ADMIN_DEFAULTS.includes(p.permission_key) ? 1 : 0;
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('DEPARTMENT_ADMIN', ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      [p.id, isDefault]
    );
  }
  console.log('[OK] Role permissions configured for MASTER_ADMIN and DEPARTMENT_ADMIN.');

  // 5. Normalize staff roles
  await pool.query("UPDATE staff SET role = 'MASTER_ADMIN' WHERE role IN ('ADMIN', 'master_admin', 'superadmin', 'administrator')");
  await pool.query("UPDATE staff SET role = 'DEPARTMENT_ADMIN' WHERE role IN ('dept_admin', 'DEPT_ADMIN', 'department_admin')");
  await pool.query("UPDATE staff SET role = 'FACULTY' WHERE role IN ('staff', 'faculty')");
  console.log('[OK] Normalized staff records to MASTER_ADMIN, DEPARTMENT_ADMIN, and FACULTY.');

  console.log('--- Permission Sync & Role Normalization Complete ---');
}

if (require.main === module) {
  syncAllPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { syncAllPermissions };
