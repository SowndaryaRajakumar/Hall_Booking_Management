const pool = require('../config/db');

/**
 * Migration to create smart venue management tables:
 * 1. Alter `bookings` table to add `recurring_group_id` if missing
 * 2. `booking_audit_logs` table
 * 3. `recurring_bookings` table
 */
const createSmartVenueTables = async () => {
  // 1. Check and add recurring_group_id to bookings table
  const [columns] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'recurring_group_id'");
  if (columns.length === 0) {
    await pool.query(
      "ALTER TABLE bookings ADD COLUMN recurring_group_id VARCHAR(64) NULL AFTER remarks"
    );
    console.log("Added recurring_group_id column to bookings table.");
  }

  // Also ensure staff_id exists on bookings and has an index
  const [staffIdCol] = await pool.query("SHOW COLUMNS FROM bookings LIKE 'staff_id'");
  if (staffIdCol.length === 0) {
    await pool.query("ALTER TABLE bookings ADD COLUMN staff_id INT NOT NULL DEFAULT 0 AFTER updated_at");
  }

  // 2. Create booking_audit_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_audit_logs (
      id INT NOT NULL AUTO_INCREMENT,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      action VARCHAR(50) NOT NULL,
      old_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      details TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_booking (booking_id),
      KEY idx_audit_user (user_id),
      KEY idx_audit_action (action),
      KEY idx_audit_created (created_at),
      CONSTRAINT fk_audit_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("booking_audit_logs table checked/created.");

  // 3. Create recurring_bookings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_bookings (
      id INT NOT NULL AUTO_INCREMENT,
      recurring_group_id VARCHAR(64) NOT NULL,
      user_id INT NOT NULL,
      hall_id INT NOT NULL,
      hall_name VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      weekdays VARCHAR(100) NOT NULL,
      period_number INT NULL,
      time_from TIME NOT NULL,
      time_to TIME NOT NULL,
      total_occurrences INT NOT NULL,
      created_occurrences INT NOT NULL,
      purpose TEXT NOT NULL,
      remarks TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_recurring_group (recurring_group_id),
      KEY idx_rb_user (user_id),
      KEY idx_rb_hall (hall_id),
      CONSTRAINT fk_rb_user FOREIGN KEY (user_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_rb_hall FOREIGN KEY (hall_id) REFERENCES Halls(HallID) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log("recurring_bookings table checked/created.");
};

if (require.main === module) {
  createSmartVenueTables()
    .then(() => {
      console.log("Smart venue tables migration completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { createSmartVenueTables };
