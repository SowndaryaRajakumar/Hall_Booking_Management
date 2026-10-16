const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');
const { normalizeRole } = require('../middlewares/permissionMiddleware');

const resolveUserDeptId = async (user) => {
  if (!user) return null;
  if (user.departmentId) return Number(user.departmentId);
  if (user.department_id) return Number(user.department_id);
  const staffId = user.staffId || user.id;
  if (!staffId) return null;
  const [rows] = await pool.query('SELECT department_id, department FROM staff WHERE staff_id = ? LIMIT 1', [staffId]);
  if (rows.length && rows[0].department_id) return Number(rows[0].department_id);
  if (rows.length && rows[0].department) {
    const [dRows] = await pool.query('SELECT DeptID FROM departments WHERE LOWER(DeptName) = LOWER(?) LIMIT 1', [rows[0].department]);
    if (dRows.length) return Number(dRows[0].DeptID);
  }
  return null;
};

const getBodyValue = (body, keys, fallback = "") => {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
};

const parseNumber = (value, fallback = 0) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const LEGACY_FACILITY_COLUMNS = {
  'Air Conditioner': 'hasAC', Projector: 'hasProjector', 'Smart Board': 'hasSmartBoard', WiFi: 'hasWiFi',
  'Speaker System': 'hasSpeaker', Podium: 'hasPodium', 'White Board': 'hasWhiteBoard', CCTV: 'hasCCTV',
};

const parseFacilityIds = (value) => {
  if (Array.isArray(value)) return [...new Set(value.map(Number))];
  try { return [...new Set(JSON.parse(value || '[]').map(Number))]; } catch { return null; }
};

const validateFacilityIds = async (facilityIds) => {
  if (!Array.isArray(facilityIds) || facilityIds.some((id) => !Number.isInteger(id) || id < 1)) return null;
  if (!facilityIds.length) return [];
  const [rows] = await pool.query('SELECT id, name FROM venue_facilities WHERE id IN (?) AND IsActive = 1', [facilityIds]);
  return rows.length === facilityIds.length ? rows : null;
};

const replaceFacilityMappings = async (connection, hallId, facilities) => {
  await connection.query('DELETE FROM venue_facility_mapping WHERE venue_id = ?', [hallId]);
  if (facilities.length) await connection.query('INSERT INTO venue_facility_mapping (venue_id, facility_id) VALUES ?', [facilities.map((facility) => [hallId, facility.id])]);
};

const normalizeHallRow = (hall = {}) => {
  const hId = hall.HallID ?? hall.hallId ?? hall.id ?? null;
  const hName = hall.HallName ?? hall.hallName ?? hall.name ?? hall.venue_name ?? "";
  const dId = hall.DeptID ?? hall.deptId ?? hall.department_id ?? "";
  const vType = hall.VenueType ?? hall.venueType ?? hall.venue_type ?? "";
  const oType = hall.ownership_type ?? hall.ownershipType ?? "DEPARTMENT";

  return {
    id: hId,
    hallId: hId,
    HallID: hId,
    venue_id: hId,
    hallName: hName,
    HallName: hName,
    name: hName,
    venue_name: hName,
    department: hall.DeptName ?? hall.department ?? "",
    deptId: dId,
    DeptID: dId,
    department_id: dId,
    location: hall.Location ?? hall.location ?? "",
    capacity: hall.Capacity ?? hall.capacity ?? "",
    numberOfSystems: hall.NumberOfSystems ?? hall.numberOfSystems ?? 0,
    venueType: vType,
    VenueType: vType,
    venue_type: vType,
    hasProjector: Boolean(hall.HasProjector ?? hall.hasProjector),
    hasSmartBoard: Boolean(hall.HasSmartBoard ?? hall.hasSmartBoard),
    hasWiFi: Boolean(hall.HasWiFi ?? hall.hasWiFi),
    hasSpeaker: Boolean(hall.HasSpeaker ?? hall.hasSpeaker),
    hasPodium: Boolean(hall.HasPodium ?? hall.hasPodium),
    hasWhiteBoard: Boolean(hall.HasWhiteBoard ?? hall.hasWhiteBoard),
    hasCCTV: Boolean(hall.HasCCTV ?? hall.hasCCTV),
    hasAC: Boolean(hall.HasAC ?? hall.hasAC),
    microphoneType: hall.MicrophoneType ?? hall.microphoneType ?? "None",
    additionalFeatures: hall.AdditionalFeatures ?? hall.additionalFeatures ?? "",
    image: hall.ImageURL ?? hall.image ?? null,
    activeStatus: parseBoolean(hall.ActiveStatus ?? hall.activeStatus, true),
    ownershipType: oType,
    ownership_type: oType,
    category: hall.category ?? vType,
    approvalRole: hall.approval_role ?? hall.approvalRole ?? "DEPARTMENT_ADMIN",
    facilities: hall.facilities || [],
    facilityIds: hall.facilityIds || [],
  };
};

const normalizeHallPayload = (body = {}) => ({
  hallName: getBodyValue(body, ["hallName", "HallName", "name"], ""),
  location: getBodyValue(body, ["location", "Location"], ""),
  capacity: getBodyValue(body, ["capacity", "Capacity"], ""),
  deptId: getBodyValue(body, ["deptId", "DeptID", "deptID"], ""),
  venueType: getBodyValue(body, ["venueType", "VenueType"], ""),
  hasProjector: parseBoolean(getBodyValue(body, ["hasProjector", "HasProjector"], false), false),
  hasSmartBoard: parseBoolean(getBodyValue(body, ["hasSmartBoard", "HasSmartBoard"], false), false),
  hasWiFi: parseBoolean(getBodyValue(body, ["hasWiFi", "HasWiFi"], false), false),
  hasSpeaker: parseBoolean(getBodyValue(body, ["hasSpeaker", "HasSpeaker"], false), false),
  hasPodium: parseBoolean(getBodyValue(body, ["hasPodium", "HasPodium"], false), false),
  hasWhiteBoard: parseBoolean(getBodyValue(body, ["hasWhiteBoard", "HasWhiteBoard"], false), false),
  hasCCTV: parseBoolean(getBodyValue(body, ["hasCCTV", "HasCCTV"], false), false),
  hasAC: parseBoolean(getBodyValue(body, ["hasAC", "HasAC"], false), false),
  microphoneType: getBodyValue(body, ["microphoneType", "MicrophoneType"], "None"),
  additionalFeatures: getBodyValue(body, ["additionalFeatures", "AdditionalFeatures"], ""),
  activeStatus: parseBoolean(getBodyValue(body, ["activeStatus", "ActiveStatus"], true), true),
  numberOfSystems: parseNumber(getBodyValue(body, ["numberOfSystems", "NumberOfSystems"], 0), 0),
  facilityIds: parseFacilityIds(body.facilityIds),
});

const validateVenueMasterData = async (payload) => {
  const [departments] = await pool.query('SELECT DeptID FROM Departments WHERE DeptID = ? AND IsActive = 1', [payload.deptId]);
  if (!departments.length) return 'Please select an active department.';

  const [venueTypes] = await pool.query('SELECT id FROM venue_types WHERE name = ? AND IsActive = 1', [payload.venueType]);
  if (!venueTypes.length) return 'Please select an active venue type.';

  return null;
};

// Get all halls
exports.getAllHalls = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  try {
    const where = ["1=1"];
    const params = [];
    if (req.query.search?.trim()) { where.push('(h.HallName LIKE ? OR h.Location LIKE ? OR d.DeptName LIKE ?)'); const term = `%${req.query.search.trim()}%`; params.push(term, term, term); }
    if (req.query.status === 'active') where.push('h.ActiveStatus = 1');
    if (req.query.status === 'inactive') where.push('h.ActiveStatus = 0');
    if (req.query.deptId) { where.push('h.DeptID = ?'); params.push(req.query.deptId); }
    if (req.query.ownershipType) { where.push('h.ownership_type = ?'); params.push(req.query.ownershipType); }

    // Role-based venue accessibility filtering:
    if (req.user) {
      const userRole = normalizeRole(req.user.role);
      if (userRole === 'FACULTY' || userRole === 'DEPARTMENT_ADMIN') {
        const deptId = await resolveUserDeptId(req.user);
        if (deptId) {
          where.push(`(
            (h.ownership_type = 'DEPARTMENT' AND h.DeptID = ?)
            OR
            (h.ownership_type = 'COMMON' AND NOT EXISTS (
              SELECT 1 FROM venue_access va
              WHERE va.venue_id = h.HallID
                AND va.department_id = ?
                AND (va.access_type = 'RESTRICTED' OR va.status = 0)
            ))
          )`);
          params.push(deptId, deptId);
        }
      }
    }

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM Halls h LEFT JOIN Departments d ON h.DeptID = d.DeptID WHERE ${where.join(' AND ')}`, params);
    const [rows] = await pool.query(`
      SELECT
        h.*,
        d.DeptName
      FROM Halls h
      LEFT JOIN Departments d
      ON h.DeptID = d.DeptID
      WHERE ${where.join(' AND ')} ORDER BY h.HallName ASC LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const halls = await hydrateFacilities(rows);

    res.json({
      success: true,
      data: halls,
      pagination: makePagination({ page, limit, total: countRow.total })
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch venues"
    });
  }
};

const hydrateFacilities = async (rows) => {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.HallID);
  const [facilities] = await pool.query(`SELECT m.venue_id, f.id, f.name FROM venue_facility_mapping m
    JOIN venue_facilities f ON f.id = m.facility_id WHERE m.venue_id IN (?) ORDER BY f.name`, [ids]);
  const byVenue = new Map();
  facilities.forEach((facility) => {
    const current = byVenue.get(facility.venue_id) || { names: [], ids: [] };
    current.names.push(facility.name); current.ids.push(facility.id); byVenue.set(facility.venue_id, current);
  });
  return rows.map((row) => normalizeHallRow({ ...row, facilities: byVenue.get(row.HallID)?.names || [], facilityIds: byVenue.get(row.HallID)?.ids || [] }));
};

// Get all active halls
exports.getActiveHalls = async (req, res) => {
  try {
    const where = ["h.ActiveStatus = 1"];
    const params = [];

    if (req.user) {
      const userRole = normalizeRole(req.user.role);
      if (userRole === 'FACULTY' || userRole === 'DEPARTMENT_ADMIN') {
        const deptId = await resolveUserDeptId(req.user);
        if (deptId) {
          where.push(`(
            (h.ownership_type = 'DEPARTMENT' AND h.DeptID = ?)
            OR
            (h.ownership_type = 'COMMON' AND NOT EXISTS (
              SELECT 1 FROM venue_access va
              WHERE va.venue_id = h.HallID
                AND va.department_id = ?
                AND (va.access_type = 'RESTRICTED' OR va.status = 0)
            ))
          )`);
          params.push(deptId, deptId);
        }
      }
    }

    const [rows] = await pool.query(
      `SELECT h.*, d.DeptName
       FROM Halls h
       LEFT JOIN Departments d ON h.DeptID = d.DeptID
       WHERE ${where.join(' AND ')}
       ORDER BY h.HallName ASC`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching active halls:', error);
    res.status(500).json({ error: 'Failed to fetch active halls' });
  }
};

// Get halls by department
exports.getHallsByDepartment = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'CALL GetHallsByDepartment(?)',
      [req.params.deptId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching halls:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
};

// Get a specific hall
exports.getHallById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT h.*, d.DeptName FROM Halls h LEFT JOIN Departments d ON h.DeptID = d.DeptID WHERE h.HallID = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }

    res.json({ success: true, data: (await hydrateFacilities(rows))[0] });
  } catch (error) {
    console.error('Error fetching hall details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hall details' });
  }
};

// Add a new hall
exports.createHall = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const payload = normalizeHallPayload(req.body);

    if (userRole === 'DEPARTMENT_ADMIN') {
      const userDeptId = await resolveUserDeptId(req.user);
      if (!userDeptId) {
        return res.status(403).json({ success: false, message: 'No department assigned to department admin account.' });
      }
      if (payload.deptId && Number(payload.deptId) !== Number(userDeptId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Department Admins can only create venues for their own assigned department.',
        });
      }
      payload.deptId = userDeptId;
      payload.ownershipType = 'DEPARTMENT';
      payload.approvalRole = 'DEPARTMENT_ADMIN';
    } else if (userRole !== 'MASTER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required to create venues.' });
    }

    const imageUrl = req.file
      ? `/uploads/venues/${req.file.filename}`
      : null;

    if (
      !payload.hallName ||
      !payload.location ||
      !payload.capacity ||
      !payload.deptId ||
      !payload.venueType
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const masterDataError = await validateVenueMasterData(payload);
    if (masterDataError) {
      return res.status(400).json({ success: false, message: masterDataError });
    }
    const facilities = await validateFacilityIds(payload.facilityIds);
    if (facilities === null) return res.status(400).json({ success: false, message: 'Please select valid active facilities.' });
    for (const [name, key] of Object.entries(LEGACY_FACILITY_COLUMNS)) payload[key] = facilities.some((facility) => facility.name === name);

    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO Halls
      (
        HallName,
        Location,
        Capacity,
        VenueType,
        HasProjector,
        HasSmartBoard,
        HasWiFi,
        HasSpeaker,
        HasPodium,
        HasWhiteBoard,
        HasCCTV,
        MicrophoneType,
        AdditionalFeatures,
        HasAC,
        NumberOfSystems,
        ImageURL,
        DeptID,
        ActiveStatus,
        ownership_type,
        approval_role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.hallName,
        payload.location,
        payload.capacity,
        payload.venueType,
        payload.hasProjector ? 1 : 0,
        payload.hasSmartBoard ? 1 : 0,
        payload.hasWiFi ? 1 : 0,
        payload.hasSpeaker ? 1 : 0,
        payload.hasPodium ? 1 : 0,
        payload.hasWhiteBoard ? 1 : 0,
        payload.hasCCTV ? 1 : 0,
        payload.microphoneType || "None",
        payload.additionalFeatures || "",
        payload.hasAC ? 1 : 0,
        payload.numberOfSystems || 0,
        imageUrl,
        payload.deptId,
        payload.activeStatus ? 1 : 0,
        payload.ownershipType || 'DEPARTMENT',
        payload.approvalRole || (userRole === 'MASTER_ADMIN' && !payload.deptId ? 'MASTER_ADMIN' : 'DEPARTMENT_ADMIN'),
      ]
    );
    await replaceFacilityMappings(connection, result.insertId, facilities);
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Venue added successfully",
      data: {
        hallId: result.insertId,
        hallName: payload.hallName,
        department: "",
        deptId: payload.deptId,
        location: payload.location,
        capacity: payload.capacity,
        numberOfSystems: payload.numberOfSystems,
        venueType: payload.venueType,
        hasProjector: payload.hasProjector,
        hasSmartBoard: payload.hasSmartBoard,
        hasWiFi: payload.hasWiFi,
        hasSpeaker: payload.hasSpeaker,
        hasPodium: payload.hasPodium,
        hasWhiteBoard: payload.hasWhiteBoard,
        hasCCTV: payload.hasCCTV,
        hasAC: payload.hasAC,
        microphoneType: payload.microphoneType || "None",
        additionalFeatures: payload.additionalFeatures || "",
        image: imageUrl,
        activeStatus: payload.activeStatus,
        ownershipType: payload.ownershipType || 'DEPARTMENT',
      }
    });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to add venue"
    });
  }
};

// Update a hall
exports.updateHall = async (req, res) => {
  try {
    const userRole = normalizeRole(req.user?.role);
    const { id } = req.params;
    const payload = normalizeHallPayload(req.body);

    const [existingRows] = await pool.query('SELECT ImageURL, ActiveStatus, DeptID, ownership_type FROM Halls WHERE HallID = ?', [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Venue not found.' });
    }

    const existingHall = existingRows[0];

    if (userRole === 'DEPARTMENT_ADMIN') {
      const userDeptId = await resolveUserDeptId(req.user);
      if (!userDeptId) {
        return res.status(403).json({ success: false, message: 'No department assigned to department admin account.' });
      }
      if (existingHall.ownership_type === 'COMMON' || !existingHall.DeptID) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only Master Admin can modify common college venues.',
        });
      }
      if (Number(existingHall.DeptID) !== Number(userDeptId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot modify venues belonging to another department.',
        });
      }
      if (payload.deptId && Number(payload.deptId) !== Number(userDeptId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot change department assignment of venue.',
        });
      }
      payload.deptId = userDeptId;
    } else if (userRole !== 'MASTER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }

    const existingImage = existingHall.ImageURL || null;
    const existingStatus = existingHall.ActiveStatus ?? 1;
    const imageUrl = req.file
      ? `/uploads/venues/${req.file.filename}`
      : (getBodyValue(req.body, ["imageUrl", "ImageURL"], existingImage) || existingImage);

    const hasExplicitStatus =
      req.body.activeStatus !== undefined &&
      req.body.activeStatus !== null &&
      req.body.activeStatus !== "" &&
      req.body.activeStatus !== "undefined";

    const activeStatus = hasExplicitStatus
      ? parseBoolean(req.body.activeStatus, existingStatus === 1)
      : existingStatus === 1;

    if (
      !payload.hallName ||
      !payload.location ||
      !payload.capacity ||
      !payload.deptId ||
      !payload.venueType
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const masterDataError = await validateVenueMasterData(payload);
    if (masterDataError) {
      return res.status(400).json({ success: false, message: masterDataError });
    }
    const facilities = await validateFacilityIds(payload.facilityIds);
    if (facilities === null) return res.status(400).json({ success: false, message: 'Please select valid active facilities.' });
    // Inactive facilities are deliberately not offered by the form, but an existing
    // assignment remains attached so deactivation never silently removes old data.
    const [inactiveExisting] = await pool.query(`SELECT f.id, f.name FROM venue_facility_mapping m
      JOIN venue_facilities f ON f.id = m.facility_id WHERE m.venue_id = ? AND f.IsActive = 0`, [id]);
    facilities.push(...inactiveExisting);
    for (const [name, key] of Object.entries(LEGACY_FACILITY_COLUMNS)) payload[key] = facilities.some((facility) => facility.name === name);

    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE Halls
       SET
         HallName = ?,
         Location = ?,
         Capacity = ?,
         VenueType = ?,
         HasProjector = ?,
         HasSmartBoard = ?,
         HasWiFi = ?,
         HasSpeaker = ?,
         HasPodium = ?,
         HasWhiteBoard = ?,
         HasCCTV = ?,
         MicrophoneType = ?,
         AdditionalFeatures = ?,
         HasAC = ?,
         NumberOfSystems = ?,
         ImageURL = ?,
         DeptID = ?,
         ActiveStatus = ?
       WHERE HallID = ?`,
      [
        payload.hallName,
        payload.location,
        payload.capacity,
        payload.venueType,
        payload.hasProjector ? 1 : 0,
        payload.hasSmartBoard ? 1 : 0,
        payload.hasWiFi ? 1 : 0,
        payload.hasSpeaker ? 1 : 0,
        payload.hasPodium ? 1 : 0,
        payload.hasWhiteBoard ? 1 : 0,
        payload.hasCCTV ? 1 : 0,
        payload.microphoneType || "None",
        payload.additionalFeatures || "",
        payload.hasAC ? 1 : 0,
        payload.numberOfSystems || 0,
        imageUrl,
        payload.deptId,
        activeStatus ? 1 : 0,
        id
      ]
    );
    await replaceFacilityMappings(connection, id, facilities);
    await connection.commit();

    const [updatedRows] = await connection.query(
      'SELECT h.*, d.DeptName FROM Halls h LEFT JOIN Departments d ON h.DeptID = d.DeptID WHERE h.HallID = ?',
      [id]
    );

    res.json({
      success: true,
      message: "Venue updated successfully",
      data: (await hydrateFacilities(updatedRows))[0]
    });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update venue"
    });
  }
};
// Check availability of halls for a specific department and timeslot
exports.checkHallsAvailability = async (req, res) => {
  const { deptId, selectedDate, timeSlot } = req.body;

  if (!deptId || !selectedDate || !timeSlot) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT h.HallID, h.HallName, h.Location, h.Capacity 
       FROM Halls h 
       JOIN Departments d ON h.DeptID = d.DeptID 
       WHERE h.DeptID = ? 
       AND h.HallID NOT IN (
         SELECT HallID FROM Bookings 
         WHERE BookingDate = ? AND TimeSlot = ?
       )`,
      [deptId, selectedDate, timeSlot]
    );

    // Transform data to match frontend expectations
    const availableHalls = rows.map(hall => ({
      id: hall.HallID,
      name: hall.HallName,
      location: hall.Location,
      capacity: hall.Capacity,
    }));

    res.json(availableHalls);
  } catch (error) {
    console.error('Error checking hall availability:', error);
    res.status(500).json({ error: 'Failed to check hall availability' });
  }
};

// Toggle hall active status
exports.toggleHallStatus = async (req, res) => {
  const hallId = parseInt(req.params.id, 10);
  const { activeStatus } = req.body;
  
  if (activeStatus === undefined) {
    return res.status(400).json({ error: 'Active status is required' });
  }

  const userRole = normalizeRole(req.user?.role);
  if (userRole === 'DEPARTMENT_ADMIN') {
    const userDeptId = await resolveUserDeptId(req.user);
    const [hRows] = await pool.query('SELECT HallID, DeptID, ownership_type FROM Halls WHERE HallID = ?', [hallId]);
    if (!hRows.length) return res.status(404).json({ error: 'Venue not found' });
    const hall = hRows[0];
    if (hall.ownership_type === 'COMMON' || !hall.DeptID) {
      return res.status(403).json({ error: 'Access denied: Only Master Admin can modify status of common college venues.' });
    }
    if (Number(hall.DeptID) !== Number(userDeptId)) {
      return res.status(403).json({ error: 'Access denied: You cannot modify venues belonging to another department.' });
    }
  } else if (userRole !== 'MASTER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  
  try {
    await pool.execute(
      'CALL ToggleHallStatus(?, ?)',
      [hallId, !!activeStatus]
    );
    
    res.json({ 
      message: `Hall ${activeStatus ? 'activated' : 'deactivated'} successfully`,
      hallId,
      activeStatus: !!activeStatus
    });
  } catch (error) {
    console.error('Error toggling hall status:', error);
    res.status(500).json({ error: 'Failed to update hall status' });
  }
};

// Delete a hall permanently after checking for bookings
exports.deleteHall = async (req, res) => {
  const hallId = parseInt(req.params.id, 10);

  if (!hallId) {
    return res.status(400).json({ success: false, message: 'Invalid venue ID.' });
  }

  const userRole = normalizeRole(req.user?.role);
  if (userRole === 'DEPARTMENT_ADMIN') {
    const userDeptId = await resolveUserDeptId(req.user);
    const [hRows] = await pool.query('SELECT HallID, DeptID, ownership_type FROM Halls WHERE HallID = ?', [hallId]);
    if (!hRows.length) return res.status(404).json({ success: false, message: 'Venue not found.' });
    const hall = hRows[0];
    if (hall.ownership_type === 'COMMON' || !hall.DeptID) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Master Admin can delete common college venues.' });
    }
    if (Number(hall.DeptID) !== Number(userDeptId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot delete venues belonging to another department.' });
    }
  } else if (userRole !== 'MASTER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
  }

  try {
    const [existingHall] = await pool.query(
      'SELECT HallID FROM Halls WHERE HallID = ?',
      [hallId]
    );

    if (existingHall.length === 0) {
      return res.status(404).json({ success: false, message: 'Venue not found.' });
    }

    const [bookingRows] = await pool.query(
      'SELECT COUNT(*) AS bookingCount FROM Bookings WHERE hall_id = ?',
      [hallId]
    );

    if (bookingRows[0].bookingCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this venue because booking records exist.'
      });
    }

    const [deleteResult] = await pool.query('DELETE FROM Halls WHERE HallID = ?', [hallId]);

    if (!deleteResult || deleteResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'Unable to delete venue at this time.'
      });
    }

    res.json({
      success: true,
      message: 'Venue deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting hall:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete venue due to a database error.'
    });
  }
};

exports.getAvailableHalls = async (req, res) => {
  const { timeSlot } = req.query;

  if (!timeSlot) {
    return res.status(400).json({ error: 'Time slot is required' });
  }

  try {
    // Fetch all halls excluding those that are already booked in the selected time slot
    const [rows] = await pool.query(
      `SELECT h.HallID, h.HallName, h.Location, h.Capacity, d.DeptName 
       FROM Halls h 
       JOIN Departments d ON h.DeptID = d.DeptID
       WHERE h.HallID NOT IN (
         SELECT HallID FROM Bookings 
         WHERE TimeSlot = ?
       )`,
      [timeSlot]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No available halls for this time slot' });
    }

    // Map the response to the frontend format
    const availableHalls = rows.map(hall => ({
      id: hall.HallID,
      name: hall.HallName,
      location: hall.Location,
      capacity: hall.Capacity,
      department: hall.DeptName
    }));

    res.json(availableHalls);
  } catch (error) {
    console.error('Error fetching available halls:', error);
    res.status(500).json({ error: 'Failed to fetch available halls' });
  }
};

// Smart Venue Recommendation
// Finds and scores available active venues based on date, period, venue type, and facilities.
exports.getRecommendedVenues = async (req, res) => {
  try {
    const { date, period, venueType, facilities } = req.query;

    // 1. Validate date
    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date in YYYY-MM-DD format.'
      });
    }

    const normalizedDate = date.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format.'
      });
    }

    const parsedDate = new Date(`${normalizedDate}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date provided.'
      });
    }

    // 2. Validate period
    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Please select a period (e.g., 1-8 or P1-P8).'
      });
    }

    const periodNumber = Number(String(period).replace(/\D/g, ''));
    const { PERIODS, formatTime } = require('../config/periods');
    const matchedPeriod = PERIODS.find((p) => p.period === periodNumber);

    if (!matchedPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Supported periods are 1 through 8 (P1 to P8).'
      });
    }

    // 3. Parse requested facilities
    let requestedFacilities = [];
    if (Array.isArray(facilities)) {
      requestedFacilities = facilities.map((f) => String(f).trim()).filter(Boolean);
    } else if (typeof facilities === 'string' && facilities.trim()) {
      requestedFacilities = facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    }

    const requestedVenueType = typeof venueType === 'string' ? venueType.trim() : '';

    // 4. Query active venues (optionally filtering by venue type)
    let venueSql = `
      SELECT
        h.HallID,
        h.HallName,
        h.Location,
        h.Capacity,
        h.VenueType,
        h.HasProjector,
        h.HasSmartBoard,
        h.HasWiFi,
        h.HasSpeaker,
        h.HasPodium,
        h.HasWhiteBoard,
        h.HasCCTV,
        h.HasAC,
        h.ImageURL,
        h.ActiveStatus,
        d.DeptName
      FROM Halls h
      LEFT JOIN Departments d ON h.DeptID = d.DeptID
      WHERE h.ActiveStatus = 1
    `;
    const venueParams = [];

    if (req.user) {
      const userRole = normalizeRole(req.user.role);
      if (userRole === 'FACULTY' || userRole === 'DEPARTMENT_ADMIN') {
        const deptId = await resolveUserDeptId(req.user);
        if (deptId) {
          venueSql += ` AND (
            (h.ownership_type = 'DEPARTMENT' AND h.DeptID = ?)
            OR
            (h.ownership_type = 'COMMON' AND NOT EXISTS (
              SELECT 1 FROM venue_access va
              WHERE va.venue_id = h.HallID
                AND va.department_id = ?
                AND (va.access_type = 'RESTRICTED' OR va.status = 0)
            ))
          )`;
          venueParams.push(deptId, deptId);
        }
      }
    }

    if (requestedVenueType && requestedVenueType.toLowerCase() !== 'all') {
      venueSql += ` AND LOWER(TRIM(h.VenueType)) = LOWER(TRIM(?))`;
      venueParams.push(requestedVenueType);
    }

    venueSql += ` ORDER BY h.HallName ASC`;

    const [activeVenues] = await pool.query(venueSql, venueParams);

    if (activeVenues.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No suitable venue is available for the selected date, period and requirements.'
      });
    }

    // 5. Exclude venues with blocking bookings for this date and period.
    // Blocking statuses: Pending, Approved.
    // Overlap: time_from < period.end AND time_to > period.start.
    const [blockingBookings] = await pool.query(
      `SELECT DISTINCT hall_id
       FROM bookings
       WHERE DATE(date) = ?
         AND status IN ('Pending', 'Approved')
         AND time_from < ?
         AND time_to > ?`,
      [normalizedDate, matchedPeriod.end, matchedPeriod.start]
    );

    const blockedHallIds = new Set(blockingBookings.map((b) => Number(b.hall_id)));
    const availableVenues = activeVenues.filter((v) => !blockedHallIds.has(Number(v.HallID)));

    if (availableVenues.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No suitable venue is available for the selected date, period and requirements.'
      });
    }

    // 6. Hydrate facilities for candidate venues from venue_facility_mapping and legacy columns
    const hallIds = availableVenues.map((v) => v.HallID);
    const [mappingRows] = await pool.query(
      `SELECT m.venue_id, f.name
       FROM venue_facility_mapping m
       JOIN venue_facilities f ON f.id = m.facility_id
       WHERE m.venue_id IN (?) AND f.IsActive = 1
       ORDER BY f.name`,
      [hallIds]
    );

    const facilitiesByHall = new Map();
    mappingRows.forEach((row) => {
      const list = facilitiesByHall.get(row.venue_id) || [];
      list.push(row.name);
      facilitiesByHall.set(row.venue_id, list);
    });

    const legacyFacilityFlags = [
      ['Air Conditioner', 'HasAC'],
      ['Projector', 'HasProjector'],
      ['Smart Board', 'HasSmartBoard'],
      ['WiFi', 'HasWiFi'],
      ['Speaker System', 'HasSpeaker'],
      ['Podium', 'HasPodium'],
      ['White Board', 'HasWhiteBoard'],
      ['CCTV', 'HasCCTV'],
    ];

    const normalizeFac = (name) => {
      const s = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (s === 'ac' || s === 'airconditioner') return 'ac';
      if (s === 'speaker' || s === 'speakersystem') return 'speaker';
      return s;
    };

    // 7. Facility matching and scoring
    const recommended = [];

    for (const venue of availableVenues) {
      const facilitySet = new Set(facilitiesByHall.get(venue.HallID) || []);
      for (const [name, col] of legacyFacilityFlags) {
        if (venue[col]) facilitySet.add(name);
      }
      const venueFacilities = Array.from(facilitySet);
      const normalizedVenueFacilities = venueFacilities.map(normalizeFac);

      // Facility matching: If faculty selected facilities, venue must have ALL of them
      if (requestedFacilities.length > 0) {
        const hasAllRequested = requestedFacilities.every((reqFac) =>
          normalizedVenueFacilities.includes(normalizeFac(reqFac))
        );
        if (!hasAllRequested) {
          continue; // Venue lacks one or more requested facilities
        }
      }

      // Recommendation scoring:
      // +10: Venue is active (already filtered ActiveStatus = 1)
      // +20: Venue is completely available for the requested period
      // +40: Exact venue type match if specified (+20 if all types allowed)
      // +20: Each requested facility matched
      // Capacity tiebreaker: up to +10 points based on capacity
      let score = 10 + 20;

      if (requestedVenueType && requestedVenueType.toLowerCase() !== 'all') {
        if (String(venue.VenueType).toLowerCase() === requestedVenueType.toLowerCase()) {
          score += 40;
        }
      } else {
        score += 20;
      }

      if (requestedFacilities.length > 0) {
        score += requestedFacilities.length * 20;
      }

      const capacity = Number(venue.Capacity) || 0;
      const capacityBonus = Math.min(10, Math.floor(capacity / 20));
      score += capacityBonus;

      recommended.push({
        venueId: venue.HallID,
        venueName: venue.HallName,
        venueType: venue.VenueType || 'Standard',
        department: venue.DeptName || '',
        location: venue.Location || '',
        capacity: capacity,
        facilities: venueFacilities,
        available: true,
        score,
        period: matchedPeriod.period,
        periodDisplay: `P${matchedPeriod.period} (${formatTime(matchedPeriod.start)} - ${formatTime(matchedPeriod.end)})`,
        timeFrom: matchedPeriod.start,
        timeTo: matchedPeriod.end,
        date: normalizedDate,
        image: venue.ImageURL || null,
      });
    }

    // Sort by highest score first, then capacity desc, then venue name asc
    recommended.sort((a, b) => b.score - a.score || b.capacity - a.capacity || a.venueName.localeCompare(b.venueName));

    return res.json({
      success: true,
      data: recommended,
      count: recommended.length,
      message: recommended.length === 0
        ? 'No suitable venue is available for the selected date, period and requirements.'
        : undefined,
    });
  } catch (error) {
    console.error('Error calculating venue recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to find recommended venues due to a server error.'
    });
  }
}; 
