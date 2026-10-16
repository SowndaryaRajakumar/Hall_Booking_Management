/**
 * Safe Database Cleanup & Data Normalization Script
 * Follows all PART 9 - PART 12 rules:
 * - Preserves protected accounts: Alice (7), Bob (8), CSE Admin (9), Main Master Admin (2 & 10)
 * - Safely removes generated test accounts (cse_prof_*, cse_admin_test_*, cse_faculty_test_*)
 * - Checks & clears dependent test records first to maintain foreign key integrity
 * - Validates venue ownership (COMMON -> DeptID = NULL, DEPARTMENT -> valid DeptID)
 * - Normalizes staff roles and departments
 * - NEVER uses DROP DATABASE, DROP TABLE, TRUNCATE, or arbitrary deletes.
 */

const pool = require('../config/db');

async function cleanupTestData() {
  const connection = await pool.getConnection();
  try {
    console.log('=== STARTING SAFE DATA CLEANUP & AUDIT ===\n');
    await connection.beginTransaction();

    // 1. Identify Protected Accounts
    const PROTECTED_EMAILS = [
      'alice@nec.edu.in',
      'bob@nec.edu.in',
      'cseadmin@nec.edu.in',
      'admin@nec.edu.in',
      'masteradmin@college.edu',
    ];

    console.log('1. Verifying Protected Accounts:');
    const [protectedRows] = await connection.query(
      'SELECT staff_id, full_name, email, role, department, department_id, status FROM staff WHERE email IN (?)',
      [PROTECTED_EMAILS]
    );

    const protectedIds = protectedRows.map((r) => r.staff_id);
    console.log(`   Found ${protectedRows.length} protected accounts:`);
    protectedRows.forEach((r) => {
      console.log(`   - ID ${r.staff_id}: ${r.full_name} (${r.email}) [${r.role}] Dept: ${r.department_id || 'NULL'}`);
    });

    if (protectedRows.length < 4) {
      throw new Error('Safety abort: One or more required protected accounts are missing!');
    }

    // 2. Normalize Master Admin and Protected Account Roles / Departments
    console.log('\n2. Normalizing Protected Accounts:');
    // Ensure admin@nec.edu.in has department_id = NULL and role = MASTER_ADMIN
    await connection.query(
      `UPDATE staff
       SET role = 'MASTER_ADMIN', department = NULL, department_id = NULL, status = 'active'
       WHERE email = 'admin@nec.edu.in'`
    );
    console.log('   - admin@nec.edu.in normalized: MASTER_ADMIN, DeptID = NULL');

    // Ensure masteradmin@college.edu has department_id = NULL and role = MASTER_ADMIN
    await connection.query(
      `UPDATE staff
       SET role = 'MASTER_ADMIN', department = NULL, department_id = NULL, status = 'active'
       WHERE email = 'masteradmin@college.edu'`
    );
    console.log('   - masteradmin@college.edu normalized: MASTER_ADMIN, DeptID = NULL');

    // Ensure Alice is FACULTY in Computer Science (dept 1)
    await connection.query(
      `UPDATE staff
       SET role = 'FACULTY', department = 'Computer Science', department_id = 1, status = 'active'
       WHERE email = 'alice@nec.edu.in'`
    );
    console.log('   - alice@nec.edu.in normalized: FACULTY, DeptID = 1 (Computer Science)');

    // Ensure Bob is FACULTY in Computer Science (dept 1)
    await connection.query(
      `UPDATE staff
       SET role = 'FACULTY', department = 'Computer Science', department_id = 1, status = 'active'
       WHERE email = 'bob@nec.edu.in'`
    );
    console.log('   - bob@nec.edu.in normalized: FACULTY, DeptID = 1 (Computer Science)');

    // Ensure CSE Admin is DEPARTMENT_ADMIN in Computer Science (dept 1)
    await connection.query(
      `UPDATE staff
       SET role = 'DEPARTMENT_ADMIN', department = 'Computer Science', department_id = 1, status = 'active'
       WHERE email = 'cseadmin@nec.edu.in'`
    );
    console.log('   - cseadmin@nec.edu.in normalized: DEPARTMENT_ADMIN, DeptID = 1 (Computer Science)');

    // Normalize staff_id on bookings for Alice and Bob
    await connection.query("UPDATE bookings SET staff_id = 7 WHERE staff_email = 'alice@nec.edu.in' AND (staff_id = 0 OR staff_id IS NULL)");
    await connection.query("UPDATE bookings SET staff_id = 8 WHERE LOWER(staff_email) = 'bob@nec.edu.in' AND (staff_id = 0 OR staff_id IS NULL)");
    console.log('   - Synchronized historical booking staff_ids for Alice & Bob.');

    // 3. Identify Unwanted Test Accounts to Delete Safely
    console.log('\n3. Identifying Unwanted Test Accounts:');
    const [testStaffRows] = await connection.query(
      `SELECT staff_id, full_name, email, role
       FROM staff
       WHERE email LIKE 'cse_prof_%'
          OR email LIKE 'cse_admin_test_%'
          OR email LIKE 'cse_faculty_test_%'
          OR email IN ('cseadmin@college.edu', 'faculty@college.edu')`
    );

    const unwantedIds = testStaffRows
      .map((r) => r.staff_id)
      .filter((id) => !protectedIds.includes(id));

    console.log(`   Found ${unwantedIds.length} unwanted test accounts to remove:`);
    testStaffRows.forEach((r) => {
      console.log(`   - ID ${r.staff_id}: ${r.email} (${r.role})`);
    });

    if (unwantedIds.length > 0) {
      console.log('\n4. Resolving Dependencies of Unwanted Accounts:');

      // Reassign or delete academic allocations belonging to unwanted accounts
      // If allocation belongs to faculty@college.edu (staff_id 12), reassign to Alice (7)
      const [reassignedAllocs] = await connection.query(
        'UPDATE academic_allocations SET faculty_id = 7 WHERE faculty_id IN (?)',
        [unwantedIds]
      );
      if (reassignedAllocs.affectedRows > 0) {
        console.log(`   - Reassigned ${reassignedAllocs.affectedRows} allocation(s) from test accounts to Alice.`);
      }

      await connection.query(
        'UPDATE academic_allocations SET created_by = 9 WHERE created_by IN (?)',
        [unwantedIds]
      );
      await connection.query(
        'UPDATE academic_allocations SET approved_by = 9 WHERE approved_by IN (?)',
        [unwantedIds]
      );
      await connection.query(
        'UPDATE academic_allocation_occurrences SET alternate_faculty_id = NULL WHERE alternate_faculty_id IN (?)',
        [unwantedIds]
      );

      // Clean notifications for unwanted accounts
      const [delNotifs] = await connection.query(
        'DELETE FROM notifications WHERE user_id IN (?)',
        [unwantedIds]
      );
      console.log(`   - Removed ${delNotifs.affectedRows} notifications linked to test accounts.`);

      // Clean notification preferences
      await connection.query(
        'DELETE FROM notification_preferences WHERE user_id IN (?)',
        [unwantedIds]
      );

      // Clean user permissions
      await connection.query(
        'DELETE FROM user_permissions WHERE user_id IN (?)',
        [unwantedIds]
      );

      // Clean booking audit logs
      await connection.query(
        'DELETE FROM booking_audit_logs WHERE user_id IN (?)',
        [unwantedIds]
      );

      // Clean recurring bookings
      await connection.query(
        'DELETE FROM recurring_bookings WHERE user_id IN (?)',
        [unwantedIds]
      );

      // Clean password change verifications
      await connection.query(
        'DELETE FROM password_change_verifications WHERE staff_id IN (?)',
        [unwantedIds]
      );

      // Clean venue feedback
      await connection.query(
        'UPDATE venue_feedback SET escalated_by = NULL WHERE escalated_by IN (?)',
        [unwantedIds]
      );
      await connection.query(
        'UPDATE venue_feedback SET resolved_by = NULL WHERE resolved_by IN (?)',
        [unwantedIds]
      );
      await connection.query(
        'DELETE FROM venue_feedback WHERE submitted_by IN (?)',
        [unwantedIds]
      );

      // Finally, delete the unwanted staff records
      const [delStaff] = await connection.query(
        'DELETE FROM staff WHERE staff_id IN (?)',
        [unwantedIds]
      );
      console.log(`   - Successfully removed ${delStaff.affectedRows} test staff accounts.`);
    }

    // 5. Clean test / dummy bookings (e.g., test@x.com)
    console.log('\n5. Cleaning Unwanted Test Bookings:');
    const [delBookings] = await connection.query(
      "DELETE FROM bookings WHERE staff_email IN ('test@x.com', 'test@nec.edu.in') OR staff_name = 'Test'"
    );
    console.log(`   - Removed ${delBookings.affectedRows} orphan/dummy test bookings.`);

    // 6. Venue Ownership Validation (Part 12)
    console.log('\n6. Validating and Enforcing Venue Ownership:');
    // COMMON: DeptID must be NULL, approval_role = MASTER_ADMIN
    const [commonVenuesFix] = await connection.query(
      `UPDATE halls
       SET DeptID = NULL, approval_role = 'MASTER_ADMIN'
       WHERE ownership_type = 'COMMON'`
    );
    console.log(`   - Enforced DeptID = NULL and MASTER_ADMIN approval on COMMON venues (affected: ${commonVenuesFix.affectedRows}).`);

    // DEPARTMENT: DeptID must NOT be NULL
    // Ensure all DEPARTMENT venues have valid DeptID (default to 1 if NULL)
    const [deptVenuesFix] = await connection.query(
      `UPDATE halls
       SET DeptID = 1
       WHERE ownership_type = 'DEPARTMENT' AND DeptID IS NULL`
    );
    console.log(`   - Enforced valid DeptID on DEPARTMENT venues (affected: ${deptVenuesFix.affectedRows}).`);

    // Ensure ECE Circuit Lab 8 references DeptID 7 (ECE)
    await connection.query(
      "UPDATE halls SET DeptID = 7 WHERE HallName LIKE 'ECE Circuit Lab%' AND DeptID != 7"
    );

    // 7. Duplicate Data Audit (Part 11)
    console.log('\n7. Auditing Duplicates:');
    // Audit staff duplicate emails
    const [dupEmails] = await connection.query(
      'SELECT email, COUNT(*) as count FROM staff GROUP BY email HAVING count > 1'
    );
    if (dupEmails.length > 0) {
      console.log('   Warning: Duplicate emails found:', dupEmails);
    } else {
      console.log('   - 0 duplicate email addresses found.');
    }

    // Audit venue duplicates
    const [dupVenues] = await connection.query(
      'SELECT HallName, DeptID, ownership_type, COUNT(*) as count FROM halls GROUP BY HallName, DeptID, ownership_type HAVING count > 1'
    );
    if (dupVenues.length > 0) {
      console.log('   Warning: Duplicate venues found:', dupVenues);
    } else {
      console.log('   - 0 duplicate venues found.');
    }

    await connection.commit();
    console.log('\n=== TRANSACTION COMMITTED SUCCESSFULLY ===\n');

    // 8. Verification Report
    console.log('8. Verification of Remaining Staff:');
    const [finalStaff] = await pool.query(
      'SELECT staff_id, full_name, email, role, department, department_id, status FROM staff ORDER BY staff_id'
    );
    console.table(finalStaff);

    console.log('9. Verification of Venues:');
    const [finalHalls] = await pool.query(
      'SELECT HallID, HallName, ownership_type, DeptID, approval_role FROM halls ORDER BY HallID'
    );
    console.table(finalHalls);

    console.log('\nCleanup script completed safely and successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('\nCLEANUP FAILED - TRANSACTION ROLLED BACK:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

cleanupTestData();
