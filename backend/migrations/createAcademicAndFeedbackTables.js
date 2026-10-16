const pool = require('../config/db');

/**
 * Migration script for Feature 1 (Academic Semester / Recurring Allocation)
 * and Feature 2 (Common Venue Complaint / Feedback Management).
 *
 * Fully idempotent and safe: checks existence before modifying or creating.
 */
const createAcademicAndFeedbackTables = async () => {
  console.log('--- Starting Academic & Venue Feedback Migration ---');

  // 1. Create `academic_allocations` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_allocations (
      id INT NOT NULL AUTO_INCREMENT,
      faculty_id INT NOT NULL,
      department_id INT NULL,
      venue_id INT NOT NULL,
      academic_year VARCHAR(50) NOT NULL,
      semester VARCHAR(50) NOT NULL,
      subject_name VARCHAR(150) NOT NULL,
      subject_code VARCHAR(50) NULL,
      year_of_study VARCHAR(50) NOT NULL,
      section VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      purpose TEXT NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT NULL,
      approved_by INT NULL,
      approved_at TIMESTAMP NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_aa_faculty (faculty_id),
      KEY idx_aa_dept (department_id),
      KEY idx_aa_venue (venue_id),
      KEY idx_aa_dates (start_date, end_date),
      KEY idx_aa_status (status),
      CONSTRAINT fk_aa_faculty FOREIGN KEY (faculty_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_aa_venue FOREIGN KEY (venue_id) REFERENCES halls(HallID) ON DELETE CASCADE,
      CONSTRAINT fk_aa_dept FOREIGN KEY (department_id) REFERENCES departments(DeptID) ON DELETE SET NULL,
      CONSTRAINT fk_aa_created_by FOREIGN KEY (created_by) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_aa_approved_by FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created academic_allocations table.');

  // 2. Create `academic_allocation_rules` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_allocation_rules (
      id INT NOT NULL AUTO_INCREMENT,
      allocation_id INT NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      day_index TINYINT NOT NULL,
      period_id INT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_aar_alloc (allocation_id),
      KEY idx_aar_day_period (day_index, period_id),
      CONSTRAINT fk_aar_alloc FOREIGN KEY (allocation_id) REFERENCES academic_allocations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created academic_allocation_rules table.');

  // 3. Create `academic_allocation_occurrences` table (Exception / Override / Remarks)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_allocation_occurrences (
      id INT NOT NULL AUTO_INCREMENT,
      allocation_id INT NOT NULL,
      occurrence_date DATE NOT NULL,
      period_id INT NOT NULL,
      status ENUM('SCHEDULED', 'COMPLETED', 'ABSENT', 'CANCELLED', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
      remark TEXT NULL,
      alternate_faculty_id INT NULL,
      rescheduled_date DATE NULL,
      rescheduled_period_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_alloc_date_period (allocation_id, occurrence_date, period_id),
      KEY idx_aao_date (occurrence_date),
      KEY idx_aao_status (status),
      CONSTRAINT fk_aao_alloc FOREIGN KEY (allocation_id) REFERENCES academic_allocations(id) ON DELETE CASCADE,
      CONSTRAINT fk_aao_alt_faculty FOREIGN KEY (alternate_faculty_id) REFERENCES staff(staff_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created academic_allocation_occurrences table.');

  // 4. Create `venue_feedback` table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_feedback (
      id INT NOT NULL AUTO_INCREMENT,
      venue_id INT NOT NULL,
      type ENUM('COMPLAINT', 'FEEDBACK', 'MAINTENANCE', 'FACILITY_ISSUE', 'CLEANLINESS', 'EQUIPMENT_ISSUE', 'OTHER') NOT NULL DEFAULT 'COMPLAINT',
      priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
      status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      submitted_by INT NOT NULL,
      related_booking_id INT NULL,
      resolution TEXT NULL,
      internal_remarks TEXT NULL,
      resolved_by INT NULL,
      resolved_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_vf_venue (venue_id),
      KEY idx_vf_status (status),
      KEY idx_vf_priority (priority),
      KEY idx_vf_submitter (submitted_by),
      CONSTRAINT fk_vf_venue FOREIGN KEY (venue_id) REFERENCES halls(HallID) ON DELETE CASCADE,
      CONSTRAINT fk_vf_submitter FOREIGN KEY (submitted_by) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_vf_booking FOREIGN KEY (related_booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      CONSTRAINT fk_vf_resolver FOREIGN KEY (resolved_by) REFERENCES staff(staff_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[OK] Checked/created venue_feedback table.');

  // 5. Seed New Granular Permissions
  const NEW_PERMISSIONS = [
    {
      key: 'VIEW_ACADEMIC_CALENDAR',
      name: 'Academic Calendar',
      category: 'ACADEMIC',
      desc: 'Can view academic allocations and schedule calendar',
    },
    {
      key: 'MANAGE_ACADEMIC_ALLOCATIONS',
      name: 'Manage Academic Allocations',
      category: 'ACADEMIC',
      desc: 'Can create, edit, and cancel academic allocations',
    },
    {
      key: 'APPROVE_ACADEMIC_ALLOCATIONS',
      name: 'Approve Academic Allocations',
      category: 'ACADEMIC',
      desc: 'Can review, approve, and reject academic allocation requests',
    },
    {
      key: 'MANAGE_VENUE_FEEDBACK',
      name: 'Manage Common Venue Feedback',
      category: 'VENUES',
      desc: 'Can track, update status, and resolve common venue complaints and feedback',
    },
    {
      key: 'SUBMIT_VENUE_FEEDBACK',
      name: 'Submit Venue Feedback',
      category: 'VENUES',
      desc: 'Can submit complaints and feedback for college common venues',
    },
  ];

  for (const perm of NEW_PERMISSIONS) {
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
  console.log('[OK] Seeded new permissions into permissions table.');

  // 6. Role permissions assignment
  const [allPerms] = await pool.query('SELECT id, permission_key FROM permissions');
  const permMap = new Map(allPerms.map((p) => [p.permission_key, p.id]));

  // Master Admin gets all permissions enabled
  for (const perm of allPerms) {
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('MASTER_ADMIN', ?, 1)
       ON DUPLICATE KEY UPDATE enabled = 1`,
      [perm.id]
    );
  }

  // Department Admin default role permissions for new permissions
  const deptAdminEnabledKeys = [
    'VIEW_ACADEMIC_CALENDAR',
    'MANAGE_ACADEMIC_ALLOCATIONS',
    'APPROVE_ACADEMIC_ALLOCATIONS',
    'SUBMIT_VENUE_FEEDBACK',
  ];

  for (const key of deptAdminEnabledKeys) {
    const id = permMap.get(key);
    if (id) {
      await pool.query(
        `INSERT INTO role_permissions (role, permission_id, enabled)
         VALUES ('DEPARTMENT_ADMIN', ?, 1)
         ON DUPLICATE KEY UPDATE enabled = 1`,
        [id]
      );
    }
  }

  // MANAGE_VENUE_FEEDBACK defaults to 0 for Department Admin (Master Admin manages common venues)
  const manageFeedbackId = permMap.get('MANAGE_VENUE_FEEDBACK');
  if (manageFeedbackId) {
    await pool.query(
      `INSERT INTO role_permissions (role, permission_id, enabled)
       VALUES ('DEPARTMENT_ADMIN', ?, 0)
       ON DUPLICATE KEY UPDATE enabled = 0`,
      [manageFeedbackId]
    );
  }

  console.log('[OK] Configured role permissions for MASTER_ADMIN and DEPARTMENT_ADMIN.');
  console.log('--- Academic & Venue Feedback Migration Complete ---');
};

if (require.main === module) {
  createAcademicAndFeedbackTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createAcademicAndFeedbackTables };
