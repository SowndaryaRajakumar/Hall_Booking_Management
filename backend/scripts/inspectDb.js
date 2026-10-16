const pool = require('../config/db');

async function inspect() {
  try {
    const [hallsDesc] = await pool.query('DESCRIBE halls');
    console.log('--- halls columns ---');
    hallsDesc.forEach(r => console.log(`${r.Field} | ${r.Type} | Null=${r.Null} | Default=${r.Default}`));

    const [venues] = await pool.query('SELECT HallID, HallName, ownership_type, DeptID, approval_role FROM halls');
    console.log('\n--- halls records (sample) ---');
    console.table(venues);

    const [users] = await pool.query('SELECT staff_id, full_name, email, role, department_id, department, status FROM staff');
    console.log('\n--- staff users ---');
    console.table(users);

    const [allocs] = await pool.query('SELECT id, faculty_id, venue_id, subject_name, status FROM academic_allocations LIMIT 10');
    console.log('\n--- academic_allocations ---');
    console.table(allocs);

    const [feedback] = await pool.query('SELECT id, venue_id, type, priority, status, subject, submitted_by, department_id, escalated_by FROM venue_feedback LIMIT 10');
    console.log('\n--- venue_feedback ---');
    console.table(feedback);
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    process.exit(0);
  }
}

inspect();
