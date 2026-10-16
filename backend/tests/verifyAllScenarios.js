const http = require('http');

const API_BASE = 'http://localhost:5000/api';

const request = (method, endpoint, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('=== STARTING COMPLETE SCENARIO VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    // PREPARATION: Login as Master Admin
    const masterLoginRes = await request('POST', '/auth/login', {
      email: 'masteradmin@college.edu',
      password: 'Password@123',
    });
    assert(masterLoginRes.status === 200 && masterLoginRes.data.token, 'Master Admin Login', JSON.stringify(masterLoginRes.data));
    const masterToken = masterLoginRes.data.token;

    // TEST 1: Open Department Admin Management. Expected: Only Department Admins.
    const deptAdminsRes = await request('GET', '/master-admin/department-admins', null, masterToken);
    assert(deptAdminsRes.status === 200, 'TEST 1: Get Department Admins returns 200');
    const allAdminsAreDeptAdmin = deptAdminsRes.data.data.every((u) => u.role === 'DEPARTMENT_ADMIN');
    assert(allAdminsAreDeptAdmin, 'TEST 1: All returned users have role = DEPARTMENT_ADMIN (no faculty, no master admin)');

    // TEST 2: Add a new Department Admin: CSE Admin.
    const uniqueEmail = `cse_admin_test_${Date.now()}@college.edu`;
    const addDeptAdminRes = await request('POST', '/master-admin/department-admins', {
      fullName: 'Prof. CSE Head Admin',
      email: uniqueEmail,
      password: 'Password@123',
      departmentId: 1, // Computer Science
      phone: '+919988776655',
      designation: 'HOD',
      employeeId: `CSE-ADMIN-${Date.now() % 10000}`,
    }, masterToken);
    assert(addDeptAdminRes.status === 201, 'TEST 2: Add Department Admin returns 201 Created', JSON.stringify(addDeptAdminRes.data));
    const cseAdminId = addDeptAdminRes.data.data?.adminId || addDeptAdminRes.data.adminId;

    // Verify in database / API
    const verifyDeptAdminRes = await request('GET', `/master-admin/department-admins?search=${encodeURIComponent(uniqueEmail)}`, null, masterToken);
    const createdAdmin = verifyDeptAdminRes.data.data.find((a) => a.email === uniqueEmail);
    assert(
      createdAdmin && createdAdmin.role === 'DEPARTMENT_ADMIN' && Number(createdAdmin.department_id) === 1,
      'TEST 2: Created admin has role = DEPARTMENT_ADMIN and department_id = 1 (CSE)'
    );

    // TEST 3: Login as CSE Department Admin. Expected: Department Admin details and permissions.
    const cseLoginRes = await request('POST', '/auth/login', {
      email: uniqueEmail,
      password: 'Password@123',
    });
    assert(cseLoginRes.status === 200 && cseLoginRes.data.token, 'TEST 3: CSE Department Admin Login returns 200');
    const cseToken = cseLoginRes.data.token;
    assert(cseLoginRes.data.user.role === 'DEPARTMENT_ADMIN', 'TEST 3: CSE Admin user.role === DEPARTMENT_ADMIN');

    // Call /department-admin/dashboard
    const deptDashRes = await request('GET', '/department-admin/dashboard', null, cseToken);
    assert(deptDashRes.status === 200 && deptDashRes.data.data, 'TEST 3: Access Department Admin Dashboard returns 200');

    // TEST 4: Open Faculty Management for CSE Admin.
    const cseFacultyListRes = await request('GET', '/staff', null, cseToken);
    assert(cseFacultyListRes.status === 200, 'TEST 4: CSE Admin loads faculty list returns 200');
    const allFacultyAreCSE = cseFacultyListRes.data.data.every(
      (f) => (Number(f.department_id) === 1 || String(f.department).toLowerCase().includes('computer')) &&
             (f.role === 'FACULTY' || f.role === 'staff')
    );
    assert(allFacultyAreCSE, 'TEST 4: All faculty returned belong to CSE department and have role FACULTY');

    // TEST 5: CSE Admin adds Faculty. Expected: Database role = FACULTY, NOT DEPARTMENT_ADMIN.
    const facultyEmail = `cse_faculty_test_${Date.now()}@college.edu`;
    const addFacultyRes = await request('POST', '/staff', {
      full_name: 'Dr. Test CSE Faculty Member',
      email: facultyEmail,
      password: 'FacultyPassword@123',
      department: 'Computer Science',
      phone: '+919876543210',
      designation: 'Assistant Professor',
      employee_id: `FAC-${Date.now() % 10000}`,
      role: 'DEPARTMENT_ADMIN', // Attempt to pass another role
    }, cseToken);
    assert(addFacultyRes.status === 201, 'TEST 5: CSE Admin adds faculty returns 201 Created');

    // Verify role in database
    const verifyFacultyRes = await request('GET', `/staff?search=${encodeURIComponent(facultyEmail)}`, null, masterToken);
    const createdFaculty = verifyFacultyRes.data.data.find((f) => f.email === facultyEmail);
    assert(
      createdFaculty && createdFaculty.role === 'FACULTY',
      `TEST 5: Database role is strictly forced to FACULTY (role: ${createdFaculty?.role})`
    );

    // TEST 6: CSE Admin creates a hall. Expected: Hall belongs to CSE.
    const hallName = `CSE Innovation Lab ${Date.now() % 1000}`;
    const createHallRes = await request('POST', '/halls', {
      hallName,
      location: 'CSE Block 3rd Floor',
      capacity: 65,
      venueType: 'Laboratory',
      deptId: 1, // CSE
      ownershipType: 'DEPARTMENT',
      numberOfSystems: 65,
      activeStatus: true,
      facilityIds: [],
    }, cseToken);
    assert(createHallRes.status === 201, 'TEST 6: CSE Admin creates venue returns 201 Created', JSON.stringify(createHallRes.data));
    const createdHallId = createHallRes.data.data?.hallId;

    // TEST 7: CSE Admin cannot modify ECE hall. Expected: HTTP 403.
    // Let's create an ECE hall as Master Admin
    const eceHallRes = await request('POST', '/halls', {
      hallName: `ECE Circuit Lab ${Date.now() % 1000}`,
      location: 'ECE Block 2nd Floor',
      capacity: 40,
      venueType: 'Laboratory',
      deptId: 2, // ECE
      ownershipType: 'DEPARTMENT',
      activeStatus: true,
      facilityIds: [],
    }, masterToken);
    assert(eceHallRes.status === 201, 'Master Admin creates ECE hall for test', JSON.stringify(eceHallRes.data));
    const eceHallId = eceHallRes.data.data?.hallId;

    // Now CSE Admin tries to modify ECE hall
    const cseModifyEceRes = await request('PUT', `/halls/${eceHallId}`, {
      hallName: 'Hacked ECE Lab by CSE Admin',
      location: 'ECE Block',
      capacity: 50,
      venueType: 'Laboratory',
      deptId: 2,
    }, cseToken);
    assert(cseModifyEceRes.status === 403, `TEST 7: CSE Admin modifying ECE hall is blocked with HTTP 403 (Status: ${cseModifyEceRes.status})`);

    // TEST 7b: CSE Admin cannot delete ECE hall
    const cseDeleteEceRes = await request('DELETE', `/halls/${eceHallId}`, null, cseToken);
    assert(cseDeleteEceRes.status === 403, `TEST 7b: CSE Admin deleting other dept hall is blocked with HTTP 403 (Status: ${cseDeleteEceRes.status})`);

    // TEST 8: Master Admin disables Faculty Management (MANAGE_FACULTY = 0) for CSE Admin.
    const disablePermRes = await request('PUT', `/master-admin/department-admins/${cseAdminId}/permissions`, {
      permissions: [
        { key: 'MANAGE_FACULTY', enabled: false },
      ],
    }, masterToken);
    assert(disablePermRes.status === 200, 'TEST 8: Master Admin updates permission MANAGE_FACULTY = false in DB');

    // TEST 9: CSE Admin calls /api/auth/me or /api/auth/permissions.
    const meResDisabled = await request('GET', '/auth/me', null, cseToken);
    assert(meResDisabled.status === 200, 'TEST 9: GET /api/auth/me returns 200');
    const hasFacultyPermAfterDisable = meResDisabled.data.permissions.includes('MANAGE_FACULTY');
    assert(!hasFacultyPermAfterDisable, 'TEST 9: CSE Admin session live permissions reflect MANAGE_FACULTY is OFF');

    // TEST 10: CSE Admin hits /api/staff. Expected: HTTP 403 Forbidden.
    const accessDeniedStaffRes = await request('GET', '/staff', null, cseToken);
    assert(
      accessDeniedStaffRes.status === 403,
      `TEST 10: CSE Admin accessing /api/staff with MANAGE_FACULTY disabled gets HTTP 403 (Status: ${accessDeniedStaffRes.status})`
    );

    // TEST 11: Master Admin enables Faculty Management (MANAGE_FACULTY = 1) again.
    const enablePermRes = await request('PUT', `/master-admin/department-admins/${cseAdminId}/permissions`, {
      permissions: [
        { key: 'MANAGE_FACULTY', enabled: true },
      ],
    }, masterToken);
    assert(enablePermRes.status === 200, 'TEST 11: Master Admin updates permission MANAGE_FACULTY = true in DB');

    // TEST 12: CSE Admin refreshes session and hits /api/staff again. Expected: HTTP 200.
    const meResEnabled = await request('GET', '/auth/me', null, cseToken);
    const hasFacultyPermAfterEnable = meResEnabled.data.permissions.includes('MANAGE_FACULTY');
    assert(hasFacultyPermAfterEnable, 'TEST 12: CSE Admin session live permissions reflect MANAGE_FACULTY is ON');

    const accessAllowedStaffRes = await request('GET', '/staff', null, cseToken);
    assert(
      accessAllowedStaffRes.status === 200,
      `TEST 12: CSE Admin accessing /api/staff with MANAGE_FACULTY enabled gets HTTP 200 (Status: ${accessAllowedStaffRes.status})`
    );

    // TEST 13: Master Admin disables Reports (VIEW_REPORTS = 0) for CSE Admin.
    await request('PUT', `/master-admin/department-admins/${cseAdminId}/permissions`, {
      permissions: [
        { key: 'VIEW_REPORTS', enabled: false },
      ],
    }, masterToken);

    const meResReportsOff = await request('GET', '/auth/me', null, cseToken);
    assert(!meResReportsOff.data.permissions.includes('VIEW_REPORTS'), 'TEST 13: Live session confirms VIEW_REPORTS is OFF');

    const reportsDeniedRes = await request('GET', '/reports', null, cseToken);
    assert(
      reportsDeniedRes.status === 403,
      `TEST 13: CSE Admin accessing /api/reports with VIEW_REPORTS disabled gets HTTP 403 (Status: ${reportsDeniedRes.status})`
    );

    // TEST 14: Master Admin enables Reports (VIEW_REPORTS = 1).
    await request('PUT', `/master-admin/department-admins/${cseAdminId}/permissions`, {
      permissions: [
        { key: 'VIEW_REPORTS', enabled: true },
      ],
    }, masterToken);

    const meResReportsOn = await request('GET', '/auth/me', null, cseToken);
    assert(meResReportsOn.data.permissions.includes('VIEW_REPORTS'), 'TEST 14: Live session confirms VIEW_REPORTS is ON');

    const reportsAllowedRes = await request('GET', '/reports', null, cseToken);
    assert(
      reportsAllowedRes.status === 200,
      `TEST 14: CSE Admin accessing /api/reports with VIEW_REPORTS enabled gets HTTP 200 (Status: ${reportsAllowedRes.status})`
    );

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
};

runTests();
