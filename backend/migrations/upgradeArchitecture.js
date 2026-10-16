const pool = require('../config/db');

/**
 * Safe, idempotent migration script for the College-Wide Multi-Level Architecture upgrade.
 * Extends existing tables without altering or dropping existing records.
 */
const upgradeArchitecture = async () => {
  console.log('--- Starting Architecture Upgrade Migration ---');

  // 1. Extend `staff` table
  const [staffCols] = await pool.query('SHOW COLUMNS FROM staff');
  const staffColNames = new Set(staffCols.map((c) => c.Field));

  if (!staffColNames.has('department_id')) {
    await pool.query('ALTER TABLE staff ADD COLUMN department_id INT NULL AFTER department');
    console.log('[OK] Added department_id column to staff table.');
  }

  if (!staffColNames.has('status')) {
    await pool.query("ALTER TABLE staff ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER role");
    console.log('[OK] Added status column to staff table.');
  }

  // Backfill department_id on staff by matching department string to Departments.DeptName
  await pool.query(`
    UPDATE staff s
    JOIN departments d ON LOWER(TRIM(s.department)) = LOWER(TRIM(d.DeptName))
    SET s.department_id = d.DeptID
    WHERE s.department_id IS NULL
  `);
  console.log('[OK] Backfilled department_id on existing staff.');

  // Normalize admin user role to MASTER_ADMIN if currently 'admin'
  await pool.query(`
    UPDATE staff
    SET role = 'MASTER_ADMIN'
    WHERE role = 'admin'
  `);
  console.log('[OK] Normalized admin staff records to MASTER_ADMIN.');

  // Normalize staff user role to FACULTY if currently 'staff'
  await pool.query(`
    UPDATE staff
    SET role = 'FACULTY'
    WHERE role = 'staff'
  `);
  console.log('[OK] Normalized staff records to FACULTY.');

  // 2. Extend `halls` table
  const [hallCols] = await pool.query('SHOW COLUMNS FROM halls');
  const hallColNames = new Set(hallCols.map((c) => c.Field));

  if (!hallColNames.has('ownership_type')) {
    await pool.query("ALTER TABLE halls ADD COLUMN ownership_type ENUM('COMMON', 'DEPARTMENT') NOT NULL DEFAULT 'DEPARTMENT' AFTER VenueType");
    console.log('[OK] Added ownership_type column to halls table.');
  }

  if (!hallColNames.has('category')) {
    await pool.query('ALTER TABLE halls ADD COLUMN category VARCHAR(100) NULL AFTER ownership_type');
    console.log('[OK] Added category column to halls table.');
  }

  if (!hallColNames.has('approval_role')) {
    await pool.query("ALTER TABLE halls ADD COLUMN approval_role ENUM('MASTER_ADMIN', 'DEPARTMENT_ADMIN') NOT NULL DEFAULT 'DEPARTMENT_ADMIN' AFTER category");
    console.log('[OK] Added approval_role column to halls table.');
  }

  if (!hallColNames.has('created_by')) {
    await pool.query('ALTER TABLE halls ADD COLUMN created_by INT NULL AFTER approval_role');
    console.log('[OK] Added created_by column to halls table.');
  }

  // 3. Create `venue_access` table (Controls which departments can access a venue)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_access (
      id INT NOT NULL AUTO_INCREMENT,
      venue_id INT NOT NULL,
      department_id INT NOT NULL,
      access_type ENUM('ALLOWED', 'RESTRICTED') NOT NULL DEFAULT 'ALLOWED',
      status TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_venue_dept (venue_id, department_id),
      KEY idx_va_venue (venue_id),
      KEY idx_va_dept (department_id),
      CONSTRAINT fk_va_venue FOREIGN KEY (venue_id) REFERENCES halls(HallID) ON DELETE CASCADE,
      CONSTRAINT fk_va_dept FOREIGN KEY (department_id) REFERENCES departments(DeptID) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created venue_access table.');

  // 4. Create `permissions` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INT NOT NULL AUTO_INCREMENT,
      permission_key VARCHAR(100) NOT NULL,
      permission_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
      description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_permission_key (permission_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created permissions table.');

  // 5. Create `role_permissions` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT NOT NULL AUTO_INCREMENT,
      role VARCHAR(50) NOT NULL,
      permission_id INT NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_role_perm (role, permission_id),
      KEY idx_rp_role (role),
      CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created role_permissions table.');

  // 6. Create `user_permissions` table (Individual Department Admin overrides)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      permission_id INT NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_perm (user_id, permission_id),
      KEY idx_up_user (user_id),
      CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_up_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created user_permissions table.');

  // 7. Create `notification_preferences` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      email_enabled TINYINT(1) NOT NULL DEFAULT 1,
      whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_np_user (user_id),
      CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created notification_preferences table.');

  // 8. Create `system_audit_logs` table (Broader system audit trail)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT NULL,
      old_value JSON NULL,
      new_value JSON NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_sal_user (user_id),
      KEY idx_sal_action (action),
      KEY idx_sal_entity (entity_type, entity_id),
      KEY idx_sal_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created system_audit_logs table.');

  // 9. Seed Standard Granular Permissions
  const SYSTEM_PERMISSIONS = [
    { key: 'VIEW_DASHBOARD', name: 'Dashboard Access', category: 'DASHBOARD', desc: 'Can view administrative dashboard overview' },
    { key: 'MANAGE_FACULTY', name: 'Faculty Management', category: 'FACULTY', desc: 'Can add, edit, and deactivate faculty members' },
    { key: 'MANAGE_VENUES', name: 'Venue Management', category: 'VENUES', desc: 'Can manage department venues and classrooms' },
    { key: 'MANAGE_DEPARTMENT_ADMINS', name: 'Manage Department Admins', category: 'ADMIN', desc: 'Can manage other department administrators' },
    { key: 'VIEW_BOOKINGS', name: 'View Bookings', category: 'BOOKINGS', desc: 'Can view booking calendar and list' },
    { key: 'APPROVE_BOOKINGS', name: 'Approve Bookings', category: 'BOOKINGS', desc: 'Can approve pending booking requests' },
    { key: 'REJECT_BOOKINGS', name: 'Reject Bookings', category: 'BOOKINGS', desc: 'Can reject pending booking requests' },
    { key: 'CANCEL_BOOKINGS', name: 'Cancel Bookings', category: 'BOOKINGS', desc: 'Can cancel approved or existing bookings' },
    { key: 'VIEW_REPORTS', name: 'View Reports', category: 'REPORTS', desc: 'Can view booking reports and analytics' },
    { key: 'EXPORT_REPORTS', name: 'Export Reports', category: 'REPORTS', desc: 'Can export reports to PDF and Excel' },
    { key: 'MANAGE_CLASSROOMS', name: 'Manage Classrooms', category: 'VENUES', desc: 'Can manage department classrooms' },
    { key: 'MANAGE_DEPT_VENUES', name: 'Manage Department Venues', category: 'VENUES', desc: 'Can add and update department halls and labs' },
    { key: 'ACCESS_STAFF_MANAGEMENT', name: 'Staff Management Access', category: 'FACULTY', desc: 'Can access the staff management module' },
  ];

  for (const perm of SYSTEM_PERMISSIONS) {
    await pool.query(
      `INSERT INTO permissions (permission_key, permission_name, category, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), category = VALUES(category), description = VALUES(description)`,
      [perm.key, perm.name, perm.category, perm.desc]
    );
  }
  console.log('[OK] Seeded granular permissions.');

  // 10. Seed Default Role Permissions
  // MASTER_ADMIN gets ALL permissions
  const [allPermRows] = await pool.query('SELECT id, permission_key FROM permissions');
  for (const perm of allPermRows) {
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('MASTER_ADMIN', ?, 1)
       ON DUPLICATE KEY UPDATE enabled = 1`,
      [perm.id]
    );
  }

  // DEPARTMENT_ADMIN gets standard department operations by default
  const DEPT_ADMIN_DEFAULT_KEYS = [
    'VIEW_DASHBOARD',
    'MANAGE_FACULTY',
    'MANAGE_VENUES',
    'VIEW_BOOKINGS',
    'APPROVE_BOOKINGS',
    'REJECT_BOOKINGS',
    'CANCEL_BOOKINGS',
    'VIEW_REPORTS',
    'EXPORT_REPORTS',
    'MANAGE_CLASSROOMS',
    'MANAGE_DEPT_VENUES',
    'ACCESS_STAFF_MANAGEMENT',
  ];

  for (const perm of allPermRows) {
    const isEnabled = DEPT_ADMIN_DEFAULT_KEYS.includes(perm.permission_key) ? 1 : 0;
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('DEPARTMENT_ADMIN', ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      [perm.id, isEnabled]
    );
  }
  console.log('[OK] Seeded role-permission bindings for MASTER_ADMIN and DEPARTMENT_ADMIN.');

  // 11. Extend `notifications` table
  const [notifCols] = await pool.query('SHOW COLUMNS FROM notifications');
  const notifColNames = new Set(notifCols.map((c) => c.Field));

  if (!notifColNames.has('booking_id')) {
    await pool.query('ALTER TABLE notifications ADD COLUMN booking_id INT NULL AFTER related_booking_id');
    await pool.query('UPDATE notifications SET booking_id = related_booking_id WHERE booking_id IS NULL AND related_booking_id IS NOT NULL');
    console.log('[OK] Added booking_id column to notifications table.');
  }

  if (!notifColNames.has('notification_type')) {
    await pool.query('ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50) NULL AFTER type');
    await pool.query('UPDATE notifications SET notification_type = type WHERE notification_type IS NULL AND type IS NOT NULL');
    console.log('[OK] Added notification_type column to notifications table.');
  }

  if (!notifColNames.has('channel')) {
    await pool.query("ALTER TABLE notifications ADD COLUMN channel VARCHAR(50) NOT NULL DEFAULT 'in_app' AFTER notification_type");
    console.log('[OK] Added channel column to notifications table.');
  }

  if (!notifColNames.has('status')) {
    await pool.query("ALTER TABLE notifications ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'SENT' AFTER channel");
    console.log('[OK] Added status column to notifications table.');
  }

  if (!notifColNames.has('sent_at')) {
    await pool.query('ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER status');
    console.log('[OK] Added sent_at column to notifications table.');
  }

  if (!notifColNames.has('error_message')) {
    await pool.query('ALTER TABLE notifications ADD COLUMN error_message TEXT NULL AFTER sent_at');
    console.log('[OK] Added error_message column to notifications table.');
  }

  // 12. Extend `notification_preferences` table
  const [npCols] = await pool.query('SHOW COLUMNS FROM notification_preferences');
  const npColNames = new Set(npCols.map((c) => c.Field));

  const prefColsToAdd = [
    ['in_app_enabled', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_booking_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_approval_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_rejection_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_cancellation_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_common_venue_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
    ['receive_event_notifications', 'TINYINT(1) NOT NULL DEFAULT 1'],
  ];

  for (const [colName, colDef] of prefColsToAdd) {
    if (!npColNames.has(colName)) {
      await pool.query(`ALTER TABLE notification_preferences ADD COLUMN ${colName} ${colDef}`);
      console.log(`[OK] Added ${colName} column to notification_preferences table.`);
    }
  }

  // 13. Create `master_notification_settings` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_notification_settings (
      id INT NOT NULL AUTO_INCREMENT,
      master_admin_id INT NOT NULL,
      department_booking_notifications TINYINT(1) NOT NULL DEFAULT 0,
      common_venue_notifications TINYINT(1) NOT NULL DEFAULT 1,
      auditorium_notifications TINYINT(1) NOT NULL DEFAULT 1,
      conference_notifications TINYINT(1) NOT NULL DEFAULT 1,
      event_notifications TINYINT(1) NOT NULL DEFAULT 1,
      email_enabled TINYINT(1) NOT NULL DEFAULT 1,
      whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 1,
      in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_mns_admin (master_admin_id),
      CONSTRAINT fk_mns_staff FOREIGN KEY (master_admin_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created master_notification_settings table.');

  // Initialize master_notification_settings for all Master Admins
  const [masterAdmins] = await pool.query("SELECT staff_id FROM staff WHERE role = 'MASTER_ADMIN'");
  for (const ma of masterAdmins) {
    await pool.query(`
      INSERT INTO master_notification_settings (master_admin_id, department_booking_notifications, common_venue_notifications, auditorium_notifications, conference_notifications, event_notifications, email_enabled, whatsapp_enabled, in_app_enabled)
      VALUES (?, 0, 1, 1, 1, 1, 1, 1, 1)
      ON DUPLICATE KEY UPDATE master_admin_id = VALUES(master_admin_id)
    `, [ma.staff_id]);
  }
  console.log('[OK] Initialized master_notification_settings.');

  // 14. Ensure conceptual default accounts (Requirement 6 & 32)
  const bcrypt = require('bcrypt');
  const defaultAccounts = [
    {
      name: 'Dr. Master Administrator',
      email: 'masteradmin@college.edu',
      phone: '+919876543210',
      role: 'MASTER_ADMIN',
      department: 'Administration',
      password: 'Admin@123',
    },
    {
      name: 'Prof. CSE Dept Admin',
      email: 'cseadmin@college.edu',
      phone: '+919876543211',
      role: 'DEPARTMENT_ADMIN',
      department: 'Computer Science',
      password: 'Admin@123',
    },
    {
      name: 'Dr. CSE Faculty Member',
      email: 'faculty@college.edu',
      phone: '+919876543212',
      role: 'FACULTY',
      department: 'Computer Science',
      password: 'Faculty@123',
    },
  ];

  for (const acc of defaultAccounts) {
    const [existing] = await pool.query('SELECT staff_id FROM staff WHERE email = ?', [acc.email]);
    if (!existing.length) {
      // Find department_id
      const [deptRows] = await pool.query('SELECT DeptID FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1', [acc.department]);
      const deptId = deptRows.length ? deptRows[0].DeptID : null;

      const hash = await bcrypt.hash(acc.password, 10);
      const [res] = await pool.query(
        `INSERT INTO staff (full_name, email, phone, role, department, department_id, status, password, auth_version)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 1)`,
        [acc.name, acc.email, acc.phone, acc.role, acc.department, deptId, hash]
      );

      // Initialize preferences
      await pool.query('INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled) VALUES (?, 1, 1)', [res.insertId]);

      if (acc.role === 'MASTER_ADMIN') {
        await pool.query('INSERT IGNORE INTO master_notification_settings (master_admin_id) VALUES (?)', [res.insertId]);
      }
      console.log(`[OK] Seeded default account: ${acc.email} (${acc.role})`);
    }
  }

  // 15. Ensure existing staff have notification preferences
  await pool.query(`
    INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled)
    SELECT staff_id, 1, 1 FROM staff
  `);
  console.log('[OK] Initialized notification preferences for all staff.');

  console.log('--- Architecture Upgrade Migration Complete ---');
};

if (require.main === module) {
  upgradeArchitecture()
    .then(() => {
      console.log('Migration ran successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { upgradeArchitecture };
