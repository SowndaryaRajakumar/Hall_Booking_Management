const pool = require('../config/db');

async function seedCommonVenues() {
  try {
    // 1. Make DeptID nullable in halls so Common venues can have DeptID = NULL
    try {
      await pool.query('ALTER TABLE halls MODIFY COLUMN DeptID INT NULL');
      console.log('[OK] Altered halls.DeptID to NULL.');
    } catch (e) {
      console.log('DeptID alter notice:', e.message);
    }

    // 2. Check if Common venues exist
    const [common] = await pool.query("SELECT HallID, HallName FROM halls WHERE ownership_type = 'COMMON'");
    if (common.length === 0) {
      await pool.query(`
        INSERT INTO halls (HallName, Location, Capacity, VenueType, ownership_type, category, approval_role, DeptID, ActiveStatus)
        VALUES 
        ('Main College Auditorium', 'Main Campus Block A', 500, 'Auditorium', 'COMMON', 'AUDITORIUM', 'MASTER_ADMIN', NULL, 1),
        ('Executive Conference Hall', 'Administrative Block 2nd Floor', 80, 'Conference Hall', 'COMMON', 'CONFERENCE', 'MASTER_ADMIN', NULL, 1),
        ('Central Seminar Hall', 'Central Library 1st Floor', 150, 'Seminar Hall', 'COMMON', 'SEMINAR', 'MASTER_ADMIN', NULL, 1)
      `);
      console.log('[OK] Seeded 3 Common venues: Auditorium, Conference Hall, Seminar Hall.');
    } else {
      console.log('[OK] Common venues already exist:', common.length);
    }

    // 3. Grant default access to all departments for common venues in venue_access table
    const [allDepts] = await pool.query('SELECT DeptID FROM departments');
    const [allCommon] = await pool.query("SELECT HallID FROM halls WHERE ownership_type = 'COMMON'");

    for (const v of allCommon) {
      for (const d of allDepts) {
        await pool.query(`
          INSERT IGNORE INTO venue_access (venue_id, department_id, access_type, status)
          VALUES (?, ?, 'ALLOWED', 1)
        `, [v.HallID, d.DeptID]);
      }
    }
    console.log('[OK] Granted default venue_access for common venues to all departments.');

  } catch (err) {
    console.error('Error seeding common venues:', err);
    throw err;
  }
}

if (require.main === module) {
  seedCommonVenues().then(() => {
    console.log('Seed common venues finished.');
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seedCommonVenues };
