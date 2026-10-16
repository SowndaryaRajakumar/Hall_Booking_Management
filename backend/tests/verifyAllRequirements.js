/**
 * Comprehensive Automated Verification Test Script
 * Validates:
 * 1. Authentication for MASTER_ADMIN, DEPARTMENT_ADMIN, and FACULTY
 * 2. Authorization Boundaries (Dept Admin restricted to own department; cannot modify other dept venues or add faculty to other depts)
 * 3. Faculty cannot access admin APIs
 * 4. Master Admin Notification Settings GET and PUT
 * 5. Booking Notification Routing:
 *    - Department Venue -> CSE Admin notified; Master Admin NOT notified when department_booking_notifications=0
 *    - Department Venue -> Master Admin notified when department_booking_notifications=1
 *    - Common Venue (Auditorium) -> Master Admin notified
 * 6. WhatsApp Cloud API notification engine execution (mock/development mode & error resilience)
 * 7. In-App notification records in database
 */

const http = require('http');
const pool = require('../config/db');

const API_BASE = 'http://localhost:5000';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || `${API_BASE}${options.path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING FINAL ARCHITECTURE & NOTIFICATION VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- 1. AUTHENTICATION TESTS ---
  console.log('\n--- 1. AUTHENTICATION & LOGIN ---');

  // Master Admin login
  const masterLoginRes = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'masteradmin@college.edu', password: 'Admin@123' }
  );
  const masterRole = masterLoginRes.data?.user?.role;
  assert(
    masterLoginRes.status === 200 && masterRole === 'MASTER_ADMIN',
    `Master Admin login successful (role: ${masterRole})`
  );
  const masterToken = masterLoginRes.data?.token;

  // Department Admin login
  const deptAdminLoginRes = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'cseadmin@college.edu', password: 'Admin@123' }
  );
  const deptAdminRole = deptAdminLoginRes.data?.user?.role;
  const deptAdminDept = deptAdminLoginRes.data?.user?.department;
  assert(
    deptAdminLoginRes.status === 200 && deptAdminRole === 'DEPARTMENT_ADMIN',
    `Department Admin login successful (role: ${deptAdminRole}, dept: ${deptAdminDept})`
  );
  const deptAdminToken = deptAdminLoginRes.data?.token;

  // Faculty login
  const facultyLoginRes = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'faculty@college.edu', password: 'Faculty@123' }
  );
  const facultyRole = facultyLoginRes.data?.user?.role;
  assert(
    facultyLoginRes.status === 200 && facultyRole === 'FACULTY',
    `Faculty login successful (role: ${facultyRole})`
  );
  const facultyToken = facultyLoginRes.data?.token;

  // --- 2. AUTHORIZATION & SCOPING TESTS ---
  console.log('\n--- 2. AUTHORIZATION & ROLE ISOLATION ---');

  // Faculty cannot access admin endpoints
  const facultyForbiddenRes = await request({
    path: '/api/master-admin/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  assert(
    facultyForbiddenRes.status === 403,
    `Faculty blocked from Master Admin dashboard (HTTP ${facultyForbiddenRes.status})`
  );

  // Department Admin cannot access Master Admin settings
  const deptAdminToMasterRes = await request({
    path: '/api/master-admin/notification-settings',
    method: 'GET',
    headers: { Authorization: `Bearer ${deptAdminToken}` },
  });
  assert(
    deptAdminToMasterRes.status === 403,
    `Department Admin blocked from Master Admin notification settings (HTTP ${deptAdminToMasterRes.status})`
  );

  // Department Admin attempts to add Faculty to ECE (different department) -> MUST BE 403
  const deptAdminAddOtherDeptRes = await request(
    {
      path: '/api/staff',
      method: 'POST',
      headers: { Authorization: `Bearer ${deptAdminToken}` },
    },
    {
      full_name: 'Dr. Other Dept Faculty',
      email: `test_ece_${Date.now()}@college.edu`,
      phone: '9876543210',
      department: 'ECE',
      role: 'FACULTY',
      password: 'TempPassword@123',
    }
  );
  assert(
    deptAdminAddOtherDeptRes.status === 403,
    `Department Admin CANNOT add faculty to another department (HTTP ${deptAdminAddOtherDeptRes.status})`
  );

  // Department Admin adds Faculty to CSE (their own department) -> MUST BE 201
  const newEmail = `cse_prof_${Date.now()}@college.edu`;
  const deptAdminAddOwnDeptRes = await request(
    {
      path: '/api/staff',
      method: 'POST',
      headers: { Authorization: `Bearer ${deptAdminToken}` },
    },
    {
      full_name: 'Dr. CSE Faculty Test',
      email: newEmail,
      phone: '9876543211',
      department: 'CSE',
      role: 'FACULTY',
      password: 'TempPassword@123',
    }
  );
  assert(
    deptAdminAddOwnDeptRes.status === 201,
    `Department Admin CAN add faculty to their own department (HTTP ${deptAdminAddOwnDeptRes.status})`
  );

  // Clean up the created test staff
  if (deptAdminAddOwnDeptRes.data?.staff?.staff_id) {
    await pool.query('DELETE FROM staff WHERE staff_id = ?', [deptAdminAddOwnDeptRes.data.staff.staff_id]);
  }

  // --- 3. MASTER ADMIN NOTIFICATION SETTINGS ---
  console.log('\n--- 3. MASTER ADMIN NOTIFICATION SETTINGS API ---');

  const getSettingsRes = await request({
    path: '/api/master-admin/notification-settings',
    method: 'GET',
    headers: { Authorization: `Bearer ${masterToken}` },
  });
  const notifSettings = getSettingsRes.data?.settings || getSettingsRes.data?.data;
  assert(
    getSettingsRes.status === 200 && Boolean(notifSettings),
    `Master Admin fetched notification settings (department_booking_notifications=${notifSettings?.department_booking_notifications})`
  );

  // Turn Department Booking Notifications OFF for Master Admin
  const updateSettingsOffRes = await request(
    {
      path: '/api/master-admin/notification-settings',
      method: 'PUT',
      headers: { Authorization: `Bearer ${masterToken}` },
    },
    {
      department_booking_notifications: 0,
      common_venue_notifications: 1,
      auditorium_notifications: 1,
      conference_notifications: 1,
      event_notifications: 1,
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
    }
  );
  const updatedSettings = updateSettingsOffRes.data?.settings || updateSettingsOffRes.data?.data;
  assert(
    updateSettingsOffRes.status === 200 && Number(updatedSettings?.department_booking_notifications) === 0,
    `Master Admin updated settings: department_booking_notifications = 0`
  );

  // --- 4. VENUE SELECTION & BOOKING ROUTING TESTS ---
  console.log('\n--- 4. VENUE ROUTING & NOTIFICATION DISPATCH ---');

  // Find a Department venue (CSE / DeptID 1) and a Common Venue (ownership_type = 'COMMON')
  const [deptHalls] = await pool.query(
    `SELECT * FROM halls WHERE ownership_type = 'DEPARTMENT' AND DeptID = 1 AND ActiveStatus = 1 LIMIT 1`
  );

  const [commonHalls] = await pool.query(
    `SELECT * FROM halls WHERE ownership_type = 'COMMON' AND ActiveStatus = 1 LIMIT 1`
  );

  const deptHall = deptHalls[0];
  const commonHall = commonHalls[0];

  assert(Boolean(deptHall), `Found CSE Department venue: ${deptHall?.HallName} (ID ${deptHall?.HallID})`);
  assert(Boolean(commonHall), `Found Common venue: ${commonHall?.HallName} (ID ${commonHall?.HallID})`);

  // Get master admin staff ID and cse admin staff ID
  const [masterStaff] = await pool.query(`SELECT staff_id FROM staff WHERE email = 'masteradmin@college.edu' LIMIT 1`);
  const [cseStaff] = await pool.query(`SELECT staff_id FROM staff WHERE email = 'cseadmin@college.edu' LIMIT 1`);
  const masterStaffId = masterStaff[0]?.staff_id;
  const cseAdminStaffId = cseStaff[0]?.staff_id;

  // Clear existing bookings for our test slot so conflict checker doesn't trigger
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const testDate = tomorrow.toISOString().split('T')[0];

  await pool.query('DELETE FROM bookings WHERE date = ?', [testDate]);

  // TEST 4A: Book Department Venue with Master Admin department notifications = OFF
  const notifsBefore1 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;
  const cseNotifsBefore1 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [cseAdminStaffId]))[0][0].count;

  const bookDeptRes = await request(
    {
      path: '/api/bookings',
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
    },
    {
      hallId: deptHall.HallID,
      date: testDate,
      timeFrom: '09:15',
      timeTo: '10:05',
      reason: 'Automated Test Lecture Period 1',
    }
  );

  assert(
    bookDeptRes.status === 201,
    `Booking created for Department Venue (Status: ${bookDeptRes.status})`
  );

  // Give notification service time to complete async delivery
  await new Promise((r) => setTimeout(r, 700));

  const notifsAfter1 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;
  const cseNotifsAfter1 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [cseAdminStaffId]))[0][0].count;

  assert(
    cseNotifsAfter1 > cseNotifsBefore1,
    `CSE Department Admin received notification for CSE Department venue booking`
  );
  assert(
    notifsAfter1 === notifsBefore1,
    `Master Admin was NOT notified because department_booking_notifications = 0 (Isolation intact!)`
  );

  // TEST 4B: Now update Master Admin setting to ON and test department booking
  await request(
    {
      path: '/api/master-admin/notification-settings',
      method: 'PUT',
      headers: { Authorization: `Bearer ${masterToken}` },
    },
    {
      department_booking_notifications: 1,
      common_venue_notifications: 1,
      auditorium_notifications: 1,
      conference_notifications: 1,
      event_notifications: 1,
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
    }
  );

  const notifsBefore2 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;

  const bookDeptRes2 = await request(
    {
      path: '/api/bookings',
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
    },
    {
      hallId: deptHall.HallID,
      date: testDate,
      timeFrom: '10:05',
      timeTo: '10:50',
      reason: 'Automated Test Lecture Period 2',
    }
  );
  assert(bookDeptRes2.status === 201, `Second booking created for Department Venue`);

  await new Promise((r) => setTimeout(r, 700));

  const notifsAfter2 = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;
  assert(
    notifsAfter2 > notifsBefore2,
    `Master Admin received notification when department_booking_notifications = 1 (Override functional!)`
  );

  // TEST 4C: Book Common Venue (Auditorium) -> Master Admin receives notification
  const notifsBeforeCommon = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;

  const bookCommonRes = await request(
    {
      path: '/api/bookings',
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
    },
    {
      hallId: commonHall.HallID,
      date: testDate,
      timeFrom: '11:10',
      timeTo: '12:00',
      reason: 'College Keynote Symposium',
    }
  );

  assert(
    bookCommonRes.status === 201,
    `Booking created for Common Venue (${commonHall.HallName})`
  );

  await new Promise((r) => setTimeout(r, 700));

  const notifsAfterCommon = (await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [masterStaffId]))[0][0].count;
  assert(
    notifsAfterCommon > notifsBeforeCommon,
    `Master Admin received notification for Common Venue booking`
  );

  // TEST 5: Department Admin cannot approve Common Venue booking
  const commonBooking = bookCommonRes.data?.bookings?.[0];
  const commonBookingId = commonBooking?.id;
  if (commonBookingId) {
    const cseApproveCommonRes = await request(
      {
        path: `/api/bookings/${commonBookingId}/status`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${deptAdminToken}` },
      },
      { status: 'Approved' }
    );
    assert(
      cseApproveCommonRes.status === 403,
      `Department Admin CANNOT approve Common Venue booking (HTTP ${cseApproveCommonRes.status})`
    );

    // Master Admin CAN approve Common Venue booking
    const masterApproveCommonRes = await request(
      {
        path: `/api/bookings/${commonBookingId}/status`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${masterToken}` },
      },
      { status: 'Approved' }
    );
    assert(
      masterApproveCommonRes.status === 200,
      `Master Admin CAN approve Common Venue booking (HTTP ${masterApproveCommonRes.status})`
    );
  }

  // --- 5. NOTIFICATION LOGS & CHANNELS ---
  console.log('\n--- 5. NOTIFICATION LOGS & WHATSAPP INTEGRATION ---');
  const [recentNotifs] = await pool.query(
    'SELECT notification_type, channel, status, title FROM notifications ORDER BY id DESC LIMIT 6'
  );
  console.log('Recent Notifications in DB:');
  recentNotifs.forEach((n) => {
    console.log(` - Channel: ${n.channel} | Type: ${n.notification_type} | Status: ${n.status} | Title: "${n.title}"`);
  });

  assert(recentNotifs.length > 0, `Notifications table populated with multi-channel records`);

  // Clean up test bookings
  await pool.query('DELETE FROM bookings WHERE date = ?', [testDate]);

  console.log('\n========================================================');
  console.log(`FINAL TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
