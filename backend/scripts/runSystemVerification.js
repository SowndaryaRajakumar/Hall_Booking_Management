const pool = require('../config/db');
const academicService = require('../services/academicService');
const venueFeedbackService = require('../services/venueFeedbackService');
const { findConflictsAndAlternatives } = require('../services/conflictService');

async function runVerification() {
  console.log('========================================================');
  console.log('STARTING AUTOMATED SYSTEM VERIFICATION');
  console.log('========================================================');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedTests++;
    }
  }

  try {
    // Clean up test data for clean state
    await pool.query("DELETE FROM academic_allocations WHERE subject_name IN ('MWT', 'Computer Networks')");
    await pool.query("DELETE FROM venue_feedback WHERE subject LIKE '%Symposium%' OR subject LIKE '%Projector%'");

    // ------------------------------------------------------------------
    // TEST 1: Academic Allocation Creation (Dr. CSE Faculty Member, CSE, Venue 11, Mon-Fri Period 3)
    // ------------------------------------------------------------------
    console.log('\n--- Test 1: Creating Academic Allocation (MWT, III Year A, Venue 11, Mon-Fri Period 3) ---');
    const allocationData = {
      facultyId: 12, // Dr. CSE Faculty Member
      departmentId: 1, // CSE
      venueId: 11, // CSE Innovation Lab 998
      academicYear: '2026-2027',
      semester: 'Semester 1',
      subjectName: 'MWT',
      subjectCode: 'CS601',
      yearOfStudy: 'III Year',
      section: 'A',
      startDate: '2026-07-01',
      endDate: '2026-10-31',
      purpose: 'Regular Academic Laboratory Session',
      user: { staffId: 12, role: 'FACULTY' },
      rules: [
        { dayOfWeek: 'Monday', periodId: 3 },
        { dayOfWeek: 'Tuesday', periodId: 3 },
        { dayOfWeek: 'Wednesday', periodId: 3 },
        { dayOfWeek: 'Thursday', periodId: 3 },
        { dayOfWeek: 'Friday', periodId: 3 }
      ]
    };

    const newAlloc = await academicService.createAcademicAllocation(allocationData);
    assert(newAlloc && newAlloc.id, `Academic allocation created successfully with ID: ${newAlloc?.id}`);

    // Department Admin approves the allocation
    await pool.query("UPDATE academic_allocations SET status = 'APPROVED' WHERE id = ?", [newAlloc.id]);
    const [approvedRow] = await pool.query('SELECT status FROM academic_allocations WHERE id = ?', [newAlloc.id]);
    assert(approvedRow[0].status === 'APPROVED', 'Allocation status successfully set to APPROVED');

    // Verify rules were created
    const [rules] = await pool.query('SELECT * FROM academic_allocation_rules WHERE allocation_id = ?', [newAlloc.id]);
    assert(rules.length === 5, `Created exactly 5 recurring schedule rules (Mon-Fri) for Allocation ${newAlloc.id}`);

    // ------------------------------------------------------------------
    // TEST 2: Calendar Generation from Recurring Allocation
    // ------------------------------------------------------------------
    console.log('\n--- Test 2: Academic Calendar Occurrence Generation ---');
    const calendarEvents = await academicService.getAcademicCalendarOccurrences({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      facultyId: 12,
      userRole: 'FACULTY'
    });

    assert(calendarEvents.length >= 20, `Generated ${calendarEvents.length} calendar occurrences dynamically for July 2026 without individual booking rows`);
    const sampleEvent = calendarEvents.find(e => e.allocationId === newAlloc.id && e.periodId === 3);
    assert(sampleEvent && sampleEvent.subjectName === 'MWT', `Occurrence contains correct subject (${sampleEvent?.subjectName}), venue (${sampleEvent?.venueName}), and period (${sampleEvent?.periodId})`);

    // ------------------------------------------------------------------
    // TEST 3: Conflict Detection - Duplicate Academic Allocation
    // ------------------------------------------------------------------
    console.log('\n--- Test 3: Conflict Detection (Another faculty attempts same venue + same period + overlapping date) ---');
    let conflictCaught = false;
    try {
      await academicService.createAcademicAllocation({
        facultyId: 20, // Another faculty
        departmentId: 1,
        venueId: 11, // Same venue 11
        academicYear: '2026-2027',
        semester: 'Semester 1',
        subjectName: 'Computer Networks',
        subjectCode: 'CS602',
        yearOfStudy: 'III Year',
        section: 'B',
        startDate: '2026-07-10',
        endDate: '2026-08-10',
        user: { staffId: 20, role: 'FACULTY' },
        rules: [
          { dayOfWeek: 'Wednesday', periodId: 3 } // Conflicting slot!
        ]
      });
    } catch (err) {
      conflictCaught = true;
      assert(err.conflict !== undefined || err.message.includes('already allocated'), `Conflicting allocation correctly rejected: "${err.message}"`);
    }
    assert(conflictCaught, 'System successfully prevented conflicting academic allocation for same venue & period');

    // ------------------------------------------------------------------
    // TEST 4: Conflict Detection - Mutual Conflict with Regular Bookings
    // ------------------------------------------------------------------
    console.log('\n--- Test 4: Mutual Conflict (Regular booking for 2026-07-06 Period 3 on venue 11) ---');
    const bookingConflicts = await findConflictsAndAlternatives({
      hallId: 11,
      slots: [
        { date: '2026-07-06', timeFrom: '11:10:00', timeTo: '12:00:00' } // Monday Period 3
      ]
    });
    assert(bookingConflicts.hasConflict, `Regular booking engine detected conflict with academic allocation: "${bookingConflicts.conflictMessage || bookingConflicts.message || 'Slot occupied'}"`);

    // ------------------------------------------------------------------
    // TEST 5: Occurrence Exception / Remark / Faculty Absence
    // ------------------------------------------------------------------
    console.log('\n--- Test 5: Faculty Absence Exception for a Single Occurrence ---');
    const targetDate = '2026-07-15'; // Wednesday
    const occResult = await academicService.setOccurrenceRemarkAndStatus({
      allocationId: newAlloc.id,
      occurrenceDate: targetDate,
      periodId: 3,
      status: 'ABSENT',
      remark: 'Faculty absent today. Alternate faculty will handle the class.',
      alternateFacultyId: 20,
      user: { staffId: 12, role: 'FACULTY' }
    });
    assert(occResult && occResult.status === 'ABSENT', `Occurrence exception set to ABSENT for ${targetDate}`);

    // Verify master allocation is untouched
    const [allocRows] = await pool.query('SELECT * FROM academic_allocations WHERE id = ?', [newAlloc.id]);
    assert(allocRows[0].status === 'APPROVED', `Master recurring allocation remains ${allocRows[0].status} across entire semester`);

    // Verify calendar reflects the exception on that specific day
    const updatedEvents = await academicService.getAcademicCalendarOccurrences({
      startDate: '2026-07-14',
      endDate: '2026-07-16',
      facultyId: 12,
      userRole: 'FACULTY'
    });
    const absentEvent = updatedEvents.find(e => e.date === '2026-07-15' && e.periodId === 3);
    const scheduledEvent = updatedEvents.find(e => e.date === '2026-07-14' && e.periodId === 3);
    assert(absentEvent && absentEvent.status === 'ABSENT' && absentEvent.remark.includes('Alternate faculty'), `Calendar correctly marks ${targetDate} as ABSENT with remark "${absentEvent?.remark}"`);
    assert(scheduledEvent && (scheduledEvent.status === 'SCHEDULED' || scheduledEvent.status === 'APPROVED'), `Adjacent date 2026-07-14 remains unaffected (${scheduledEvent?.status})`);

    // ------------------------------------------------------------------
    // TEST 6: Common Venue Feedback & Complaint Management
    // ------------------------------------------------------------------
    console.log('\n--- Test 6: Common Venue Complaint Lifecycle ---');
    const feedback = await venueFeedbackService.createVenueFeedback({
      venueId: 8, // Main College Auditorium
      type: 'COMPLAINT',
      priority: 'HIGH',
      subject: 'Projector lamp burned out before Symposium',
      description: 'Auditorium projector lamp has burned out before the upcoming technical symposium.',
      submittedBy: 2 // Master Admin
    });
    assert(feedback && feedback.id, `Venue complaint registered successfully with ID: ${feedback?.id}`);
    assert(feedback.status === 'OPEN', `Initial status is correctly OPEN`);

    // Update to IN_PROGRESS
    const inProgress = await venueFeedbackService.updateFeedbackStatus({
      feedbackId: feedback.id,
      status: 'IN_PROGRESS',
      internalRemarks: 'Technician dispatched to replace lamp.'
    });
    assert(inProgress.status === 'IN_PROGRESS', `Status successfully transitioned to IN_PROGRESS`);

    // Update to RESOLVED
    const resolved = await venueFeedbackService.updateFeedbackStatus({
      feedbackId: feedback.id,
      status: 'RESOLVED',
      resolution: 'Projector lamp replaced with new 4K unit. Tested and operational.',
      internalRemarks: 'Completed work order #982.',
      resolvedBy: 2
    });
    assert(resolved.status === 'RESOLVED', `Status successfully transitioned to RESOLVED with resolution note`);

    // Update to CLOSED
    const closed = await venueFeedbackService.updateFeedbackStatus({
      feedbackId: feedback.id,
      status: 'CLOSED'
    });
    assert(closed.status === 'CLOSED', `Status successfully transitioned to CLOSED`);

    // Test Venue History
    const history = await venueFeedbackService.getVenueFeedbackHistory(8);
    assert(history.summary && history.items.length >= 1, `Venue history fetched for Hall 8 with ${history.items.length} items`);
    assert(history.summary.total >= 1 && history.summary.closed >= 1, `History counters properly aggregated (Total: ${history.summary.total}, Closed: ${history.summary.closed})`);

    // ------------------------------------------------------------------
    // TEST 7: Dynamic Permission Check
    // ------------------------------------------------------------------
    console.log('\n--- Test 7: Permission Matrix Integration ---');
    const [permCheck] = await pool.query(
      "SELECT p.permission_key, rp.enabled FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE p.permission_key = 'VIEW_ACADEMIC_CALENDAR' AND rp.role = 'DEPARTMENT_ADMIN'"
    );
    assert(permCheck.length > 0, `VIEW_ACADEMIC_CALENDAR permission configured for DEPARTMENT_ADMIN (enabled: ${permCheck[0]?.enabled})`);

    console.log('\n========================================================');
    console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('========================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
  } catch (err) {
    console.error('UNEXPECTED ERROR DURING VERIFICATION:', err);
    process.exit(1);
  }
}

runVerification();
