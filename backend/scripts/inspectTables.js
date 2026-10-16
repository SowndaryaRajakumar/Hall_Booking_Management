const pool = require('../config/db');

async function inspectTables() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables);

    const [adminRows] = await pool.query("SELECT staff_id, full_name, email, role, department_id, department, password FROM staff WHERE role = 'MASTER_ADMIN'");
    console.log('Master admin staff rows:', adminRows);

    const [halls] = await pool.query("SELECT HallID, HallName, Location, Capacity, VenueType, ownership_type, DeptID FROM halls");
    console.log('All halls:');
    console.table(halls);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

inspectTables();
