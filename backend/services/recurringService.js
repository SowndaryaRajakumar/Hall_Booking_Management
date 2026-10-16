const pool = require('../config/db');
const { getPeriods } = require('../config/periods');
const { logBookingAction } = require('./auditService');
const { createNotificationForAdmins } = require('./notificationService');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Normalizes input weekdays to an array of day indexes (0-6).
 * Accepts: ["Monday", "Wednesday"] or [1, 3] or "Monday,Wednesday".
 */
const parseWeekdayIndices = (weekdays) => {
  let list = [];
  if (Array.isArray(weekdays)) {
    list = weekdays;
  } else if (typeof weekdays === 'string') {
    list = weekdays.split(',').map((w) => w.trim());
  }

  const indices = new Set();
  list.forEach((item) => {
    if (typeof item === 'number' && item >= 0 && item <= 6) {
      indices.add(item);
    } else if (typeof item === 'string') {
      const trimmed = item.trim().toLowerCase();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 0 && num <= 6) {
        indices.add(num);
      } else {
        const foundIdx = DAY_NAMES.findIndex((name) => name.toLowerCase() === trimmed);
        if (foundIdx !== -1) indices.add(foundIdx);
      }
    }
  });

  return Array.from(indices);
};

/**
 * Generate all occurrence dates between startDate and endDate matching selected weekdays.
 */
const generateOccurrenceDates = (startDateStr, endDateStr, weekdayIndices) => {
  const dates = [];
  const current = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  while (current <= end) {
    if (weekdayIndices.includes(current.getDay())) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Validates and creates recurring bookings.
 */
const createRecurringBooking = async ({
  hallId,
  startDate,
  endDate,
  weekdays,
  periodNumber = null,
  timeFrom = null,
  timeTo = null,
  purpose,
  remarks = '',
  allowPartial = false,
  user,
}) => {
  if (!hallId || !startDate || !endDate || !weekdays || !purpose) {
    return { status: 400, message: 'Please provide venue, start date, end date, weekdays, and purpose.' };
  }

  if (startDate > endDate) {
    return { status: 400, message: 'End date must be on or after start date.' };
  }

  const weekdayIndices = parseWeekdayIndices(weekdays);
  if (!weekdayIndices.length) {
    return { status: 400, message: 'Please select at least one weekday.' };
  }

  // Determine time slot from periodNumber or timeFrom/timeTo
  let slotFrom = timeFrom;
  let slotTo = timeTo;
  let resolvedPeriod = periodNumber ? Number(periodNumber) : null;

  if (resolvedPeriod) {
    const periods = getPeriods();
    const matchedPeriod = periods.find((p) => p.period === resolvedPeriod);
    if (!matchedPeriod) {
      return { status: 400, message: `Invalid period P${resolvedPeriod}.` };
    }
    slotFrom = matchedPeriod.start;
    slotTo = matchedPeriod.end;
  } else if (!slotFrom || !slotTo) {
    return { status: 400, message: 'Please specify a period or start and end time.' };
  }

  // 1. Fetch venue details
  const [hallRows] = await pool.query(
    `SELECT HallID, HallName, ActiveStatus FROM Halls WHERE HallID = ? LIMIT 1`,
    [Number(hallId)]
  );
  if (!hallRows.length || !hallRows[0].ActiveStatus) {
    return { status: 400, message: 'Please select an active venue.' };
  }
  const hallName = hallRows[0].HallName;

  // 2. Generate occurrence dates
  const occurrenceDates = generateOccurrenceDates(startDate, endDate, weekdayIndices);
  if (!occurrenceDates.length) {
    return { status: 400, message: 'No matching dates found for the selected weekdays in the date range.' };
  }

  // 3. Pre-check EVERY occurrence
  const availableOccurrences = [];
  const conflictingOccurrences = [];

  for (const date of occurrenceDates) {
    // 1. Check venue normal booking conflicts
    const [conflicts] = await pool.query(
      `SELECT id, staff_name, staff_email, status, date, time_from, time_to
       FROM bookings
       WHERE hall_id = ?
         AND DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?
       LIMIT 1`,
      [Number(hallId), date, slotTo, slotFrom]
    );

    if (conflicts.length > 0) {
      conflictingOccurrences.push({
        date,
        timeFrom: slotFrom,
        timeTo: slotTo,
        conflictWith: {
          id: conflicts[0].id,
          bookedBy: conflicts[0].staff_name,
          status: conflicts[0].status,
        },
      });
      continue;
    }

    // 2. Check venue academic allocation conflicts
    const dt = new Date(`${date}T00:00:00`);
    const dayIdx = dt.getDay();
    const [academicConflicts] = await pool.query(
      `SELECT aa.id, aa.subject_name, s.full_name AS staff_name, aa.status
       FROM academic_allocations aa
       JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
       JOIN staff s ON aa.faculty_id = s.staff_id
       WHERE aa.venue_id = ?
         AND aa.status IN ('PENDING', 'APPROVED')
         AND aa.start_date <= ? AND aa.end_date >= ?
         AND aar.day_index = ?
         AND aar.start_time < ? AND aar.end_time > ?
       LIMIT 1`,
      [Number(hallId), date, date, dayIdx, slotTo, slotFrom]
    );

    if (academicConflicts.length > 0) {
      const ac = academicConflicts[0];
      const [cancelledOcc] = await pool.query(
        `SELECT id FROM academic_allocation_occurrences
         WHERE allocation_id = ? AND occurrence_date = ? AND status = 'CANCELLED'
         LIMIT 1`,
        [ac.id, date]
      );

      if (!cancelledOcc.length) {
        conflictingOccurrences.push({
          date,
          timeFrom: slotFrom,
          timeTo: slotTo,
          conflictWith: {
            id: ac.id,
            bookedBy: `${ac.staff_name} (${ac.subject_name})`,
            status: 'Academic ' + ac.status,
          },
        });
        continue;
      }
    }

    // 3. Check faculty double-booking conflicts
    const [facultyConflicts] = await pool.query(
      `SELECT id, hall_name, status
       FROM bookings
       WHERE (staff_id = ? OR (staff_email = ? AND staff_email != ''))
         AND hall_id != ?
         AND DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?
       LIMIT 1`,
      [user?.staffId || 0, user?.email || '', Number(hallId), date, slotTo, slotFrom]
    );

    if (facultyConflicts.length > 0) {
      conflictingOccurrences.push({
        date,
        timeFrom: slotFrom,
        timeTo: slotTo,
        conflictWith: {
          id: facultyConflicts[0].id,
          bookedBy: `Yourself at ${facultyConflicts[0].hall_name}`,
          status: facultyConflicts[0].status,
        },
      });
      continue;
    }

    availableOccurrences.push({
      date,
      timeFrom: slotFrom,
      timeTo: slotTo,
    });
  }


  // If conflicts exist and partial booking was not confirmed
  if (conflictingOccurrences.length > 0 && !allowPartial) {
    return {
      status: 409,
      conflict: true,
      totalOccurrences: occurrenceDates.length,
      conflictingOccurrences,
      availableOccurrences,
      message: `${conflictingOccurrences.length} of ${occurrenceDates.length} requested occurrences are unavailable.`,
    };
  }

  if (availableOccurrences.length === 0) {
    return {
      status: 409,
      conflict: true,
      message: 'All requested occurrences have scheduling conflicts and cannot be booked.',
      conflictingOccurrences,
      availableOccurrences: [],
    };
  }

  // 4. Perform database transaction to insert recurring bookings
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const recurringGroupId = `REC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const weekdayLabels = weekdayIndices.map((idx) => DAY_NAMES[idx]).join(', ');
    const bookingStatus = String(user.role).toLowerCase() === 'admin' ? 'Approved' : 'Pending';

    // Insert recurring schedule entry
    await connection.query(
      `INSERT INTO recurring_bookings
       (recurring_group_id, user_id, hall_id, hall_name, start_date, end_date, weekdays, period_number, time_from, time_to, total_occurrences, created_occurrences, purpose, remarks, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
      [
        recurringGroupId,
        user.staffId,
        Number(hallId),
        hallName,
        startDate,
        endDate,
        weekdayLabels,
        resolvedPeriod,
        slotFrom,
        slotTo,
        occurrenceDates.length,
        availableOccurrences.length,
        purpose,
        remarks,
      ]
    );

    const createdBookings = [];

    // Insert individual booking records
    for (const occ of availableOccurrences) {
      const [insertResult] = await connection.query(
        `INSERT INTO bookings
         (hall_id, hall_name, staff_name, staff_email, staff_phone, reason, date, time_from, time_to, status, remarks, staff_id, recurring_group_id)
         VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(hallId),
          hallName,
          user.name || 'Faculty',
          user.email,
          purpose,
          occ.date,
          occ.timeFrom,
          occ.timeTo,
          bookingStatus,
          remarks,
          user.staffId,
          recurringGroupId,
        ]
      );

      const bookingId = insertResult.insertId;
      createdBookings.push({
        id: bookingId,
        date: occ.date,
        timeFrom: occ.timeFrom,
        timeTo: occ.timeTo,
        status: bookingStatus,
      });

      // Audit log entry for each occurrence
      await connection.query(
        `INSERT INTO booking_audit_logs (booking_id, user_id, action, old_status, new_status, details, created_at)
         VALUES (?, ?, 'BOOKING_CREATED', NULL, ?, ?, NOW())`,
        [
          bookingId,
          user.staffId,
          bookingStatus,
          `Recurring booking (${recurringGroupId}) for ${hallName} on ${occ.date} (${occ.timeFrom} - ${occ.timeTo})`,
        ]
      );
    }

    await connection.commit();

    // 5. Notify admins if created by faculty
    if (String(user.role).toLowerCase() !== 'admin') {
      try {
        await createNotificationForAdmins({
          title: 'New Recurring Booking Request',
          message: `${createdBookings.length} recurring booking(s) created for Venue ${hallName} (${startDate} to ${endDate}, ${weekdayLabels}) by ${user.name}.`,
          type: 'booking_request',
          relatedBookingId: createdBookings[0]?.id || null,
        });
      } catch (notifErr) {
        console.error('Failed to notify admins of recurring booking:', notifErr);
      }
    }

    return {
      status: 201,
      success: true,
      recurringGroupId,
      totalRequested: occurrenceDates.length,
      createdCount: createdBookings.length,
      skippedCount: conflictingOccurrences.length,
      conflictingOccurrences,
      bookings: createdBookings,
      message:
        conflictingOccurrences.length > 0
          ? `Successfully scheduled ${createdBookings.length} occurrence(s). ${conflictingOccurrences.length} conflicting occurrence(s) were skipped.`
          : `All ${createdBookings.length} recurring occurrences scheduled successfully.`,
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating recurring booking:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createRecurringBooking,
  parseWeekdayIndices,
  generateOccurrenceDates,
};
