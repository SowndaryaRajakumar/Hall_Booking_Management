const pool = require('../config/db');
const { getAvailabilityHeatmap } = require('../services/analyticsService');
const { getFacultyVenueUsageHistory } = require('../services/venueHistoryService');
const {
  createVenueFeedback,
  escalateFeedback,
  updateFeedbackStatus,
  notifySubmitter,
} = require('../services/venueFeedbackService');

async function runTests() {
  console.log('=== STARTING REFINEMENT & CORRECTION VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Get test users and venues from real DB
    const [facultyUsers] = await pool.query(
      "SELECT staff_id, full_name, email, department, department_id, role FROM staff WHERE role = 'FACULTY' LIMIT 1"
    );
    const faculty = facultyUsers[0];
    assert(!!faculty, 'Test Faculty user exists in database', faculty?.full_name);

    const [deptAdmins] = await pool.query(
      "SELECT staff_id, full_name, email, department, department_id, role FROM staff WHERE role = 'DEPARTMENT_ADMIN' LIMIT 1"
    );
    const deptAdmin = deptAdmins[0];
    assert(!!deptAdmin, 'Test Department Admin user exists in database', deptAdmin?.full_name);

    const [masterAdmins] = await pool.query(
      "SELECT staff_id, full_name, email, role FROM staff WHERE role = 'MASTER_ADMIN' LIMIT 1"
    );
    const masterAdmin = masterAdmins[0];
    assert(!!masterAdmin, 'Test Master Admin user exists in database', masterAdmin?.full_name);

    const [commonHalls] = await pool.query(
      "SELECT HallID, HallName, ownership_type FROM Halls WHERE ownership_type = 'COMMON' LIMIT 1"
    );
    const commonVenue = commonHalls[0];
    assert(!!commonVenue, 'Common Venue exists in database', commonVenue?.HallName);

    const [deptHalls] = await pool.query(
      "SELECT HallID, HallName, DeptID, ownership_type FROM Halls WHERE ownership_type = 'DEPARTMENT' LIMIT 1"
    );
    const deptVenue = deptHalls[0];
    assert(!!deptVenue, 'Department Venue exists in database', deptVenue?.HallName);

    // 2. TEST FACULTY VENUE USAGE HISTORY
    console.log('\n--- TESTING FACULTY VENUE USAGE HISTORY ---');
    const historyRes = await getFacultyVenueUsageHistory({
      facultyId: faculty.staff_id,
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
    assert(historyRes.success && Array.isArray(historyRes.data), 'Venue Usage History returns array of records');
    console.log(`    Found ${historyRes.data.length} usage records for ${faculty.full_name}`);
    if (historyRes.data.length > 0) {
      const first = historyRes.data[0];
      assert(!!first.venue_name && !!first.date && !!first.period_label, 'Usage history record contains venue, date, period');
    }

    // 3. TEST DEPARTMENT VENUE FEEDBACK SUBMISSION
    console.log('\n--- TESTING FEEDBACK PIPELINE ---');
    const deptFeedbackRes = await createVenueFeedback({
      venueId: deptVenue.HallID,
      type: 'EQUIPMENT_ISSUE',
      priority: 'HIGH',
      subject: 'Test Projector Failure in Dept Lab',
      description: 'Projector will not display HDMI source properly',
      submittedBy: faculty.staff_id,
      feedbackDate: '2026-10-08',
    });
    assert(deptFeedbackRes.success, 'Faculty submits Department Venue feedback');
    assert(deptFeedbackRes.routedTo === 'DEPARTMENT_ADMIN', 'Department venue feedback routes to DEPARTMENT_ADMIN');

    const feedbackId = deptFeedbackRes.id;

    // 4. TEST DEPARTMENT ADMIN ESCALATION
    console.log('\n--- TESTING DEPT ADMIN ESCALATION ---');
    const escalateRes = await escalateFeedback({
      feedbackId,
      escalationReason: 'Projector motherboard burned; central campus repair required.',
      internalRemarks: 'Checked by dept technician, replacement requested.',
      user: { staffId: deptAdmin.staff_id, id: deptAdmin.staff_id, role: 'DEPARTMENT_ADMIN' },
    });
    assert(escalateRes.success, 'Department Admin escalates feedback to Master Admin');
    assert(escalateRes.status === 'ESCALATED', 'Status is updated to ESCALATED');

    // 5. TEST COMMON VENUE FEEDBACK SUBMISSION
    console.log('\n--- TESTING COMMON VENUE FEEDBACK ---');
    const commonFeedbackRes = await createVenueFeedback({
      venueId: commonVenue.HallID,
      type: 'CLEANLINESS',
      priority: 'MEDIUM',
      subject: 'Auditorium Seating Area Needs Cleaning',
      description: 'Auditorium main stage area needs dusting before the symposium',
      submittedBy: faculty.staff_id,
      feedbackDate: '2026-10-08',
    });
    assert(commonFeedbackRes.success, 'Faculty submits Common Venue feedback');
    assert(commonFeedbackRes.routedTo === 'MASTER_ADMIN', 'Common venue feedback routes directly to MASTER_ADMIN');

    // 6. TEST MASTER ADMIN RESOLUTION & SUBMITTER NOTIFICATION
    console.log('\n--- TESTING MASTER ADMIN RESOLUTION & NOTIFICATION ---');
    const resolveRes = await updateFeedbackStatus({
      feedbackId,
      status: 'RESOLVED',
      resolution: 'Central electrical team replaced the HDMI motherboard and tested projection.',
      internalRemarks: 'Completed under college maintenance contract.',
      resolvedBy: masterAdmin.staff_id,
    });
    assert(resolveRes.success, 'Master Admin updates status to RESOLVED with resolution note');
    assert(resolveRes.status === 'RESOLVED', 'Feedback status is RESOLVED');

    const notifyRes = await notifySubmitter({
      feedbackId,
      channels: ['EMAIL', 'WHATSAPP', 'IN_APP'],
      customMessage: 'Your issue regarding the lab projector has been resolved.',
      user: { staffId: masterAdmin.staff_id, id: masterAdmin.staff_id, role: 'MASTER_ADMIN' },
    });
    assert(notifyRes.success, 'Master Admin dispatches notification to submitter');
    assert(typeof notifyRes.results === 'object', 'Dispatched channels results returned');

    // Clean up test feedback records safely
    await pool.query('DELETE FROM venue_feedback WHERE id IN (?, ?)', [
      feedbackId,
      commonFeedbackRes.id,
    ]);
    console.log('    Cleaned up test feedback rows safely.');

    // 7. TEST ANALYTICS AVAILABILITY HEATMAP
    console.log('\n--- TESTING ANALYTICS AVAILABILITY HEATMAP ---');
    const testDate = '2026-10-08';
    const heatmap = await getAvailabilityHeatmap({ date: testDate });
    assert(!!heatmap.date && Array.isArray(heatmap.periods) && Array.isArray(heatmap.venues), 'Heatmap returns date, periods, and venues matrix');
    assert(heatmap.periods.length === 8, 'Heatmap returns exactly 8 periods (P1 to P8)');
    assert(heatmap.venues.length > 0, `Heatmap includes active venues (found ${heatmap.venues.length})`);

    // Verify slot differentiation: must have available slots!
    let totalSlots = 0;
    let availableSlots = 0;
    let bookedSlots = 0;
    let academicSlots = 0;

    heatmap.venues.forEach((v) => {
      v.periods.forEach((p) => {
        totalSlots++;
        if (p.isAvailable) availableSlots++;
        if (p.status === 'BOOKED') bookedSlots++;
        if (p.status === 'ACADEMIC_ALLOCATION') academicSlots++;
      });
    });

    console.log(`    Total Slots on ${testDate}: ${totalSlots}`);
    console.log(`    Available Slots: ${availableSlots} (${Math.round((availableSlots / totalSlots) * 100)}%)`);
    console.log(`    Booked / Approved Slots: ${bookedSlots}`);
    console.log(`    Academic Allocation Slots: ${academicSlots}`);

    assert(availableSlots > 0, 'Heatmap correctly marks available periods (NOT all booked!)', `${availableSlots}/${totalSlots} available`);
    assert(typeof heatmap.venues[0].periods[0].isAvailable === 'boolean', 'Slot isAvailable is boolean');

    console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  } catch (err) {
    console.error('Fatal error during verification test:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
