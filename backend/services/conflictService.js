const pool = require('../config/db');
const { getPeriods } = require('../config/periods');

/**
 * Service to detect booking conflicts and suggest ranked alternative venues.
 */

const getVenueFacilities = async (hallId) => {
  const [rows] = await pool.query(
    `SELECT f.name
     FROM venue_facility_mapping m
     JOIN venue_facilities f ON f.id = m.facility_id
     WHERE m.venue_id = ? AND f.IsActive = 1`,
    [hallId]
  );
  return rows.map((r) => r.name);
};

const getPeriodName = (timeFrom, timeTo) => {
  const periods = getPeriods();
  const match = periods.find((p) => p.start === timeFrom && p.end === timeTo);
  return match ? `P${match.period}` : `${timeFrom} - ${timeTo}`;
};

/**
 * Check if the requested venue and slots have any conflict.
 * If so, find and rank available alternative venues.
 */
const findConflictsAndAlternatives = async ({
  hallId,
  slots = [],
  staffId = null,
  staffEmail = null,
  dbConn = null,
}) => {
  const db = dbConn || pool;
  if (!hallId || slots.length === 0) {
    return { hasConflict: false };
  }

  // 1. Fetch requested venue details
  const [venueRows] = await db.query(
    `SELECT h.HallID, h.HallName, h.VenueType, h.Capacity, h.Location, h.DeptID, h.ActiveStatus,
            h.HasAC, h.HasProjector, h.HasSmartBoard, h.HasWiFi, h.HasSpeaker, h.HasPodium, h.HasWhiteBoard, h.HasCCTV,
            d.DeptName
     FROM halls h
     LEFT JOIN departments d ON h.DeptID = d.DeptID
     WHERE h.HallID = ? LIMIT 1`,
    [Number(hallId)]
  );

  if (!venueRows.length) {
    return {
      hasConflict: true,
      message: 'The requested venue was not found.',
      alternatives: [],
    };
  }

  const requestedVenue = venueRows[0];
  if (!requestedVenue.ActiveStatus) {
    return {
      hasConflict: true,
      message: `Venue ${requestedVenue.HallName} is currently inactive or under maintenance.`,
      alternatives: await findAlternativeVenues(requestedVenue, slots),
    };
  }

  // 2. Check each slot for booking and allocation conflicts
  let firstConflict = null;
  let conflictingSlot = null;
  let conflictType = null; // 'VENUE_BOOKING', 'VENUE_ACADEMIC', 'FACULTY_BOOKING', 'FACULTY_ACADEMIC'

  for (const slot of slots) {
    // A. Venue normal booking conflicts
    const [conflicts] = await db.query(
      `SELECT id, staff_name, staff_email, date, time_from, time_to, status, reason, hall_name
       FROM bookings
       WHERE hall_id = ?
         AND DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?
       LIMIT 1`,
      [Number(hallId), slot.date, slot.timeTo, slot.timeFrom]
    );

    if (conflicts.length > 0) {
      firstConflict = conflicts[0];
      conflictingSlot = slot;
      conflictType = 'VENUE_BOOKING';
      break;
    }

    // B. Venue academic semester allocations
    const dt = new Date(`${slot.date}T00:00:00`);
    const dayIdx = dt.getDay();
    const [academicConflicts] = await db.query(
      `SELECT aa.id, aa.subject_name, aa.year_of_study, aa.section, s.full_name AS staff_name, s.email AS staff_email, aa.status,
              aar.start_time, aar.end_time
       FROM academic_allocations aa
       JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
       JOIN staff s ON aa.faculty_id = s.staff_id
       WHERE aa.venue_id = ?
         AND aa.status IN ('PENDING', 'APPROVED')
         AND aa.start_date <= ? AND aa.end_date >= ?
         AND aar.day_index = ?
         AND aar.start_time < ? AND aar.end_time > ?
       LIMIT 1`,
      [Number(hallId), slot.date, slot.date, dayIdx, slot.timeTo, slot.timeFrom]
    );

    if (academicConflicts.length > 0) {
      const ac = academicConflicts[0];
      const [cancelledOcc] = await db.query(
        `SELECT id FROM academic_allocation_occurrences
         WHERE allocation_id = ? AND occurrence_date = ? AND status = 'CANCELLED'
         LIMIT 1`,
        [ac.id, slot.date]
      );

      if (!cancelledOcc.length) {
        firstConflict = {
          id: ac.id,
          staff_name: ac.staff_name,
          staff_email: ac.staff_email,
          date: slot.date,
          time_from: slot.timeFrom,
          time_to: slot.timeTo,
          status: 'Academic ' + ac.status,
          isAcademic: true,
          subjectName: ac.subject_name,
        };
        conflictingSlot = slot;
        conflictType = 'VENUE_ACADEMIC';
        break;
      }
    }

    // C. Faculty normal booking double-booking (different venue at the same time)
    if (staffId || staffEmail) {
      const [facultyDoubleBooking] = await db.query(
        `SELECT id, hall_name, date, time_from, time_to, status, reason, staff_name
         FROM bookings
         WHERE (staff_id = ? OR (staff_email = ? AND staff_email != ''))
           AND hall_id != ?
           AND DATE(date) = ?
           AND status IN ('Pending', 'Approved')
           AND time_from < ?
           AND time_to > ?
         LIMIT 1`,
        [staffId || 0, staffEmail || '', Number(hallId), slot.date, slot.timeTo, slot.timeFrom]
      );

      if (facultyDoubleBooking.length > 0) {
        firstConflict = facultyDoubleBooking[0];
        conflictingSlot = slot;
        conflictType = 'FACULTY_BOOKING';
        break;
      }

      // D. Faculty academic allocation double-booking (class scheduled at the same time)
      if (staffId) {
        const [facultyAcademicClass] = await db.query(
          `SELECT aa.id, aa.subject_name, h.HallName AS hall_name, aa.status, s.full_name AS staff_name
           FROM academic_allocations aa
           JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
           JOIN halls h ON aa.venue_id = h.HallID
           JOIN staff s ON aa.faculty_id = s.staff_id
           WHERE aa.faculty_id = ?
             AND aa.venue_id != ?
             AND aa.status IN ('PENDING', 'APPROVED')
             AND aa.start_date <= ? AND aa.end_date >= ?
             AND aar.day_index = ?
             AND aar.start_time < ? AND aar.end_time > ?
           LIMIT 1`,
          [Number(staffId), Number(hallId), slot.date, slot.date, dayIdx, slot.timeTo, slot.timeFrom]
        );

        if (facultyAcademicClass.length > 0) {
          const facClass = facultyAcademicClass[0];
          const [cancelledOcc] = await db.query(
            `SELECT id FROM academic_allocation_occurrences
             WHERE allocation_id = ? AND occurrence_date = ? AND status = 'CANCELLED'
             LIMIT 1`,
            [facClass.id, slot.date]
          );

          if (!cancelledOcc.length) {
            firstConflict = {
              id: facClass.id,
              staff_name: facClass.staff_name,
              hall_name: facClass.hall_name,
              date: slot.date,
              time_from: slot.timeFrom,
              time_to: slot.timeTo,
              status: 'Academic Class ' + facClass.status,
              isAcademic: true,
              subjectName: facClass.subject_name,
            };
            conflictingSlot = slot;
            conflictType = 'FACULTY_ACADEMIC';
            break;
          }
        }
      }
    }
  }

  if (!firstConflict) {
    return { hasConflict: false };
  }

  // 3. Conflict found! Build meaningful message and alternatives
  const periodLabel = getPeriodName(conflictingSlot.timeFrom, conflictingSlot.timeTo);
  const formattedDate = new Date(conflictingSlot.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let message = '';
  if (conflictType === 'VENUE_BOOKING') {
    message = `${requestedVenue.HallName} is unavailable for ${periodLabel} (${conflictingSlot.timeFrom} - ${conflictingSlot.timeTo}) on ${formattedDate} because a ${firstConflict.status.toLowerCase()} booking already exists by ${firstConflict.staff_name}.`;
  } else if (conflictType === 'VENUE_ACADEMIC') {
    message = `${requestedVenue.HallName} is unavailable for ${periodLabel} on ${formattedDate} due to scheduled semester class: "${firstConflict.subjectName}" by ${firstConflict.staff_name}.`;
  } else if (conflictType === 'FACULTY_BOOKING') {
    message = `You already have an existing ${firstConflict.status.toLowerCase()} booking at ${firstConflict.hall_name} for ${periodLabel} on ${formattedDate}. Double-booking is not permitted.`;
  } else if (conflictType === 'FACULTY_ACADEMIC') {
    message = `You already have an academic semester class ("${firstConflict.subjectName}" at ${firstConflict.hall_name}) scheduled for ${periodLabel} on ${formattedDate}.`;
  } else {
    message = `${requestedVenue.HallName} is unavailable for ${periodLabel} on ${formattedDate} due to a scheduling conflict.`;
  }

  const alternatives = await findAlternativeVenues(requestedVenue, slots);

  return {
    hasConflict: true,
    message,
    conflictDetails: {
      venue: requestedVenue.HallName,
      date: conflictingSlot.date,
      time: `${conflictingSlot.timeFrom} - ${conflictingSlot.timeTo}`,
      period: periodLabel,
      status: firstConflict.status,
      bookedBy: firstConflict.staff_name,
      reason: firstConflict.reason || firstConflict.subjectName || '',
      conflictType,
    },
    conflict: {
      venueId: requestedVenue.HallID,
      venueName: requestedVenue.HallName,
      date: conflictingSlot.date,
      timeFrom: conflictingSlot.timeFrom,
      timeTo: conflictingSlot.timeTo,
      period: periodLabel,
      status: firstConflict.status,
      bookedBy: firstConflict.staff_name,
      conflictType,
    },
    alternatives,
  };
};


/**
 * Search and rank alternative active venues that are available for ALL requested slots.
 */
const findAlternativeVenues = async (requestedVenue, slots) => {
  try {
    // 1. Gather facilities of requested venue
    const dynamicFacilities = await getVenueFacilities(requestedVenue.HallID);
    const reqFacilitySet = new Set(dynamicFacilities);
    if (requestedVenue.HasAC) reqFacilitySet.add('Air Conditioner');
    if (requestedVenue.HasProjector) reqFacilitySet.add('Projector');
    if (requestedVenue.HasSmartBoard) reqFacilitySet.add('Smart Board');
    if (requestedVenue.HasWiFi) reqFacilitySet.add('WiFi');
    if (requestedVenue.HasSpeaker) reqFacilitySet.add('Speaker System');
    if (requestedVenue.HasPodium) reqFacilitySet.add('Podium');
    if (requestedVenue.HasWhiteBoard) reqFacilitySet.add('White Board');
    if (requestedVenue.HasCCTV) reqFacilitySet.add('CCTV');
    const targetFacilities = Array.from(reqFacilitySet);

    // 2. Fetch all other active venues
    const [candidateVenues] = await pool.query(
      `SELECT h.HallID, h.HallName, h.VenueType, h.Capacity, h.Location, h.DeptID,
              h.HasAC, h.HasProjector, h.HasSmartBoard, h.HasWiFi, h.HasSpeaker, h.HasPodium, h.HasWhiteBoard, h.HasCCTV,
              d.DeptName
       FROM Halls h
       LEFT JOIN Departments d ON h.DeptID = d.DeptID
       WHERE h.ActiveStatus = 1 AND h.HallID != ?`,
      [requestedVenue.HallID]
    );

    if (!candidateVenues.length) return [];

    const availableCandidates = [];

    // 3. Check availability of each candidate for ALL requested slots
    for (const candidate of candidateVenues) {
      let isAvailable = true;

      for (const slot of slots) {
        const [conflicts] = await pool.query(
          `SELECT id FROM bookings
           WHERE hall_id = ?
             AND DATE(date) = ?
             AND status IN ('Pending', 'Approved')
             AND time_from < ?
             AND time_to > ?
           LIMIT 1`,
          [candidate.HallID, slot.date, slot.timeTo, slot.timeFrom]
        );

        if (conflicts.length > 0) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        availableCandidates.push(candidate);
      }
    }

    if (!availableCandidates.length) return [];

    // 4. Score each available candidate
    const scoredList = await Promise.all(
      availableCandidates.map(async (candidate) => {
        let score = 10;

        // Venue Type match (+50)
        const sameType =
          String(candidate.VenueType || '').toLowerCase().trim() ===
          String(requestedVenue.VenueType || '').toLowerCase().trim();
        if (sameType) score += 50;

        // Hydrate candidate facilities
        const candDynamic = await getVenueFacilities(candidate.HallID);
        const candFacilitySet = new Set(candDynamic);
        if (candidate.HasAC) candFacilitySet.add('Air Conditioner');
        if (candidate.HasProjector) candFacilitySet.add('Projector');
        if (candidate.HasSmartBoard) candFacilitySet.add('Smart Board');
        if (candidate.HasWiFi) candFacilitySet.add('WiFi');
        if (candidate.HasSpeaker) candFacilitySet.add('Speaker System');
        if (candidate.HasPodium) candFacilitySet.add('Podium');
        if (candidate.HasWhiteBoard) candFacilitySet.add('White Board');
        if (candidate.HasCCTV) candFacilitySet.add('CCTV');

        // Facilities matching score
        let matchedCount = 0;
        targetFacilities.forEach((fac) => {
          if (candFacilitySet.has(fac)) {
            matchedCount += 1;
            score += 15;
          }
        });

        // Bonus if candidate has ALL target facilities
        if (targetFacilities.length > 0 && matchedCount === targetFacilities.length) {
          score += 25;
        }

        // Capacity closeness (up to 20 pts)
        const reqCap = Number(requestedVenue.Capacity || 50);
        const candCap = Number(candidate.Capacity || 50);
        const capDiff = Math.abs(reqCap - candCap);
        if (capDiff === 0) score += 20;
        else if (capDiff <= 20) score += 15;
        else if (capDiff <= 50) score += 10;

        // Department match (+10)
        if (candidate.DeptID && candidate.DeptID === requestedVenue.DeptID) {
          score += 10;
        }

        return {
          id: candidate.HallID,
          name: candidate.HallName,
          venueType: candidate.VenueType || 'Classroom',
          capacity: candidate.Capacity || 'N/A',
          location: candidate.Location || 'Campus',
          department: candidate.DeptName || '',
          facilities: Array.from(candFacilitySet),
          matchedFacilitiesCount: matchedCount,
          score,
        };
      })
    );

    // Sort by score descending and return top 5
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.slice(0, 5);
  } catch (error) {
    console.error('Error finding alternative venues:', error);
    return [];
  }
};

module.exports = {
  findConflictsAndAlternatives,
  findAlternativeVenues,
};
