const pool = require('../config/db');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const hash = await bcrypt.hash('Password@123', 10);
    await pool.query('UPDATE staff SET password = ?, is_first_login = 0 WHERE email = ?', [hash, 'masteradmin@college.edu']);
    console.log('Password updated successfully for masteradmin@college.edu');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
