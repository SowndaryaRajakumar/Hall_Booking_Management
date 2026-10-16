const pool = require('../config/db');
const { getPeriods, PERIODS } = require('../config/periods');
const { createNotification } = require('./notificationService');
const whatsappService = require('./whatsappService');
const emailUtil = require('../utils/emailService');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Maps day name or index to 0-6 JavaScript Date day index (0=Sunday, 1=Monday... 6=Saturday)
 */
const getDayIndex = (dayInput) => {
  if (typeof dayInput === 'number' && dayInput >= 0 && dayInput <= 6) {
    return dayInput;
  }
  const str = String(dayInput).trim().toLowerCase();
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 0 && num <= 6) {
    return num;
  }
  const idx = DAY_NAMES.findIndex((d) => d.toLowerCase() === str);
  return idx !== -1 ? idx : 1; // Default Monday if unrecognized
};

/**
 * Returns period configuration for a given period number (1 to 8)
 */
const getPeriodById = (periodId) => {
  const pId = Number(periodId);
  return PERIODS.find((p) => p.period === pId) || null;
};

/**
 * Generates all occurrence dates between startDate and endDate matching a dayIndex.
 */
const getDatesForDayIndex = (startDateStr, endDateStr, dayIndex) => {
  const dates = [];
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === dayIndex) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/**
 * Comprehensive Conflict Detection for Academic Allocation
 *
 * Checks:
 * 1. Venue conflict with existing normal `bookings` (Pending / Approved)
 * 2. Venue conflict with existing `academic_allocations` (Approved / Pending)
 * 3. Faculty conflict with existing normal `bookings`
 * 4. Faculty conflict with existing `academic_allocations`
 *
 * Excludes cancelled occurrence overrides!
 */
const detectAcademicAllocationConflicts = async ({
  venueId,
  facultyId,
  startDate,
  endDate,
  rules = [], // [{ dayOfWeek, periodId }]
  excludeAllocationId = null,
}) => {
  if (!rules.length) {
    return { hasConflict: false };
  }

  // Pre-expand all requested (date, periodId, startTime, endTime) slots
  const requestedSlots = [];

  for (const rule of rules) {
    const dayIdx = getDayIndex(rule.dayOfWeek || rule.day_of_week);
    const period = getPeriodById(rule.periodId || rule.period_id);
    if (!period) continue;

    const dates = getDatesForDayIndex(startDate, endDate, dayIdx);
    for (const dt of dates) {
      requestedSlots.push({
        date: dt,
        dayName: DAY_NAMES[dayIdx],
        periodId: period.period,
        startTime: period.start,
        endTime: period.end,
      });
    }
  }

  if (!requestedSlots.length) {
    return { hasConflict: false };
  }

  // Fetch venue name
  const [venueRows] = await pool.query('SELECT HallName FROM halls WHERE HallID = ?', [Number(venueId)]);
  const venueName = venueRows.length ? venueRows[0].HallName : `Venue #${venueId}`;

  // Fetch faculty name & email
  const [facultyRows] = await pool.query('SELECT full_name, email FROM staff WHERE staff_id = ?', [Number(facultyId)]);
  const facultyName = facultyRows.length ? facultyRows[0].full_name : `Faculty #${facultyId}`;
  const facultyEmail = facultyRows.length ? facultyRows[0].email : '';

  // 1. Check against `bookings` (Venue conflicts)
  for (const slot of requestedSlots) {
    const [venueBookings] = await pool.query(
      `SELECT id, staff_name, staff_email, date, time_from, time_to, status, reason
       FROM bookings
       WHERE hall_id = ?
         AND DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?
       LIMIT 1`,
      [Number(venueId), slot.date, slot.endTime, slot.startTime]
    );

    if (venueBookings.length > 0) {
      const b = venueBookings[0];
      return {
        hasConflict: true,
        type: 'VENUE_BOOKING_CONFLICT',
        message: `Venue ${venueName} is already booked for Period ${slot.periodId} (${slot.startTime} - ${slot.endTime}) on ${slot.date} by ${b.staff_name} (${b.status}).`,
        conflictDetails: {
          conflictType: 'Normal Booking',
          venue: venueName,
          date: slot.date,
          day: slot.dayName,
          period: slot.periodId,
          time: `${slot.startTime} - ${slot.endTime}`,
          existingSubjectOrReason: b.reason,
          existingStaffName: b.staff_name,
          status: b.status,
        },
      };
    }

    // 2. Check against `bookings` (Faculty conflicts)
    const [facultyBookings] = await pool.query(
      `SELECT id, hall_name, date, time_from, time_to, status, reason
       FROM bookings
       WHERE (staff_id = ? OR staff_email = ?)
         AND DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?
       LIMIT 1`,
      [Number(facultyId), facultyEmail, slot.date, slot.endTime, slot.startTime]
    );

    if (facultyBookings.length > 0) {
      const fb = facultyBookings[0];
      return {
        hasConflict: true,
        type: 'FACULTY_BOOKING_CONFLICT',
        message: `Faculty ${facultyName} already has a booking at ${fb.hall_name} for Period ${slot.periodId} on ${slot.date}.`,
        conflictDetails: {
          conflictType: 'Faculty Normal Booking',
          venue: fb.hall_name,
          date: slot.date,
          day: slot.dayName,
          period: slot.periodId,
          time: `${slot.startTime} - ${slot.endTime}`,
          existingSubjectOrReason: fb.reason,
          existingStaffName: facultyName,
          status: fb.status,
        },
      };
    }
  }

  // 3. Check against `academic_allocations` (Venue and Faculty conflicts)
  let allocQuery = `
    SELECT aa.id, aa.faculty_id, aa.venue_id, aa.subject_name, aa.subject_code,
           aa.year_of_study, aa.section,
           DATE_FORMAT(aa.start_date, '%Y-%m-%d') AS start_date,
           DATE_FORMAT(aa.end_date, '%Y-%m-%d') AS end_date,
           aa.status,
           h.HallName AS venue_name, s.full_name AS faculty_name,
           aar.day_index, aar.period_id, aar.start_time, aar.end_time
    FROM academic_allocations aa
    JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
    JOIN halls h ON aa.venue_id = h.HallID
    JOIN staff s ON aa.faculty_id = s.staff_id
    WHERE aa.status IN ('PENDING', 'APPROVED')
      AND aa.start_date <= ? AND aa.end_date >= ?
  `;
  const allocParams = [endDate, startDate];

  if (excludeAllocationId) {
    allocQuery += ' AND aa.id != ?';
    allocParams.push(excludeAllocationId);
  }

  const [existingAllocs] = await pool.query(allocQuery, allocParams);

  if (existingAllocs.length > 0) {
    // Also fetch any CANCELLED occurrence overrides for these allocations
    const allocIds = Array.from(new Set(existingAllocs.map((a) => a.id)));
    let cancelledOccurrences = new Set();
    if (allocIds.length) {
      const [occRows] = await pool.query(
        `SELECT allocation_id, DATE_FORMAT(occurrence_date, '%Y-%m-%d') AS occ_date, period_id
         FROM academic_allocation_occurrences
         WHERE allocation_id IN (?) AND status = 'CANCELLED'`,
        [allocIds]
      );
      occRows.forEach((r) => {
        cancelledOccurrences.add(`${r.allocation_id}_${r.occ_date}_${r.period_id}`);
      });
    }

    for (const slot of requestedSlots) {
      for (const ex of existingAllocs) {
        // Matching day of week and period
        const exDayIdx = Number(ex.day_index);
        const exPeriod = Number(ex.period_id);
        const slotDayIdx = getDayIndex(slot.dayName);

        if (exDayIdx === slotDayIdx && exPeriod === slot.periodId) {
          // Check if slot.date falls within ex.start_date and ex.end_date
          const exStart = String(ex.start_date).slice(0, 10);
          const exEnd = String(ex.end_date).slice(0, 10);

          if (slot.date >= exStart && slot.date <= exEnd) {
            // Check if this occurrence was cancelled
            const occKey = `${ex.id}_${slot.date}_${slot.periodId}`;
            if (cancelledOccurrences.has(occKey)) {
              // Exception cancelled, not a conflict!
              continue;
            }

            // Check Venue conflict
            if (Number(ex.venue_id) === Number(venueId)) {
              return {
                hasConflict: true,
                type: 'VENUE_ACADEMIC_CONFLICT',
                message: `Venue ${venueName} is already allocated for Period ${slot.periodId} on ${slot.dayName}s (${slot.date}) for ${ex.subject_name} (${ex.year_of_study} ${ex.section}) handled by ${ex.faculty_name}.`,
                conflictDetails: {
                  conflictType: 'Academic Semester Allocation',
                  venue: venueName,
                  date: slot.date,
                  day: slot.dayName,
                  period: slot.periodId,
                  time: `${slot.startTime} - ${slot.endTime}`,
                  existingSubjectOrReason: `${ex.subject_name} (${ex.year_of_study} ${ex.section})`,
                  existingStaffName: ex.faculty_name,
                  status: ex.status,
                },
              };
            }

            // Check Faculty conflict
            if (Number(ex.faculty_id) === Number(facultyId)) {
              return {
                hasConflict: true,
                type: 'FACULTY_ACADEMIC_CONFLICT',
                message: `Faculty ${facultyName} already has an academic class (${ex.subject_name} at ${ex.venue_name}) scheduled for Period ${slot.periodId} on ${slot.dayName}s (${slot.date}).`,
                conflictDetails: {
                  conflictType: 'Faculty Academic Allocation',
                  venue: ex.venue_name,
                  date: slot.date,
                  day: slot.dayName,
                  period: slot.periodId,
                  time: `${slot.startTime} - ${slot.endTime}`,
                  existingSubjectOrReason: ex.subject_name,
                  existingStaffName: facultyName,
                  status: ex.status,
                },
              };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false };
};

/**
 * Checks if a specific venue, date, and period has an active academic allocation.
 * Used by normal booking creation and availability endpoints.
 */
const checkAcademicConflictForSlot = async (venueId, dateStr, timeFrom, timeTo) => {
  const dt = new Date(`${dateStr}T00:00:00`);
  const dayIdx = dt.getDay();

  // Find all academic allocations for this venue active on dateStr
  const [allocs] = await pool.query(
    `SELECT aa.id, aa.subject_name, aa.year_of_study, aa.section, s.full_name AS faculty_name,
            aar.period_id, aar.start_time, aar.end_time
     FROM academic_allocations aa
     JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
     JOIN staff s ON aa.faculty_id = s.staff_id
     WHERE aa.venue_id = ?
       AND aa.status IN ('PENDING', 'APPROVED')
       AND aa.start_date <= ? AND aa.end_date >= ?
       AND aar.day_index = ?
       AND aar.start_time < ? AND aar.end_time > ?`,
    [Number(venueId), dateStr, dateStr, dayIdx, timeTo, timeFrom]
  );

  if (!allocs.length) return null;

  // Check if any matching allocation occurrence was cancelled
  for (const a of allocs) {
    const [occ] = await pool.query(
      `SELECT status FROM academic_allocation_occurrences
       WHERE allocation_id = ? AND occurrence_date = ? AND period_id = ? LIMIT 1`,
      [a.id, dateStr, a.period_id]
    );

    if (occ.length && occ[0].status === 'CANCELLED') {
      continue; // Session cancelled, slot is available!
    }

    return {
      allocationId: a.id,
      subjectName: a.subject_name,
      facultyName: a.faculty_name,
      periodId: a.period_id,
      yearSection: `${a.year_of_study} ${a.section}`,
      time: `${a.start_time} - ${a.end_time}`,
    };
  }

  return null;
};

/**
 * Creates a new Academic Allocation with multiple schedule rules
 */
const createAcademicAllocation = async ({
  facultyId,
  departmentId = null,
  venueId,
  academicYear,
  semester,
  subjectName,
  subjectCode = '',
  yearOfStudy,
  section,
  startDate,
  endDate,
  purpose = '',
  rules = [], // Array of { dayOfWeek, periodId }
  user,
}) => {
  if (!facultyId || !venueId || !academicYear || !semester || !subjectName || !yearOfStudy || !section || !startDate || !endDate) {
    throw new Error('All required academic allocation fields must be provided.');
  }

  if (startDate > endDate) {
    throw new Error('End date must be on or after start date.');
  }

  if (!rules.length) {
    throw new Error('At least one schedule rule (day and period) is required.');
  }

  // Normalize rules and deduplicate by dayIndex and periodId
  const normalizedRules = [];
  const seenRuleKeys = new Set();
  for (const r of rules) {
    const dayIdx = getDayIndex(r.dayOfWeek || r.day_of_week || r.dayIndex || r.day_index);
    const dayName = DAY_NAMES[dayIdx];
    const period = getPeriodById(r.periodId || r.period_id);
    if (!period) {
      throw new Error(`Invalid period: ${r.periodId || r.period_id}`);
    }
    const key = `${dayIdx}_${period.period}`;
    if (!seenRuleKeys.has(key)) {
      seenRuleKeys.add(key);
      normalizedRules.push({
        dayOfWeek: dayName,
        dayIndex: dayIdx,
        periodId: period.period,
        startTime: period.start,
        endTime: period.end,
      });
    }
  }

  // Conflict Detection
  const conflictResult = await detectAcademicAllocationConflicts({
    venueId,
    facultyId,
    startDate,
    endDate,
    rules: normalizedRules,
  });

  if (conflictResult.hasConflict) {
    const err = new Error(conflictResult.message);
    err.status = 409;
    err.conflict = conflictResult.conflictDetails;
    throw err;
  }

  // Determine Department ID if not passed
  let resolvedDeptId = departmentId;
  if (!resolvedDeptId) {
    const [staffRow] = await pool.query('SELECT department_id FROM staff WHERE staff_id = ?', [facultyId]);
    if (staffRow.length && staffRow[0].department_id) {
      resolvedDeptId = staffRow[0].department_id;
    }
  }

  // Determine initial status based on user role and venue ownership
  const [venueRow] = await pool.query(
    'SELECT HallID, HallName, ownership_type, DeptID, approval_role FROM halls WHERE HallID = ?',
    [venueId]
  );
  if (!venueRow.length) {
    throw new Error('Venue not found.');
  }
  const venue = venueRow[0];

  let initialStatus = 'PENDING';
  let approvedBy = null;
  let approvedAt = null;

  const userRole = String(user.role || '').toUpperCase();
  if (userRole === 'MASTER_ADMIN') {
    initialStatus = 'APPROVED';
    approvedBy = user.staffId || user.id;
    approvedAt = new Date();
  } else if (userRole === 'DEPARTMENT_ADMIN' && venue.ownership_type === 'DEPARTMENT' && Number(venue.DeptID) === Number(user.departmentId || resolvedDeptId)) {
    initialStatus = 'APPROVED';
    approvedBy = user.staffId || user.id;
    approvedAt = new Date();
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock venue record to serialize concurrent operations
    await connection.query('SELECT HallID, HallName FROM halls WHERE HallID = ? FOR UPDATE', [venueId]);

    const [allocResult] = await connection.query(
      `INSERT INTO academic_allocations
       (faculty_id, department_id, venue_id, academic_year, semester, subject_name, subject_code,
        year_of_study, section, start_date, end_date, purpose, status, approved_by, approved_at,
        created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        facultyId,
        resolvedDeptId,
        venueId,
        academicYear,
        semester,
        subjectName,
        subjectCode,
        yearOfStudy,
        section,
        startDate,
        endDate,
        purpose,
        initialStatus,
        approvedBy,
        approvedAt,
        user.staffId || user.id,
      ]
    );

    const allocationId = allocResult.insertId;

    for (const rule of normalizedRules) {
      await connection.query(
        `INSERT INTO academic_allocation_rules
         (allocation_id, day_of_week, day_index, period_id, start_time, end_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [allocationId, rule.dayOfWeek, rule.dayIndex, rule.periodId, rule.startTime, rule.endTime]
      );
    }

    await connection.commit();

    // Notify Approver / Faculty
    try {
      const [fac] = await pool.query('SELECT full_name, email, phone FROM staff WHERE staff_id = ?', [facultyId]);
      const facName = fac.length ? fac[0].full_name : 'Faculty';

      if (initialStatus === 'PENDING') {
        // If department venue, notify Department Admin
        if (venue.ownership_type === 'DEPARTMENT' && venue.DeptID) {
          const [deptAdmins] = await pool.query(
            "SELECT staff_id, full_name, email, phone FROM staff WHERE role = 'DEPARTMENT_ADMIN' AND department_id = ? AND status = 'active'",
            [venue.DeptID]
          );
          for (const da of deptAdmins) {
            await createNotification({
              userId: da.staff_id,
              title: 'New Semester Allocation Request',
              message: `${facName} requested ${venue.HallName} for ${subjectName} (${academicYear}, ${semester}).`,
              type: 'academic_allocation_request',
            });
            if (da.phone) {
              await whatsappService.sendWhatsAppMessage({
                to: da.phone,
                userId: da.staff_id,
                message: `🏛 *NEC Venue Portal: New Academic Allocation Request*\n\n• *Faculty:* ${facName}\n• *Subject:* ${subjectName}\n• *Venue:* ${venue.HallName}\n• *Duration:* ${startDate} to ${endDate}\n• *Status:* PENDING APPROVAL\n\nPlease log in to review.`,
              });
            }
          }
        } else {
          // Common venue -> notify Master Admin
          const [masterAdmins] = await pool.query(
            "SELECT staff_id, full_name, email, phone FROM staff WHERE role = 'MASTER_ADMIN' AND status = 'active'"
          );
          for (const ma of masterAdmins) {
            await createNotification({
              userId: ma.staff_id,
              title: 'New Common Venue Academic Allocation Request',
              message: `${facName} requested ${venue.HallName} for ${subjectName} (${academicYear}, ${semester}).`,
              type: 'academic_allocation_request',
            });
          }
        }
      } else {
        // Auto-approved
        await createNotification({
          userId: facultyId,
          title: 'Semester Venue Allocation Approved',
          message: `Your semester allocation for ${subjectName} at ${venue.HallName} is confirmed for ${academicYear}.`,
          type: 'academic_allocation_approved',
        });
      }
    } catch (notifErr) {
      console.error('Notification dispatch warning for academic allocation:', notifErr.message);
    }

    return {
      success: true,
      id: allocationId,
      allocationId,
      status: initialStatus,
      message: initialStatus === 'APPROVED' ? 'Academic Allocation created and approved.' : 'Academic Allocation request submitted for approval.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Retrieves Academic Calendar occurrences dynamically expanded within a date range
 */
const getAcademicCalendarOccurrences = async ({
  facultyId = null,
  departmentId = null,
  venueId = null,
  startDate,
  endDate,
  status = null,
}) => {
  const whereClauses = ["aa.status != 'REJECTED'"];
  const params = [];

  if (facultyId) {
    whereClauses.push('aa.faculty_id = ?');
    params.push(Number(facultyId));
  }

  if (departmentId) {
    whereClauses.push('(aa.department_id = ? OR h.DeptID = ?)');
    params.push(Number(departmentId), Number(departmentId));
  }

  if (venueId) {
    whereClauses.push('aa.venue_id = ?');
    params.push(Number(venueId));
  }

  // Date range overlap with allocation range
  whereClauses.push('aa.start_date <= ? AND aa.end_date >= ?');
  params.push(endDate, startDate);

  const whereStr = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [allocRows] = await pool.query(
    `SELECT aa.id AS allocation_id, aa.faculty_id, aa.department_id, aa.venue_id,
            aa.academic_year, aa.semester, aa.subject_name, aa.subject_code,
            aa.year_of_study, aa.section,
            DATE_FORMAT(aa.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(aa.end_date, '%Y-%m-%d') AS end_date,
            aa.purpose,
            aa.status AS allocation_status,
            h.HallName AS venue_name, h.Location AS venue_location,
            s.full_name AS faculty_name, s.email AS faculty_email,
            d.DeptName AS department_name
     FROM academic_allocations aa
     JOIN halls h ON aa.venue_id = h.HallID
     JOIN staff s ON aa.faculty_id = s.staff_id
     LEFT JOIN departments d ON aa.department_id = d.DeptID
     ${whereStr}`,
    params
  );

  if (!allocRows.length) return [];

  const allocIds = allocRows.map((a) => a.allocation_id);

  // Fetch rules for these allocations
  const [rules] = await pool.query(
    `SELECT allocation_id, day_of_week, day_index, period_id, start_time, end_time
     FROM academic_allocation_rules
     WHERE allocation_id IN (?)`,
    [allocIds]
  );

  const ruleMap = new Map();
  rules.forEach((r) => {
    if (!ruleMap.has(r.allocation_id)) ruleMap.set(r.allocation_id, []);
    ruleMap.get(r.allocation_id).push(r);
  });

  // Fetch occurrence overrides / exceptions
  const [overrides] = await pool.query(
    `SELECT o.id AS override_id, o.allocation_id, DATE_FORMAT(o.occurrence_date, '%Y-%m-%d') AS occurrence_date,
            o.period_id, o.status, o.remark, o.alternate_faculty_id,
            alt.full_name AS alternate_faculty_name
     FROM academic_allocation_occurrences o
     LEFT JOIN staff alt ON o.alternate_faculty_id = alt.staff_id
     WHERE o.allocation_id IN (?)
       AND o.occurrence_date BETWEEN ? AND ?`,
    [allocIds, startDate, endDate]
  );

  const overrideMap = new Map();
  overrides.forEach((ov) => {
    const key = `${ov.allocation_id}_${ov.occurrence_date}_${ov.period_id}`;
    overrideMap.set(key, ov);
  });

  // Expand matching occurrences
  const occurrences = [];

  for (const alloc of allocRows) {
    const allocRules = ruleMap.get(alloc.allocation_id) || [];
    const effectiveStart = alloc.start_date < startDate ? startDate : alloc.start_date;
    const effectiveEnd = alloc.end_date > endDate ? endDate : alloc.end_date;

    for (const rule of allocRules) {
      const dates = getDatesForDayIndex(
        String(effectiveStart).slice(0, 10),
        String(effectiveEnd).slice(0, 10),
        Number(rule.day_index)
      );

      for (const d of dates) {
        const key = `${alloc.allocation_id}_${d}_${rule.period_id}`;
        const ov = overrideMap.get(key);

        const occStatus = ov ? ov.status : 'SCHEDULED';
        const occRemark = ov ? ov.remark : null;
        const altFacultyId = ov ? ov.alternate_faculty_id : null;
        const altFacultyName = ov ? ov.alternate_faculty_name : null;
        const overrideId = ov ? ov.override_id : null;

        if (status && occStatus !== status) {
          continue;
        }

        occurrences.push({
          id: `${alloc.allocation_id}_${d}_${rule.period_id}`,
          overrideId,
          allocationId: alloc.allocation_id,
          date: d,
          dayOfWeek: rule.day_of_week,
          periodId: rule.period_id,
          startTime: String(rule.start_time).slice(0, 5),
          endTime: String(rule.end_time).slice(0, 5),
          subjectName: alloc.subject_name,
          subjectCode: alloc.subject_code,
          yearOfStudy: alloc.year_of_study,
          section: alloc.section,
          yearSection: `${alloc.year_of_study} - Sec ${alloc.section}`,
          venueId: alloc.venue_id,
          venueName: alloc.venue_name,
          facultyId: alloc.faculty_id,
          facultyName: alloc.faculty_name,
          departmentName: alloc.department_name,
          academicYear: alloc.academic_year,
          semester: alloc.semester,
          allocationStatus: alloc.allocation_status,
          status: occStatus,
          remark: occRemark,
          alternateFacultyId: altFacultyId,
          alternateFacultyName: altFacultyName,
        });
      }
    }
  }

  // Sort chronologically by date and period
  occurrences.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.periodId - b.periodId;
  });

  return occurrences;
};

/**
 * Upsert an occurrence exception/remark without altering the recurring semester allocation
 */
const setOccurrenceRemarkAndStatus = async ({
  allocationId,
  occurrenceDate,
  periodId,
  status = 'SCHEDULED',
  remark = '',
  alternateFacultyId = null,
  user,
}) => {
  // Validate allocation exists
  const [allocs] = await pool.query(
    'SELECT id, faculty_id, department_id, venue_id, subject_name FROM academic_allocations WHERE id = ?',
    [Number(allocationId)]
  );
  if (!allocs.length) {
    throw new Error('Academic allocation not found.');
  }
  const alloc = allocs[0];

  // Authorization check: Faculty can only update their own allocation
  const role = String(user.role || '').toUpperCase();
  if (role === 'FACULTY' && Number(alloc.faculty_id) !== Number(user.staffId || user.id)) {
    throw new Error('You are only authorized to update occurrences for your own allocations.');
  }

  const normalizedDate = String(occurrenceDate).slice(0, 10);

  // UPSERT
  await pool.query(
    `INSERT INTO academic_allocation_occurrences
     (allocation_id, occurrence_date, period_id, status, remark, alternate_faculty_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       remark = VALUES(remark),
       alternate_faculty_id = VALUES(alternate_faculty_id),
       updated_at = NOW()`,
    [
      Number(allocationId),
      normalizedDate,
      Number(periodId),
      status,
      remark,
      alternateFacultyId || null,
    ]
  );

  // If alternate faculty is assigned, notify them!
  if (alternateFacultyId) {
    try {
      const [altStaff] = await pool.query('SELECT full_name, email, phone FROM staff WHERE staff_id = ?', [alternateFacultyId]);
      if (altStaff.length) {
        await createNotification({
          userId: alternateFacultyId,
          title: 'Assigned as Alternate Faculty',
          message: `You have been designated to handle ${alloc.subject_name} on ${normalizedDate} (Period ${periodId}). Remark: "${remark}"`,
          type: 'alternate_faculty_assignment',
        });

        if (altStaff[0].phone) {
          await whatsappService.sendWhatsAppMessage({
            to: altStaff[0].phone,
            userId: alternateFacultyId,
            message: `📚 *NEC Venue Portal: Alternate Faculty Assignment*\n\nDear ${altStaff[0].full_name},\nYou have been assigned as the alternate faculty for:\n• *Subject:* ${alloc.subject_name}\n• *Date:* ${normalizedDate}\n• *Period:* ${periodId}\n• *Note:* ${remark || 'Faculty absent'}\n\nPlease prepare accordingly.`,
          });
        }
      }
    } catch (err) {
      console.warn('Could not dispatch alternate faculty notification:', err.message);
    }
  }

  return {
    success: true,
    message: 'Occurrence updated successfully.',
    allocationId: Number(allocationId),
    date: normalizedDate,
    periodId: Number(periodId),
    status,
    remark,
  };
};

/**
 * Updates an existing academic allocation (including changing venue, dates, subject, rules).
 * Forces conflict checking excluding this allocation, updates database records immediately,
 * and returns the updated allocation with full joined venue details.
 */
const updateAcademicAllocation = async ({
  id,
  allocationId,
  venueId,
  subjectName,
  subjectCode,
  yearOfStudy,
  section,
  academicYear,
  semester,
  startDate,
  endDate,
  purpose,
  rules,
  user,
}) => {
  const targetId = Number(allocationId || id);
  if (!targetId || isNaN(targetId)) {
    const err = new Error('Valid allocation ID is required.');
    err.status = 400;
    throw err;
  }

  const [existing] = await pool.query(
    `SELECT aa.*, h.HallName AS venue_name, h.ownership_type, h.DeptID
     FROM academic_allocations aa
     JOIN halls h ON aa.venue_id = h.HallID
     WHERE aa.id = ? LIMIT 1`,
    [targetId]
  );

  if (!existing.length) {
    const err = new Error('Academic allocation not found.');
    err.status = 404;
    throw err;
  }

  const currentAlloc = existing[0];
  const userRole = String(user?.role || '').toUpperCase();
  const userId = user?.staffId || user?.id;

  // Authorization check
  if (userRole === 'FACULTY' && Number(currentAlloc.faculty_id) !== Number(userId)) {
    const err = new Error('Access denied: You may only modify your own academic allocations.');
    err.status = 403;
    throw err;
  }

  const targetVenueId = venueId !== undefined ? Number(venueId) : currentAlloc.venue_id;
  const targetStartDate = startDate || currentAlloc.start_date;
  const targetEndDate = endDate || currentAlloc.end_date;

  const [venueRows] = await pool.query(
    'SELECT HallID, HallName, Location, Capacity, VenueType, ownership_type, DeptID FROM halls WHERE HallID = ?',
    [targetVenueId]
  );
  if (!venueRows.length) {
    const err = new Error('Selected venue not found.');
    err.status = 404;
    throw err;
  }
  const targetVenue = venueRows[0];

  let normalizedRules = [];
  if (Array.isArray(rules) && rules.length > 0) {
    const seenRuleKeys = new Set();
    for (const r of rules) {
      const dayIndex = Number(r.dayIndex !== undefined ? r.dayIndex : (r.day_index !== undefined ? r.day_index : getDayIndex(r.dayOfWeek || r.day_of_week)));
      const periodId = Number(r.periodId || r.period_id);
      const periodObj = getPeriodById(periodId);
      const dayOfWeek = r.dayOfWeek || r.day_of_week || DAY_NAMES[dayIndex] || 'Monday';
      const key = `${dayIndex}_${periodId}`;
      if (!seenRuleKeys.has(key)) {
        seenRuleKeys.add(key);
        normalizedRules.push({
          dayOfWeek,
          dayIndex,
          periodId,
          startTime: r.startTime || r.start_time || (periodObj ? periodObj.start : '09:15:00'),
          endTime: r.endTime || r.end_time || (periodObj ? periodObj.end : '10:05:00'),
        });
      }
    }
  } else {
    const [existingRules] = await pool.query(
      'SELECT day_of_week, day_index, period_id, start_time, end_time FROM academic_allocation_rules WHERE allocation_id = ? ORDER BY day_index, period_id',
      [currentAlloc.id]
    );
    normalizedRules = existingRules.map((r) => ({
      dayOfWeek: r.day_of_week,
      dayIndex: r.day_index,
      periodId: r.period_id,
      startTime: r.start_time,
      endTime: r.end_time,
    }));
  }

  // Conflict check for target venue and slots excluding this allocation
  const conflictCheck = await detectAcademicAllocationConflicts({
    venueId: targetVenueId,
    facultyId: currentAlloc.faculty_id,
    startDate: String(targetStartDate).slice(0, 10),
    endDate: String(targetEndDate).slice(0, 10),
    rules: normalizedRules,
    excludeAllocationId: currentAlloc.id,
  });

  if (conflictCheck.hasConflict) {
    const err = new Error(conflictCheck.message);
    err.conflict = conflictCheck;
    err.status = 409;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock venue record to serialize concurrent operations
    await connection.query('SELECT HallID, HallName FROM halls WHERE HallID = ? FOR UPDATE', [targetVenueId]);

    await connection.query(
      `UPDATE academic_allocations
       SET venue_id = ?,
           subject_name = COALESCE(?, subject_name),
           subject_code = COALESCE(?, subject_code),
           year_of_study = COALESCE(?, year_of_study),
           section = COALESCE(?, section),
           academic_year = COALESCE(?, academic_year),
           semester = COALESCE(?, semester),
           start_date = COALESCE(?, start_date),
           end_date = COALESCE(?, end_date),
           purpose = COALESCE(?, purpose),
           updated_at = NOW()
       WHERE id = ?`,
      [
        targetVenueId,
        subjectName ? subjectName.trim() : null,
        subjectCode !== undefined ? subjectCode.trim() : null,
        yearOfStudy || null,
        section || null,
        academicYear || null,
        semester || null,
        startDate ? String(startDate).slice(0, 10) : null,
        endDate ? String(endDate).slice(0, 10) : null,
        purpose !== undefined ? purpose.trim() : null,
        currentAlloc.id,
      ]
    );

    if (Array.isArray(rules) && rules.length > 0) {
      await connection.query('DELETE FROM academic_allocation_rules WHERE allocation_id = ?', [currentAlloc.id]);
      for (const rule of normalizedRules) {
        await connection.query(
          `INSERT INTO academic_allocation_rules
           (allocation_id, day_of_week, day_index, period_id, start_time, end_time, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [currentAlloc.id, rule.dayOfWeek, rule.dayIndex, rule.periodId, rule.startTime, rule.endTime]
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const [updatedRows] = await pool.query(
    `SELECT aa.id, aa.faculty_id, aa.department_id, aa.venue_id, aa.academic_year,
            aa.semester, aa.subject_name, aa.subject_code, aa.year_of_study, aa.section,
            DATE_FORMAT(aa.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(aa.end_date, '%Y-%m-%d') AS end_date,
            aa.purpose, aa.status, aa.rejection_reason,
            aa.approved_by, aa.approved_at, aa.created_at, aa.updated_at,
            h.HallName AS venue_name, h.Location AS venue_location, h.ownership_type, h.DeptID AS venue_dept_id,
            s.full_name AS faculty_name, s.email AS faculty_email,
            d.DeptName AS department_name
     FROM academic_allocations aa
     JOIN halls h ON aa.venue_id = h.HallID
     JOIN staff s ON aa.faculty_id = s.staff_id
     LEFT JOIN departments d ON aa.department_id = d.DeptID
     WHERE aa.id = ? LIMIT 1`,
    [currentAlloc.id]
  );

  const updatedAlloc = updatedRows[0];
  updatedAlloc.rules = normalizedRules;

  return {
    success: true,
    message: 'Academic allocation updated successfully.',
    data: updatedAlloc,
  };
};

module.exports = {
  detectAcademicAllocationConflicts,
  checkAcademicConflictForSlot,
  createAcademicAllocation,
  updateAcademicAllocation,
  getAcademicCalendarOccurrences,
  setOccurrenceRemarkAndStatus,
  getDayIndex,
  getPeriodById,
  getDatesForDayIndex,
  DAY_NAMES,
};
