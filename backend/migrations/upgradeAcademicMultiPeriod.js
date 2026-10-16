const pool = require('../config/db');

/**
 * Migration: Ensures unique index on academic_allocation_rules
 * to prevent duplicate weekday-period mappings per allocation,
 * while preserving all existing allocation and rule records.
 */
const upgradeAcademicMultiPeriod = async () => {
  console.log('--- Checking Academic Multi-Period Database Constraints ---');
  try {
    const [indexes] = await pool.query(
      "SHOW INDEX FROM academic_allocation_rules WHERE Key_name = 'uq_alloc_day_period'"
    );

    if (!indexes.length) {
      await pool.query(
        'ALTER TABLE academic_allocation_rules ADD UNIQUE KEY uq_alloc_day_period (allocation_id, day_index, period_id)'
      );
      console.log('[OK] Added unique constraint uq_alloc_day_period to academic_allocation_rules.');
    } else {
      console.log('[OK] uq_alloc_day_period already exists.');
    }

    console.log('--- Academic Multi-Period Migration Complete ---');
  } catch (error) {
    console.error('Migration error in upgradeAcademicMultiPeriod:', error.message);
    throw error;
  }
};

if (require.main === module) {
  upgradeAcademicMultiPeriod()
    .then(() => {
      console.log('Migration script completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { upgradeAcademicMultiPeriod };
