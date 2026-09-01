const pool = require('../config/db');

const DEFAULT_VENUE_TYPES = [
  'Classroom',
  'Smart Classroom',
  'Laboratory',
  'Computer Lab',
  'Seminar Hall',
  'Auditorium',
  'Conference Room',
  'Workshop',
];

const DEFAULT_FACILITIES = [
  'Air Conditioner', 'Projector', 'Smart Board', 'WiFi',
  'Speaker System', 'Podium', 'White Board', 'CCTV',
];

const ensureMasterData = async () => {
  // The staff table predates the faculty profile screen. Keep these fields
  // nullable so existing faculty records remain valid after the migration.
  const [staffColumns] = await pool.query('SHOW COLUMNS FROM staff');
  const staffColumnNames = new Set(staffColumns.map(({ Field }) => Field));
  const profileColumns = [
    ['phone', 'VARCHAR(30) NULL'],
    ['designation', 'VARCHAR(150) NULL'],
    ['employee_id', 'VARCHAR(100) NULL'],
    ['profile_image', 'VARCHAR(500) NULL'],
  ];
  for (const [name, definition] of profileColumns) {
    if (!staffColumnNames.has(name)) {
      await pool.query(`ALTER TABLE staff ADD COLUMN ${name} ${definition}`);
    }
  }
  if (!staffColumnNames.has('auth_version')) {
    await pool.query('ALTER TABLE staff ADD COLUMN auth_version INT NOT NULL DEFAULT 0');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_change_verifications (
      id INT NOT NULL AUTO_INCREMENT,
      staff_id INT NOT NULL,
      purpose VARCHAR(50) NOT NULL DEFAULT 'password_change',
      otp_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      verified_at DATETIME NULL,
      change_token_hash CHAR(64) NULL,
      change_token_expires_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_change_staff_purpose (staff_id, purpose),
      CONSTRAINT fk_password_change_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [departmentColumns] = await pool.query("SHOW COLUMNS FROM Departments LIKE 'IsActive'");
  if (departmentColumns.length === 0) {
    await pool.query('ALTER TABLE Departments ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1 AFTER DeptCode');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_types (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      IsActive TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_venue_types_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [existingTypeRows] = await pool.query(
    "SELECT DISTINCT TRIM(VenueType) AS name FROM Halls WHERE VenueType IS NOT NULL AND TRIM(VenueType) <> ''"
  );
  const names = new Set([...DEFAULT_VENUE_TYPES, ...existingTypeRows.map((row) => row.name)]);

  for (const name of names) {
    await pool.query('INSERT IGNORE INTO venue_types (name) VALUES (?)', [name]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_facilities (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      IsActive TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_venue_facilities_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_facility_mapping (
      venue_id INT NOT NULL,
      facility_id INT NOT NULL,
      PRIMARY KEY (venue_id, facility_id),
      CONSTRAINT fk_vfm_venue FOREIGN KEY (venue_id) REFERENCES Halls(HallID) ON DELETE CASCADE,
      CONSTRAINT fk_vfm_facility FOREIGN KEY (facility_id) REFERENCES venue_facilities(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  for (const name of DEFAULT_FACILITIES) await pool.query('INSERT IGNORE INTO venue_facilities (name) VALUES (?)', [name]);

  // One-time-safe backfill from the legacy Hall flag columns. INSERT IGNORE makes this idempotent.
  const legacyFacilities = [
    ['Air Conditioner', 'HasAC'], ['Projector', 'HasProjector'], ['Smart Board', 'HasSmartBoard'], ['WiFi', 'HasWiFi'],
    ['Speaker System', 'HasSpeaker'], ['Podium', 'HasPodium'], ['White Board', 'HasWhiteBoard'], ['CCTV', 'HasCCTV'],
  ];
  for (const [name, column] of legacyFacilities) {
    await pool.query(`INSERT IGNORE INTO venue_facility_mapping (venue_id, facility_id)
      SELECT h.HallID, f.id FROM Halls h JOIN venue_facilities f ON f.name = ? WHERE h.${column} = 1`, [name]);
  }
};

if (require.main === module) {
  ensureMasterData()
    .then(() => console.log('Department and venue type master data is ready.'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { ensureMasterData };
