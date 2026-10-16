const pool = require('../config/db');

async function main() {
  try {
    const [fks] = await pool.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = 'hall_booking' AND REFERENCED_TABLE_NAME = 'staff'
    `);
    console.log('--- FOREIGN KEYS REFERENCING STAFF ---');
    console.table(fks);

    const [bCols] = await pool.query(`SHOW COLUMNS FROM bookings`);
    const staffCol = bCols.find(c => c.Field.toLowerCase().includes('staff') || c.Field.toLowerCase().includes('user'))?.Field || 'user_id';
    console.log('Bookings user/staff column:', staffCol);

    const testIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    for (const id of testIds) {
      const [[sRow]] = await pool.query('SELECT email FROM staff WHERE staff_id = ?', [id]);
      if (!sRow) continue;
      const [[allocs]] = await pool.query('SELECT COUNT(*) as c FROM academic_allocations WHERE faculty_id = ?', [id]);
      const [[bookings]] = await pool.query(`SELECT COUNT(*) as c FROM bookings WHERE \`${staffCol}\` = ?`, [id]);
      const [[feedback]] = await pool.query('SELECT COUNT(*) as c FROM venue_feedback WHERE submitted_by = ? OR escalated_by = ? OR resolved_by = ?', [id, id, id]);
      const [[notifs]] = await pool.query('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?', [id]);
      console.log(`staff_id ${id} (${sRow.email}): allocs=${allocs.c}, bookings=${bookings.c}, feedback=${feedback.c}, notifs=${notifs.c}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
