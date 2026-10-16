const pool = require('../config/db');
const { getPeriods } = require('../config/periods');

/**
 * Service to compute venue utilization, trends, metrics, and heatmap data from MySQL.
 */

const getVenueUtilizationAnalytics = async () => {
  // 1. Overall counts
  const [[counts]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM Halls) AS totalVenues,
      (SELECT COUNT(*) FROM Halls WHERE ActiveStatus = 1) AS activeVenues,
      (SELECT COUNT(*) FROM bookings) AS totalBookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'Approved') AS approvedBookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') AS pendingBookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'Rejected') AS rejectedBookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'Cancelled') AS cancelledBookings
  `);

  const totalVenues = Number(counts.totalVenues || 0);
  const activeVenues = Number(counts.activeVenues || 0);
  const totalBookings = Number(counts.totalBookings || 0);
  const approvedBookings = Number(counts.approvedBookings || 0);
  const pendingBookings = Number(counts.pendingBookings || 0);
  const rejectedBookings = Number(counts.rejectedBookings || 0);
  const cancelledBookings = Number(counts.cancelledBookings || 0);

  // 2. Venue utilization breakdown (Approved bookings per venue)
  // Total available slots baseline: active venues * 8 periods per day * 30 days = 240 slots per month per venue.
  const [venueStats] = await pool.query(`
    SELECT
      h.HallID AS venueId,
      h.HallName AS venueName,
      h.VenueType AS venueType,
      h.Capacity AS capacity,
      d.DeptName AS department,
      COUNT(b.id) AS approvedCount
    FROM Halls h
    LEFT JOIN Departments d ON h.DeptID = d.DeptID
    LEFT JOIN bookings b ON h.HallID = b.hall_id AND b.status = 'Approved'
    WHERE h.ActiveStatus = 1
    GROUP BY h.HallID, h.HallName, h.VenueType, h.Capacity, d.DeptName
    ORDER BY approvedCount DESC
  `);

  const maxBookings = venueStats.length > 0 ? Math.max(...venueStats.map((v) => Number(v.approvedCount || 0)), 1) : 1;

  const venueUtilization = venueStats.map((v) => {
    const approved = Number(v.approvedCount || 0);
    // Relative utilization percentage normalized to highest booked venue (or baseline slot ratio)
    const utilizationPct = Math.min(100, Math.round((approved / Math.max(maxBookings, 10)) * 100));
    return {
      venueId: v.venueId,
      venueName: v.venueName,
      venueType: v.venueType || 'Classroom',
      capacity: v.capacity || 50,
      department: v.department || 'General',
      approvedBookings: approved,
      utilizationPercentage: utilizationPct,
    };
  });

  const mostBookedVenue = venueUtilization[0]?.venueName || 'N/A';
  const leastUtilizedVenue =
    venueUtilization.length > 0
      ? venueUtilization[venueUtilization.length - 1]?.venueName
      : 'N/A';

  // Overall system utilization: (approvedBookings / (activeVenues * 30 days * 8 periods)) * 100
  const totalPossibleSlots = Math.max(1, activeVenues * 30 * 8);
  const overallUtilizationRate = Math.min(
    100,
    Math.round(((approvedBookings * 10) / totalPossibleSlots) * 100) // normalized factor
  );

  // 3. Peak booking period
  const [periodCounts] = await pool.query(`
    SELECT time_from, time_to, COUNT(*) AS count
    FROM bookings
    WHERE status IN ('Approved', 'Pending')
    GROUP BY time_from, time_to
    ORDER BY count DESC
    LIMIT 1
  `);

  let peakBookingPeriod = 'P1 (09:15 - 10:05)';
  if (periodCounts.length > 0) {
    const pStart = String(periodCounts[0].time_from).slice(0, 5);
    const pEnd = String(periodCounts[0].time_to).slice(0, 5);
    const periods = getPeriods();
    const match = periods.find((p) => p.start === pStart && p.end === pEnd);
    peakBookingPeriod = match ? `P${match.period} (${match.startDisplay} - ${match.endDisplay})` : `${pStart} - ${pEnd}`;
  }

  // 4. Most active department
  const [deptStats] = await pool.query(`
    SELECT
      COALESCE(s.department, d.DeptName, 'General') AS department,
      COUNT(b.id) AS count
    FROM bookings b
    LEFT JOIN staff s ON (b.staff_id = s.staff_id OR b.staff_email = s.email)
    LEFT JOIN Halls h ON b.hall_id = h.HallID
    LEFT JOIN Departments d ON h.DeptID = d.DeptID
    WHERE b.status IN ('Approved', 'Pending')
    GROUP BY COALESCE(s.department, d.DeptName, 'General')
    ORDER BY count DESC
  `);

  const mostActiveDepartment = deptStats[0]?.department || 'Computer Science';

  // 5. Monthly booking trends (last 12 months)
  const [monthlyRows] = await pool.query(`
    SELECT
      DATE_FORMAT(date, '%b %Y') AS monthLabel,
      DATE_FORMAT(date, '%Y-%m') AS sortMonth,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
    FROM bookings
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(date, '%b %Y'), DATE_FORMAT(date, '%Y-%m')
    ORDER BY sortMonth ASC
  `);

  // 6. Daily booking trends (last 14 days)
  const [dailyRows] = await pool.query(`
    SELECT
      DATE_FORMAT(date, '%d %b') AS dateLabel,
      DATE_FORMAT(date, '%Y-%m-%d') AS fullDate,
      COUNT(*) AS count
    FROM bookings
    WHERE date BETWEEN DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    GROUP BY fullDate, dateLabel
    ORDER BY fullDate ASC
  `);

  // 7. Facility demand analysis
  const [facilityDemandRows] = await pool.query(`
    SELECT
      f.name AS facilityName,
      COUNT(DISTINCT b.id) AS demandCount
    FROM venue_facilities f
    JOIN venue_facility_mapping m ON f.id = m.facility_id
    JOIN bookings b ON m.venue_id = b.hall_id AND b.status = 'Approved'
    WHERE f.IsActive = 1
    GROUP BY f.name
    ORDER BY demandCount DESC
    LIMIT 8
  `);

  return {
    summary: {
      totalVenues,
      activeVenues,
      totalBookings,
      approvedBookings,
      pendingBookings,
      rejectedBookings,
      cancelledBookings,
      overallUtilizationRate,
      mostBookedVenue,
      leastUtilizedVenue,
      peakBookingPeriod,
      mostActiveDepartment,
    },
    venueUtilization,
    monthlyTrends: monthlyRows.map((r) => ({
      month: r.monthLabel,
      total: Number(r.total || 0),
      approved: Number(r.approved || 0),
      pending: Number(r.pending || 0),
      rejected: Number(r.rejected || 0),
      cancelled: Number(r.cancelled || 0),
    })),
    dailyTrends: dailyRows.map((r) => ({
      date: r.dateLabel,
      count: Number(r.count || 0),
    })),
    departmentUsage: deptStats.map((d) => ({
      department: d.department,
      count: Number(d.count || 0),
    })),
    facilityDemand: facilityDemandRows.map((f) => ({
      facility: f.facilityName,
      demandCount: Number(f.demandCount || 0),
    })),
  };
};

/**
 * Compute venue availability heatmap for all active venues across P1 to P8 on a given date.
 */
const getAvailabilityHeatmap = async ({ date, venueType = '', deptId = null, search = '' }) => {
  const normalizedDate = date ? String(date).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const periods = getPeriods();
  const dt = new Date(`${normalizedDate}T00:00:00`);
  const dayIdx = dt.getDay(); // 0=Sunday..6=Saturday

  let venueSql = `
    SELECT h.HallID, h.HallName, h.VenueType, h.Capacity, h.Location, h.ownership_type, d.DeptName
    FROM Halls h
    LEFT JOIN Departments d ON h.DeptID = d.DeptID
    WHERE h.ActiveStatus = 1
  `;
  const params = [];

  if (venueType && venueType.toLowerCase() !== 'all') {
    venueSql += ` AND LOWER(TRIM(h.VenueType)) = LOWER(TRIM(?))`;
    params.push(venueType);
  }

  if (deptId && deptId !== 'all') {
    venueSql += ` AND h.DeptID = ?`;
    params.push(Number(deptId));
  }

  if (search && search.trim()) {
    venueSql += ` AND (h.HallName LIKE ? OR h.Location LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  venueSql += ` ORDER BY h.HallName ASC`;

  const [venues] = await pool.query(venueSql, params);

  // 1. Fetch all active bookings on that specific date (Approved or Pending only)
  // Strictly EXCLUDE Rejected and Cancelled bookings!
  const [bookings] = await pool.query(
    `SELECT id, hall_id, staff_name, reason, time_from, time_to, status
     FROM bookings
     WHERE DATE(date) = ? AND LOWER(status) IN ('pending', 'approved')`,
    [normalizedDate]
  );

  // 2. Fetch all active academic semester allocations covering this date and weekday
  const [academicAllocs] = await pool.query(
    `SELECT aa.id, aa.venue_id, aa.subject_name, aa.year_of_study, aa.section, aa.status,
            s.full_name AS faculty_name, aar.period_id, aar.start_time, aar.end_time
     FROM academic_allocations aa
     JOIN academic_allocation_rules aar ON aa.id = aar.allocation_id
     JOIN staff s ON aa.faculty_id = s.staff_id
     WHERE aa.status IN ('PENDING', 'APPROVED')
       AND aa.start_date <= ? AND aa.end_date >= ?
       AND aar.day_index = ?`,
    [normalizedDate, normalizedDate, dayIdx]
  );

  // 3. Fetch occurrence exceptions on this specific date
  let cancelledAllocKeys = new Set();
  let absentAllocKeys = new Map();
  if (academicAllocs.length) {
    const allocIds = Array.from(new Set(academicAllocs.map((a) => a.id)));
    const [occRows] = await pool.query(
      `SELECT allocation_id, period_id, status, remark
       FROM academic_allocation_occurrences
       WHERE allocation_id IN (?) AND occurrence_date = ?`,
      [allocIds, normalizedDate]
    );
    occRows.forEach((r) => {
      const key = `${r.allocation_id}_${r.period_id}`;
      if (r.status === 'CANCELLED') {
        cancelledAllocKeys.add(key);
      } else {
        absentAllocKeys.set(key, r);
      }
    });
  }

  // Map each venue across P1 to P8
  const matrix = venues.map((venue) => {
    const venueBookings = bookings.filter((b) => Number(b.hall_id) === Number(venue.HallID));
    const venueAllocs = academicAllocs.filter((a) => Number(a.venue_id) === Number(venue.HallID));

    const periodStatuses = periods.map((period) => {
      // Check Normal Bookings first
      const bookingMatch = venueBookings.find((b) => {
        const bFrom = String(b.time_from).slice(0, 5);
        const bTo = String(b.time_to).slice(0, 5);
        return bFrom < period.end && bTo > period.start;
      });

      if (bookingMatch) {
        const isApproved = String(bookingMatch.status).toLowerCase() === 'approved';
        return {
          period: period.period,
          label: `P${period.period}`,
          start: period.start,
          end: period.end,
          time: `${period.startDisplay} - ${period.endDisplay}`,
          startDisplay: period.startDisplay,
          endDisplay: period.endDisplay,
          isAvailable: false,
          status: isApproved ? 'BOOKED' : 'PENDING',
          displayStatus: isApproved ? 'Booked / Approved' : 'Pending Request',
          bookingType: 'NORMAL_BOOKING',
          bookingId: bookingMatch.id,
          bookedBy: bookingMatch.staff_name,
          bookingStatus: bookingMatch.status,
          purpose: bookingMatch.reason,
        };
      }

      // Check Academic Semester Allocations
      const allocMatch = venueAllocs.find((a) => Number(a.period_id) === Number(period.period));
      if (allocMatch) {
        const allocKey = `${allocMatch.id}_${period.period}`;
        // If specifically marked CANCELLED for this date, the slot is AVAILABLE!
        if (!cancelledAllocKeys.has(allocKey)) {
          const occOverride = absentAllocKeys.get(allocKey);
          const isAbsent = occOverride && occOverride.status === 'ABSENT';

          return {
            period: period.period,
            label: `P${period.period}`,
            start: period.start,
            end: period.end,
            time: `${period.startDisplay} - ${period.endDisplay}`,
            startDisplay: period.startDisplay,
            endDisplay: period.endDisplay,
            isAvailable: false,
            status: 'ACADEMIC_ALLOCATION',
            displayStatus: isAbsent ? 'Academic (Faculty Absent)' : 'Academic Class',
            bookingType: 'ACADEMIC_ALLOCATION',
            allocationId: allocMatch.id,
            bookedBy: allocMatch.faculty_name,
            bookingStatus: allocMatch.status,
            purpose: `${allocMatch.subject_name} (${allocMatch.year_of_study} ${allocMatch.section})${occOverride?.remark ? ' - ' + occOverride.remark : ''}`,
          };
        }
      }

      // Slot is genuinely AVAILABLE
      return {
        period: period.period,
        label: `P${period.period}`,
        start: period.start,
        end: period.end,
        time: `${period.startDisplay} - ${period.endDisplay}`,
        startDisplay: period.startDisplay,
        endDisplay: period.endDisplay,
        isAvailable: true,
        status: 'AVAILABLE',
        displayStatus: 'Available',
        bookingType: null,
        bookingId: null,
        bookedBy: null,
        bookingStatus: null,
        purpose: null,
      };
    });

    const bookedCount = periodStatuses.filter((p) => !p.isAvailable).length;
    const availableCount = 8 - bookedCount;

    return {
      id: venue.HallID,
      hallId: venue.HallID,
      venueId: venue.HallID,
      name: venue.HallName,
      venueName: venue.HallName,
      venueType: venue.VenueType || 'Classroom',
      capacity: venue.Capacity || 50,
      department: venue.DeptName || 'General',
      ownershipType: venue.ownership_type || 'DEPARTMENT',
      location: venue.Location || '',
      bookedCount,
      availableCount,
      periods: periodStatuses,
    };
  });

  return {
    date: normalizedDate,
    periods: periods.map((p) => ({
      period: p.period,
      label: `P${p.period}`,
      time: `${p.startDisplay} - ${p.endDisplay}`,
      start: p.start,
      end: p.end,
    })),
    venues: matrix,
    totalVenues: matrix.length,
  };
};

module.exports = {
  getVenueUtilizationAnalytics,
  getAvailabilityHeatmap,
};
