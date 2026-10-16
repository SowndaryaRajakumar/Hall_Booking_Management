const pool = require('../config/db');
const { getFacultyVenueUsageHistory } = require('../services/venueHistoryService');

async function test() {
  try {
    const [staff] = await pool.query("SELECT staff_id, email, full_name, role FROM staff WHERE full_name LIKE '%Alice%' OR role = 'FACULTY' LIMIT 2");
    console.log('Faculty staff:', staff);
    for (const f of staff) {
      console.log(`Testing for ${f.full_name} (${f.staff_id}):`);
      const res = await getFacultyVenueUsageHistory({
        facultyId: f.staff_id,
        facultyEmail: f.email,
      });
      console.log('Result total:', res.total, 'sample:', res.data.slice(0, 2));
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    process.exit(0);
  }
}

test();
