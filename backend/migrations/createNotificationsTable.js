const pool = require('../config/db');

/**
 * Migration to create the notifications table.
 *
 * Relationships:
 * - User 1 --- * Notifications (via user_id referencing staff.staff_id)
 * - Booking 1 --- * Notifications (via related_booking_id referencing bookings.id)
 */
const createNotificationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'booking_update',
      related_booking_id INT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notifications_user_read (user_id, is_read),
      KEY idx_notifications_user_created (user_id, created_at),
      KEY idx_notifications_booking (related_booking_id),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_booking FOREIGN KEY (related_booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(query);
  console.log('Notifications table checked/created successfully.');
};

if (require.main === module) {
  createNotificationsTable()
    .then(() => {
      console.log('Migration completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createNotificationsTable };
