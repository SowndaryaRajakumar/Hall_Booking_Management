const pool = require('../config/db');

async function updateVenueFeedbackSchema() {
  console.log('[Migration] Updating venue_feedback table schema...');
  try {
    // 1. Modify status ENUM to include ESCALATED
    await pool.query(`
      ALTER TABLE venue_feedback 
      MODIFY COLUMN status ENUM('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN'
    `);

    // 2. Add columns if not already present
    const [cols] = await pool.query('SHOW COLUMNS FROM venue_feedback');
    const existing = new Set(cols.map((c) => c.Field));

    if (!existing.has('department_id')) {
      await pool.query('ALTER TABLE venue_feedback ADD COLUMN department_id INT NULL AFTER submitted_by');
    }

    if (!existing.has('feedback_date')) {
      await pool.query('ALTER TABLE venue_feedback ADD COLUMN feedback_date DATE NULL AFTER related_booking_id');
    }

    if (!existing.has('escalated_by')) {
      await pool.query('ALTER TABLE venue_feedback ADD COLUMN escalated_by INT NULL AFTER resolved_at');
    }

    if (!existing.has('escalated_at')) {
      await pool.query('ALTER TABLE venue_feedback ADD COLUMN escalated_at TIMESTAMP NULL AFTER escalated_by');
    }

    if (!existing.has('escalation_reason')) {
      await pool.query('ALTER TABLE venue_feedback ADD COLUMN escalation_reason TEXT NULL AFTER escalated_at');
    }

    // 3. Ensure permissions for feedback escalation and department feedback
    const newPermissions = [
      ['VIEW_VENUE_HISTORY', 'View Venue Usage History', 'ACADEMIC', 'View historical venue usage and give feedback'],
      ['VIEW_DEPARTMENT_FEEDBACK', 'View Department Venue Feedback', 'VENUES', 'View feedback for department venues'],
      ['MANAGE_DEPARTMENT_FEEDBACK', 'Manage Department Venue Feedback', 'VENUES', 'Resolve or manage department feedback'],
      ['ESCALATE_VENUE_FEEDBACK', 'Escalate Venue Feedback', 'VENUES', 'Forward department issue to Master Admin'],
    ];

    for (const [key, name, cat, desc] of newPermissions) {
      await pool.query(
        `INSERT INTO permissions (permission_key, permission_name, category, description, created_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), category = VALUES(category), description = VALUES(description)`,
        [key, name, cat, desc]
      );
    }

    // Link permissions to roles
    const [allPerms] = await pool.query('SELECT id, permission_key FROM permissions');
    const permMap = new Map(allPerms.map((p) => [p.permission_key, p.id]));

    const defaultRolePerms = [
      // Master Admin gets all
      { role: 'MASTER_ADMIN', keys: ['VIEW_VENUE_HISTORY', 'VIEW_DEPARTMENT_FEEDBACK', 'MANAGE_DEPARTMENT_FEEDBACK', 'ESCALATE_VENUE_FEEDBACK', 'MANAGE_VENUE_FEEDBACK', 'SUBMIT_VENUE_FEEDBACK'] },
      // Department Admin gets department feedback + escalation + history
      { role: 'DEPARTMENT_ADMIN', keys: ['VIEW_VENUE_HISTORY', 'VIEW_DEPARTMENT_FEEDBACK', 'MANAGE_DEPARTMENT_FEEDBACK', 'ESCALATE_VENUE_FEEDBACK', 'SUBMIT_VENUE_FEEDBACK'] },
      // Faculty gets history and feedback submission
      { role: 'FACULTY', keys: ['VIEW_VENUE_HISTORY', 'SUBMIT_VENUE_FEEDBACK'] },
    ];

    for (const rp of defaultRolePerms) {
      for (const k of rp.keys) {
        const pId = permMap.get(k);
        if (pId) {
          await pool.query(
            `INSERT INTO role_permissions (role, permission_id, enabled, created_at, updated_at)
             VALUES (?, ?, 1, NOW(), NOW())
             ON DUPLICATE KEY UPDATE enabled = 1, updated_at = NOW()`,
            [rp.role, pId]
          );
        }
      }
    }

    console.log('[Migration] venue_feedback schema & permissions updated successfully.');
  } catch (error) {
    console.error('[Migration Error] Updating venue_feedback schema:', error);
    throw error;
  }
}

if (require.main === module) {
  updateVenueFeedbackSchema()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = updateVenueFeedbackSchema;
