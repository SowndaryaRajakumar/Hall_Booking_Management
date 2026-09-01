// controllers/hallController.js
const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

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

const normalizeHallRow = (hall = {}) => ({
  hallId: hall.HallID ?? hall.hallId ?? hall.id,
  hallName: hall.HallName ?? hall.hallName ?? hall.name ?? "",
  department: hall.DeptName ?? hall.department ?? "",
  deptId: hall.DeptID ?? hall.deptId ?? "",
  location: hall.Location ?? hall.location ?? "",
  capacity: hall.Capacity ?? hall.capacity ?? "",
  numberOfSystems: hall.NumberOfSystems ?? hall.numberOfSystems ?? 0,
  venueType: hall.VenueType ?? hall.venueType ?? "",
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
  facilities: hall.facilities || [],
  facilityIds: hall.facilityIds || [],
});

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
    const [rows] = await pool.query('SELECT * FROM ActiveHallsView');
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
    const payload = normalizeHallPayload(req.body);
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
        ActiveStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payload.activeStatus ? 1 : 0
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
    const { id } = req.params;
    const payload = normalizeHallPayload(req.body);

    const [existingRows] = await pool.query('SELECT ImageURL, ActiveStatus FROM Halls WHERE HallID = ?', [id]);
    const existingImage = existingRows[0]?.ImageURL || null;
    const existingStatus = existingRows[0]?.ActiveStatus ?? 1;
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
  const hallId = req.params.id;
  const { activeStatus } = req.body;
  
  if (activeStatus === undefined) {
    return res.status(400).json({ error: 'Active status is required' });
  }
  
  try {
    await pool.execute(
      'CALL ToggleHallStatus(?, ?)',
      [parseInt(hallId), !!activeStatus]
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
