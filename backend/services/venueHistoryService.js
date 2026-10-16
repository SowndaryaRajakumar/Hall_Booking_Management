const pool = require('../config/db');
const { getPeriods } = require('../config/periods');
const { getDatesForDayIndex, getDayIndex, DAY_NAMES } = require('./academicService');

const FALLBACK_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS = (Array.isArray(DAY_NAMES) && DAY_NAMES.length >= 7) ? DAY_NAMES : FALLBACK_DAY_NAMES;

const getPeriodByTimes = (timeFrom, timeTo) => {
  const periods = getPeriods();
  const tf = String(timeFrom).slice(0, 5);
  const tt = String(timeTo).slice(0, 5);
  const match = periods.find((p) => p.start === tf && p.end === tt);
  if (match) return { periodId: match.period, label: `Period ${match.period}`, time: `${match.startDisplay} - ${match.endDisplay}` };
  return { periodId: null, label: `${tf} - ${tt}`, time: `${tf} - ${tt}` };
};

const getPeriodDetails = (periodId) => {
  const periods = getPeriods();
  const match = periods.find((p) => p.period === Number(periodId));
  if (match) return { periodId: match.period, label: `Period ${match.period}`, time: `${match.startDisplay} - ${match.endDisplay}` };
  return { periodId, label: `Period ${periodId}`, time: '' };
};

/**
 * Retrieves historical and upcoming venue usage for a faculty member.
 * Combines:
 * 1. Approved/Completed normal bookings
 * 2. Active academic semester allocations expanded into daily occurrences
 */
const getFacultyVenueUsageHistory = async ({
  facultyId,
  facultyEmail,
  fromDate,
  toDate,
  venueId = null,
  departmentId = null,
  bookingType = 'all', // 'all', 'NORMAL', 'BOOKING', 'ACADEMIC', 'ACADEMIC_ALLOCATION'
  status = 'all',
}) => {
  const usageHistory = [];

  // Default date window: last 60 days to current date if not specified
  const todayStr = new Date().toISOString().slice(0, 10);
  const effectiveToDate = toDate ? String(toDate).slice(0, 10) : todayStr;
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 60);
  const effectiveFromDate = fromDate ? String(fromDate).slice(0, 10) : defaultFrom.toISOString().slice(0, 10);

  const normType = String(bookingType || 'all').toUpperCase();

  // -------------------------------------------------------------
  // 1. Fetch Normal Bookings
  // -------------------------------------------------------------
  if (normType === 'ALL' || normType === 'NORMAL' || normType === 'BOOKING') {
    const bookingWhere = [
      '(b.staff_id = ? OR b.staff_email = ?)',
      'b.date >= ? AND b.date <= ?',
    ];
    const bookingParams = [Number(facultyId), facultyEmail || '', effectiveFromDate, effectiveToDate];

    if (venueId && venueId !== 'all') {
      bookingWhere.push('b.hall_id = ?');
      bookingParams.push(Number(venueId));
    }
    if (departmentId && departmentId !== 'all') {
      bookingWhere.push('h.DeptID = ?');
      bookingParams.push(Number(departmentId));
    }
    if (status && status !== 'all') {
      bookingWhere.push('LOWER(b.status) = LOWER(?)');
      bookingParams.push(status);
    } else {
      // By default show Approved, Completed, or non-rejected
      bookingWhere.push("b.status NOT IN ('Rejected')");
    }

    const [normalBookings] = await pool.query(
      `SELECT b.id, b.hall_id, b.hall_name, DATE_FORMAT(b.date, '%Y-%m-%d') AS booking_date,
              b.time_from, b.time_to, b.reason, b.status,
              h.VenueType, h.ownership_type, h.DeptID,
              d.DeptName AS department_name
       FROM bookings b
       LEFT JOIN halls h ON b.hall_id = h.HallID
       LEFT JOIN departments d ON h.DeptID = d.DeptID
       WHERE ${bookingWhere.join(' AND ')}
       ORDER BY b.date DESC, b.time_from DESC`,
      bookingParams
    );

    for (const b of normalBookings) {
      const dt = new Date(`${b.booking_date}T00:00:00`);
      const dayName = DAYS[dt.getDay()] || 'Weekday';
      const periodInfo = getPeriodByTimes(b.time_from, b.time_to);

      usageHistory.push({
        id: `normal_${b.id}`,
        recordId: b.id,
        relatedBookingId: b.id,
        booking_id: b.id,
        allocationId: null,
        allocation_id: null,
        date: b.booking_date,
        day: dayName,
        day_name: dayName,
        venueId: b.hall_id,
        venue_id: b.hall_id,
        venueName: b.hall_name,
        venue_name: b.hall_name,
        venueType: b.VenueType || 'Hall',
        venue_type: b.VenueType || 'Hall',
        ownershipType: b.ownership_type || 'DEPARTMENT',
        ownership_type: b.ownership_type || 'DEPARTMENT',
        department: b.department_name || 'College Common',
        department_name: b.department_name || 'College Common',
        departmentId: b.DeptID,
        department_id: b.DeptID,
        period: periodInfo.label,
        period_label: periodInfo.label,
        periodId: periodInfo.periodId,
        period_id: periodInfo.periodId,
        time: periodInfo.time,
        start_time: b.time_from,
        end_time: b.time_to,
        subjectOrPurpose: b.reason || 'Campus Session',
        subject_or_purpose: b.reason || 'Campus Session',
        bookingType: 'Normal Booking',
        booking_type: 'BOOKING',
        status: b.status,
        bookingStatus: b.status,
        booking_status: b.status,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Fetch Academic Semester Allocations
  // -------------------------------------------------------------
  if (normType === 'ALL' || normType === 'ACADEMIC' || normType === 'ACADEMIC_ALLOCATION') {
    const allocWhere = [
      'aa.faculty_id = ?',
      "aa.status IN ('APPROVED', 'PENDING')",
      'aa.start_date <= ? AND aa.end_date >= ?',
    ];
    const allocParams = [Number(facultyId), effectiveToDate, effectiveFromDate];

    if (venueId && venueId !== 'all') {
      allocWhere.push('aa.venue_id = ?');
      allocParams.push(Number(venueId));
    }
    if (departmentId && departmentId !== 'all') {
      allocWhere.push('(aa.department_id = ? OR h.DeptID = ?)');
      allocParams.push(Number(departmentId), Number(departmentId));
    }

    const [allocRows] = await pool.query(
      `SELECT aa.id, aa.venue_id, aa.academic_year, aa.semester,
              aa.subject_name, aa.subject_code, aa.year_of_study, aa.section,
              DATE_FORMAT(aa.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(aa.end_date, '%Y-%m-%d') AS end_date,
              aa.purpose, aa.status AS alloc_status,
              h.HallName, h.VenueType, h.ownership_type, h.DeptID,
              d.DeptName AS department_name
       FROM academic_allocations aa
       JOIN halls h ON aa.venue_id = h.HallID
       LEFT JOIN departments d ON (aa.department_id = d.DeptID OR h.DeptID = d.DeptID)
       WHERE ${allocWhere.join(' AND ')}`,
      allocParams
    );

    if (allocRows.length) {
      const allocIds = allocRows.map((a) => a.id);

      // Fetch rules
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

      // Fetch occurrences exceptions
      const [overrides] = await pool.query(
        `SELECT allocation_id, DATE_FORMAT(occurrence_date, '%Y-%m-%d') AS occ_date, period_id, status, remark
         FROM academic_allocation_occurrences
         WHERE allocation_id IN (?) AND occurrence_date BETWEEN ? AND ?`,
        [allocIds, effectiveFromDate, effectiveToDate]
      );

      const overrideMap = new Map();
      overrides.forEach((ov) => {
        overrideMap.set(`${ov.allocation_id}_${ov.occ_date}_${ov.period_id}`, ov);
      });

      for (const a of allocRows) {
        const aRules = ruleMap.get(a.id) || [];
        const startBound = a.start_date < effectiveFromDate ? effectiveFromDate : a.start_date;
        const endBound = a.end_date > effectiveToDate ? effectiveToDate : a.end_date;

        for (const r of aRules) {
          const matchDates = getDatesForDayIndex(startBound, endBound, Number(r.day_index));

          for (const d of matchDates) {
            const ov = overrideMap.get(`${a.id}_${d}_${r.period_id}`);
            const occStatus = ov ? ov.status : 'SCHEDULED';
            const occRemark = ov ? ov.remark : null;

            // Skip cancelled sessions unless specifically filtered
            if (occStatus === 'CANCELLED' && status !== 'CANCELLED') continue;

            if (status && status !== 'all' && occStatus.toUpperCase() !== status.toUpperCase()) {
              continue;
            }

            const dt = new Date(`${d}T00:00:00`);
            const dayName = DAYS[dt.getDay()] || r.day_of_week;
            const periodInfo = getPeriodDetails(r.period_id);

            usageHistory.push({
              id: `academic_${a.id}_${d}_${r.period_id}`,
              recordId: a.id,
              relatedBookingId: null,
              booking_id: null,
              allocationId: a.id,
              allocation_id: a.id,
              date: d,
              day: dayName,
              day_name: dayName,
              venueId: a.venue_id,
              venue_id: a.venue_id,
              venueName: a.HallName,
              venue_name: a.HallName,
              venueType: a.VenueType || 'Laboratory',
              venue_type: a.VenueType || 'Laboratory',
              ownershipType: a.ownership_type || 'DEPARTMENT',
              ownership_type: a.ownership_type || 'DEPARTMENT',
              department: a.department_name || 'Academic Dept',
              department_name: a.department_name || 'Academic Dept',
              departmentId: a.DeptID,
              department_id: a.DeptID,
              period: periodInfo.label,
              period_label: periodInfo.label,
              periodId: r.period_id,
              period_id: r.period_id,
              time: `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}`,
              start_time: r.start_time,
              end_time: r.end_time,
              subjectOrPurpose: `${a.subject_name} (${a.year_of_study} ${a.section})`,
              subject_or_purpose: `${a.subject_name} (${a.year_of_study} ${a.section})`,
              bookingType: 'Academic Allocation',
              booking_type: 'ACADEMIC_ALLOCATION',
              year_of_study: a.year_of_study,
              section: a.section,
              status: occStatus === 'SCHEDULED' ? 'Completed' : occStatus,
              bookingStatus: occStatus === 'SCHEDULED' ? 'Completed' : occStatus,
              booking_status: occStatus === 'SCHEDULED' ? 'Completed' : occStatus,
              remark: occRemark,
            });
          }
        }
      }
    }
  }

  // Sort descending by date
  usageHistory.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.periodId || 0) - (a.periodId || 0);
  });

  return {
    success: true,
    data: usageHistory,
    total: usageHistory.length,
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  };
};

module.exports = {
  getFacultyVenueUsageHistory,
};
