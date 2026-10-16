const pool = require('../config/db');
const { PERIODS, formatTime } = require('../config/periods');

/**
 * Normalizes text for NLU pattern matching
 */
const normalizeText = (text = '') => {
  return String(text).toLowerCase().trim();
};

/**
 * Format Date as YYYY-MM-DD in local time
 */
const formatDateStr = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extract Date from natural language
 */
const extractDate = (text) => {
  const clean = normalizeText(text);
  const today = new Date();

  // 1. "today"
  if (/\btoday\b|\binru\b|\baaj\b/.test(clean)) {
    return formatDateStr(today);
  }

  // 2. "tomorrow"
  if (/\btomorrow\b|\bnaalai\b|\bkal\b/.test(clean)) {
    const tmrw = new Date(today);
    tmrw.setDate(tmrw.getDate() + 1);
    return formatDateStr(tmrw);
  }

  // 3. "day after tomorrow"
  if (/\bday after tomorrow\b|\bnaalannikku\b|\bparso\b/.test(clean)) {
    const dat = new Date(today);
    dat.setDate(dat.getDate() + 2);
    return formatDateStr(dat);
  }

  // 4. Weekdays (e.g. "Monday", "this Wednesday", "next Friday")
  const weekdays = [
    { name: 'sunday', day: 0, alt: ['sun', 'ஞாயிறு', 'ravivar'] },
    { name: 'monday', day: 1, alt: ['mon', 'திங்கள்', 'somwar'] },
    { name: 'tuesday', day: 2, alt: ['tue', 'செவ்வாய்', 'mangalwar'] },
    { name: 'wednesday', day: 3, alt: ['wed', 'புதன்', 'budhwar'] },
    { name: 'thursday', day: 4, alt: ['thu', 'வியாழன்', 'guruwar'] },
    { name: 'friday', day: 5, alt: ['fri', 'வெள்ளி', 'shukrawar'] },
    { name: 'saturday', day: 6, alt: ['sat', 'சனி', 'shaniwar'] },
  ];

  for (const w of weekdays) {
    const pattern = new RegExp(`\\b(${w.name}|${w.alt.join('|')})\\b`, 'i');
    if (pattern.test(clean)) {
      const targetDay = w.day;
      const currentDay = today.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7; // Treat mention of weekday as next occurrence if today is that day
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + diff);
      return formatDateStr(targetDate);
    }
  }

  // 5. YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // 6. DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = clean.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 7. Named month format e.g. "05-Oct-2026", "5 Oct 2026", "October 6"
  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };
  const namedMatch = clean.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]([a-z]+)[\s-]?(\d{4})?/);
  if (namedMatch) {
    const day = namedMatch[1].padStart(2, '0');
    const mStr = namedMatch[2].toLowerCase();
    const year = namedMatch[3] || today.getFullYear();
    if (monthNames[mStr]) {
      return `${year}-${monthNames[mStr]}-${day}`;
    }
  }

  return null;
};

/**
 * Extract Period numbers from natural language
 * Handles "P2", "period 3", "P3 to P5", "P3-P5"
 */
const extractPeriods = (text) => {
  const clean = normalizeText(text);

  // Range detection: "P3 to P5" or "P3-P5" or "period 3 to period 5"
  const rangeMatch = clean.match(/(?:p|period)\s*([1-8])\s*(?:to|-)\s*(?:p|period)?\s*([1-8])/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const periods = [];
    for (let i = min; i <= max; i++) periods.push(i);
    return periods;
  }

  // Single or multiple individual periods: "P2", "p4", "period 2"
  const matches = [...clean.matchAll(/\b(?:p|period)\s*([1-8])\b/gi)];
  if (matches.length > 0) {
    const extracted = matches.map((m) => parseInt(m[1], 10));
    return [...new Set(extracted)].sort((a, b) => a - b);
  }

  return [];
};

/**
 * Extract Venue Type
 */
const extractVenueType = (text) => {
  const clean = normalizeText(text);
  if (clean.includes('smart classroom') || clean.includes('smart class')) return 'Smart Classroom';
  if (clean.includes('seminar hall') || clean.includes('seminar')) return 'Seminar Hall';
  if (clean.includes('auditorium') || clean.includes('audi')) return 'Auditorium';
  if (clean.includes('computer lab') || clean.includes('lab') || clean.includes('laboratory')) return 'Computer Lab';
  if (clean.includes('conference room') || clean.includes('board room')) return 'Conference Room';
  if (clean.includes('classroom') || clean.includes('class room')) return 'Classroom';
  return null;
};

/**
 * Extract Required Facilities
 */
const extractFacilities = (text) => {
  const clean = normalizeText(text);
  const found = new Set();

  if (/\b(projector|projectors)\b/.test(clean)) found.add('Projector');
  if (/\b(ac|a\/c|air condition|air conditioner|air conditioning|air conditioned)\b/.test(clean)) found.add('Air Conditioner');
  if (/\b(wifi|wi-fi|internet)\b/.test(clean)) found.add('WiFi');
  if (/\b(smart board|smartboard|digital board)\b/.test(clean)) found.add('Smart Board');
  if (/\b(speaker|sound system|audio|mic|microphone)\b/.test(clean)) found.add('Speaker System');
  if (/\b(podium|stage mic)\b/.test(clean)) found.add('Podium');
  if (/\b(white board|whiteboard)\b/.test(clean)) found.add('White Board');
  if (/\b(cctv|camera)\b/.test(clean)) found.add('CCTV');

  return Array.from(found);
};

/**
 * Extract Department
 */
const extractDepartment = (text) => {
  const clean = normalizeText(text);
  if (clean.includes('computer science') || clean.includes('cse')) return 'Computer Science and Engineering';
  if (clean.includes('information technology') || clean.includes('it dept') || clean.includes(' it ')) return 'Information Technology';
  if (clean.includes('electronics and communication') || clean.includes('ece')) return 'Electronics and Communication Engineering';
  if (clean.includes('electrical and electronics') || clean.includes('eee')) return 'Electrical and Electronics Engineering';
  if (clean.includes('mechanical') || clean.includes('mech')) return 'Mechanical Engineering';
  if (clean.includes('civil')) return 'Civil Engineering';
  if (clean.includes('ai & ds') || clean.includes('aids') || clean.includes('artificial intelligence')) return 'Artificial Intelligence and Data Science';
  return null;
};

/**
 * Extract Specific Venue Name if mentioned in text
 */
const extractSpecificVenueName = async (text) => {
  const clean = normalizeText(text);
  try {
    const [halls] = await pool.query('SELECT HallID, HallName FROM Halls WHERE ActiveStatus = 1');
    for (const h of halls) {
      const hNameLower = h.HallName.toLowerCase();
      // Look for whole-word or delimited match e.g. "f14", "lab1"
      const regex = new RegExp(`\\b${hNameLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(clean)) {
        return h;
      }
    }
  } catch (err) {
    console.error('Error extracting specific venue name:', err.message);
  }
  return null;
};

/**
 * Query real DB for available venues matching criteria
 */
const searchAvailableVenues = async ({ date, periods = [], venueType, facilities = [], department, specificHallId }) => {
  try {
    // 1. Fetch active venues
    let whereClauses = ['h.ActiveStatus = 1'];
    const params = [];

    if (specificHallId) {
      whereClauses.push('h.HallID = ?');
      params.push(Number(specificHallId));
    }

    if (venueType && venueType.toLowerCase() !== 'all') {
      whereClauses.push('LOWER(h.VenueType) = LOWER(?)');
      params.push(venueType);
    }

    if (department) {
      whereClauses.push('(LOWER(d.DeptName) LIKE LOWER(?) OR LOWER(h.HallName) LIKE LOWER(?))');
      params.push(`%${department}%`, `%${department}%`);
    }

    const [venues] = await pool.query(
      `SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.VenueType,
              h.HasProjector, h.HasSmartBoard, h.HasWiFi, h.HasSpeaker,
              h.HasPodium, h.HasWhiteBoard, h.HasCCTV, h.HasAC, h.ImageURL,
              d.DeptName
       FROM Halls h
       LEFT JOIN Departments d ON h.DeptID = d.DeptID
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY h.Capacity DESC`,
      params
    );

    if (venues.length === 0) return [];

    // 2. Fetch facilities from venue_facility_mapping
    const hallIds = venues.map((v) => v.HallID);
    const [mappingRows] = await pool.query(
      `SELECT m.venue_id, f.name
       FROM venue_facility_mapping m
       JOIN venue_facilities f ON f.id = m.facility_id
       WHERE m.venue_id IN (?) AND f.IsActive = 1`,
      [hallIds]
    );

    const facilitiesByHall = new Map();
    mappingRows.forEach((r) => {
      const list = facilitiesByHall.get(r.venue_id) || [];
      list.push(r.name);
      facilitiesByHall.set(r.venue_id, list);
    });

    const legacyMap = [
      ['Air Conditioner', 'HasAC'],
      ['Projector', 'HasProjector'],
      ['Smart Board', 'HasSmartBoard'],
      ['WiFi', 'HasWiFi'],
      ['Speaker System', 'HasSpeaker'],
      ['Podium', 'HasPodium'],
      ['White Board', 'HasWhiteBoard'],
      ['CCTV', 'HasCCTV'],
    ];

    // 3. For each venue, check facilities and period availability
    const availableVenues = [];

    for (const v of venues) {
      const facSet = new Set(facilitiesByHall.get(v.HallID) || []);
      for (const [facName, col] of legacyMap) {
        if (v[col] === 1 || v[col] === true) {
          facSet.add(facName);
        }
      }
      const venueFacs = Array.from(facSet);

      // Check facility requirements: venue must have ALL requested facilities
      if (facilities.length > 0) {
        const normFacs = venueFacs.map((f) => f.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const hasAll = facilities.every((reqF) => {
          const normReq = reqF.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normFacs.includes(normReq) || (normReq === 'ac' && normFacs.includes('airconditioner'));
        });
        if (!hasAll) continue;
      }

      // Check conflict if date & periods specified
      if (date && periods.length > 0) {
        let isBooked = false;
        for (const pNum of periods) {
          const pSlot = PERIODS.find((p) => p.period === pNum);
          if (!pSlot) continue;

          const [conflict] = await pool.query(
            `SELECT id FROM bookings
             WHERE hall_id = ?
               AND DATE(date) = ?
               AND status IN ('Pending', 'Approved')
               AND time_from < ?
               AND time_to > ?
             LIMIT 1`,
            [v.HallID, date, pSlot.end, pSlot.start]
          );

          if (conflict.length > 0) {
            isBooked = true;
            break;
          }
        }
        if (isBooked) continue;
      }

      availableVenues.push({
        hallId: v.HallID,
        hallName: v.HallName,
        venueType: v.VenueType || 'Standard Venue',
        department: v.DeptName || '',
        location: v.Location || 'Campus',
        capacity: Number(v.Capacity) || 0,
        facilities: venueFacs,
        image: v.ImageURL || null,
      });
    }

    return availableVenues;
  } catch (error) {
    console.error('Error in searchAvailableVenues:', error);
    return [];
  }
};

/**
 * Main NLU & Intelligent Booking Assistant Dispatcher
 */
const handleIntelligentBookingChat = async ({ message, user, role }) => {
  const clean = normalizeText(message);

  // 1. Slot & Entity Extraction
  const extractedDate = extractDate(clean);
  const extractedPeriods = extractPeriods(clean);
  const extractedVenueType = extractVenueType(clean);
  const extractedFacilities = extractFacilities(clean);
  const extractedDept = extractDepartment(clean);
  const specificVenue = await extractSpecificVenueName(clean);

  // 2. Intent Detection
  const isSearchOrBookIntent =
    clean.includes('need') ||
    clean.includes('want') ||
    clean.includes('book') ||
    clean.includes('available') ||
    clean.includes('free') ||
    clean.includes('room') ||
    clean.includes('venue') ||
    clean.includes('hall') ||
    clean.includes('classroom') ||
    clean.includes('lab') ||
    clean.includes('auditorium') ||
    clean.includes('seminar') ||
    clean.includes('recommend') ||
    clean.includes('find');

  const isSpecificVenueCheck =
    specificVenue &&
    (clean.includes('available') || clean.includes('free') || clean.includes('status') || clean.includes('book') || clean.includes('is'));

  const isViewBookingsIntent =
    (clean.includes('my booking') || clean.includes('my bookings') || clean.includes('pending booking') || clean.includes('show booking')) &&
    !clean.includes('how to book');

  const isCancelIntent =
    (clean.includes('cancel') && (clean.includes('booking') || clean.includes('request') || clean.includes('reserve'))) ||
    clean.startsWith('cancel ');

  const isTimetableIntent =
    clean.includes('timetable') || clean.includes('time table') || clean.includes('schedule');

  const isFacilityOnlyQuery =
    (clean.includes('which room') || clean.includes('which venue') || clean.includes('do we have') || clean.includes('equipped')) &&
    extractedFacilities.length > 0 &&
    !extractedDate &&
    extractedPeriods.length === 0;

  // ----------------------------------------------------
  // Handler A: View User's Bookings
  // ----------------------------------------------------
  if (isViewBookingsIntent) {
    const [bookings] = await pool.query(
      `SELECT id, hall_name, date, time_from, time_to, status, reason
       FROM bookings
       WHERE staff_email = ?
       ORDER BY date DESC, time_from DESC
       LIMIT 5`,
      [user.email]
    );

    if (bookings.length === 0) {
      return {
        handled: true,
        response: `You have no recent venue bookings. Would you like to find an available venue to book?`,
        navAction: { type: 'NAVIGATE', path: role === 'admin' ? '/admin/bookings' : '/faculty/my-bookings' },
      };
    }

    const list = bookings
      .map((b) => {
        const dStr = String(b.date).slice(0, 10);
        const tFrom = String(b.time_from).slice(0, 5);
        const tTo = String(b.time_to).slice(0, 5);
        return `• Booking #${b.id}: ${b.hall_name} on ${dStr} (${tFrom} - ${tTo}) — Status: [${b.status}]`;
      })
      .join('\n');

    return {
      handled: true,
      response: `Here are your recent venue bookings:\n\n${list}\n\nYou can click below to view the full details.`,
      navAction: { type: 'NAVIGATE', path: role === 'admin' ? '/admin/bookings' : '/faculty/my-bookings' },
    };
  }

  // ----------------------------------------------------
  // Handler B: Cancel Booking Intent
  // ----------------------------------------------------
  if (isCancelIntent) {
    // Check if user specified a booking ID e.g. "cancel booking 12"
    const idMatch = clean.match(/#?(\d+)/);
    if (idMatch) {
      const bookingId = idMatch[1];
      return {
        handled: true,
        response: `To cancel booking #${bookingId}, please go to 'My Bookings', find booking #${bookingId}, and click the 'Cancel Booking' button for secure confirmation.`,
        navAction: { type: 'NAVIGATE', path: role === 'admin' ? '/admin/bookings' : '/faculty/my-bookings' },
      };
    }

    return {
      handled: true,
      response: `To cancel a booking:\n1. Open 'My Bookings' from the sidebar.\n2. Locate the Pending or Approved booking you wish to cancel.\n3. Click 'Cancel Booking' to release the slot.`,
      navAction: { type: 'NAVIGATE', path: role === 'admin' ? '/admin/bookings' : '/faculty/my-bookings' },
    };
  }

  // ----------------------------------------------------
  // Handler C: Timetable Query
  // ----------------------------------------------------
  if (isTimetableIntent) {
    return {
      handled: true,
      response: `You can view the live master timetable and slot allocations in the Timetable section.`,
      navAction: { type: 'NAVIGATE', path: role === 'admin' ? '/admin/timetable' : '/faculty/timetable' },
    };
  }

  // ----------------------------------------------------
  // Handler D: Facility Query without specific date/period
  // ----------------------------------------------------
  if (isFacilityOnlyQuery) {
    const venues = await searchAvailableVenues({ facilities: extractedFacilities });
    if (venues.length === 0) {
      return {
        handled: true,
        response: `No active venues currently have all requested facilities (${extractedFacilities.join(', ')}).`,
      };
    }

    const venueList = venues
      .slice(0, 5)
      .map((v, i) => `${i + 1}. **${v.hallName}** (${v.venueType}, Cap: ${v.capacity})\n   Facilities: ${v.facilities.join(', ')}`)
      .join('\n\n');

    return {
      handled: true,
      response: `Here are venues equipped with ${extractedFacilities.join(', ')}:\n\n${venueList}\n\nWould you like to check availability for any of these? Tell me your date and period (e.g. "tomorrow for P2").`,
      recommendedVenues: venues.slice(0, 5),
    };
  }

  // ----------------------------------------------------
  // Handler E: Specific Venue Availability Check
  // ----------------------------------------------------
  if (isSpecificVenueCheck) {
    const targetDate = extractedDate || formatDateStr(new Date());
    const periodNums = extractedPeriods.length > 0 ? extractedPeriods : [1, 2, 3, 4, 5, 6, 7, 8];

    const venues = await searchAvailableVenues({
      date: targetDate,
      periods: periodNums,
      specificHallId: specificVenue.HallID,
    });

    if (venues.length > 0) {
      const v = venues[0];
      const pStr = extractedPeriods.length > 0 ? `for P${extractedPeriods.join(', P')}` : 'across all requested slots';
      return {
        handled: true,
        response: `Yes! **${v.hallName}** (${v.venueType}, Capacity: ${v.capacity}) is **Available** on ${targetDate} ${pStr}.\n\nFacilities: ${v.facilities.join(', ')}\n\nWould you like to book ${v.hallName}?`,
        recommendedVenues: [v],
        bookingIntent: {
          date: targetDate,
          periods: extractedPeriods,
          venueId: v.hallId,
          venueName: v.hallName,
        },
      };
    } else {
      // Conflict! Find alternative venues with similar facilities and capacity
      const alternatives = await searchAvailableVenues({
        date: targetDate,
        periods: periodNums,
      });

      const altText = alternatives.length > 0
        ? `\n\nAvailable alternatives on ${targetDate}:\n` +
          alternatives.slice(0, 3).map((a) => `• **${a.hallName}** (${a.venueType}, Cap: ${a.capacity})`).join('\n')
        : '';

      return {
        handled: true,
        response: `**${specificVenue.HallName}** is unavailable on ${targetDate} for the requested slot.${altText}\n\nWould you like to check another slot or book one of the alternatives?`,
        recommendedVenues: alternatives.slice(0, 3),
      };
    }
  }

  // ----------------------------------------------------
  // Handler F: Natural Language Booking & Availability Search
  // ----------------------------------------------------
  if (isSearchOrBookIntent) {
    // Check for missing date
    if (!extractedDate && extractedPeriods.length > 0) {
      return {
        handled: true,
        response: `Sure! For which date do you need the venue? (e.g. today, tomorrow, or a specific date like 2026-10-06)`,
      };
    }

    // Check for missing period if user specifically asks to book or find a classroom/lab
    const isGenericQuestion = clean.includes('free tomorrow') || clean.includes('available tomorrow') || clean.includes('which rooms');
    if (extractedDate && extractedPeriods.length === 0 && !isGenericQuestion) {
      return {
        handled: true,
        response: `Sure. Which period do you need for ${extractedDate}? (e.g. P1 to P8, or a range like P3-P5)`,
      };
    }

    // User provided date (or defaults to tomorrow for generic free queries)
    const targetDate = extractedDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return formatDateStr(d);
    })();

    const targetPeriods = extractedPeriods.length > 0 ? extractedPeriods : [1, 2, 3, 4];

    // Search real DB
    const results = await searchAvailableVenues({
      date: targetDate,
      periods: targetPeriods,
      venueType: extractedVenueType,
      facilities: extractedFacilities,
      department: extractedDept,
    });

    if (results.length === 0) {
      return {
        handled: true,
        response: `No venues matched all your criteria (Date: ${targetDate}, Periods: P${targetPeriods.join(', P')}${
          extractedVenueType ? `, Type: ${extractedVenueType}` : ''
        }${extractedFacilities.length ? `, Facilities: ${extractedFacilities.join(', ')}` : ''}).\n\nWould you like to see alternatives with fewer facility restrictions?`,
      };
    }

    const topResults = results.slice(0, 3);
    const formattedList = topResults
      .map(
        (v, i) =>
          `${i + 1}. **${v.hallName}**\n   ${v.venueType}\n   Capacity: ${v.capacity}\n   Facilities: ${
            v.facilities.length ? v.facilities.join(', ') : 'Standard Amenities'
          }`
      )
      .join('\n\n');

    const firstVenue = topResults[0];
    const periodLabel = targetPeriods.length > 1 ? `P${targetPeriods[0]} - P${targetPeriods[targetPeriods.length - 1]}` : `P${targetPeriods[0]}`;

    return {
      handled: true,
      response: `Based on your requirements, these venues are available on ${targetDate} for ${periodLabel}:\n\n${formattedList}\n\nWould you like to book **${firstVenue.hallName}**?`,
      recommendedVenues: topResults,
      bookingIntent: {
        date: targetDate,
        periods: targetPeriods,
        periodSlot: PERIODS.find((p) => p.period === targetPeriods[0]) || null,
        venueId: firstVenue.hallId,
        venueName: firstVenue.hallName,
      },
    };
  }

  // Not directly a booking search intent
  return { handled: false };
};

module.exports = {
  handleIntelligentBookingChat,
  extractDate,
  extractPeriods,
  extractVenueType,
  extractFacilities,
  extractDepartment,
  searchAvailableVenues,
};
