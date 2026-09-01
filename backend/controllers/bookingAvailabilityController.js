const db = require('../config/db');

// Get all available halls for a specific date and time slot
exports.getAvailableHalls = async (req, res) => {
  try {
    const { date, startTime, endTime, deptId } = req.query;

    // Convert date to proper format for comparison
    const bookingDate = new Date(date);
    const formattedDate = bookingDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Query to get available halls (excluding those already booked by ANY user for the requested time slot)
    const query = `
      SELECT h.* 
      FROM Halls h
      WHERE h.DeptID = ? 
      AND h.ActiveStatus = TRUE
      AND NOT EXISTS (
        SELECT 1 
        FROM DeptBookings db
        WHERE db.HallID = h.HallID
        AND db.BookingDate = ?
        AND db.Status != 'Cancelled'
        AND (
          (db.StartTime <= ? AND db.EndTime > ?) 
          OR (db.StartTime < ? AND db.EndTime >= ?) 
          OR (? <= db.StartTime AND ? >= db.EndTime)
        )
        /* No UserID filter - checks ALL bookings system-wide */
      )
    `;

    const [halls] = await db.query(query, [
      deptId, 
      formattedDate, 
      endTime, startTime,   // Check if booking end time overlaps with requested start time
      endTime, startTime,   // Check if booking start time overlaps with requested end time
      startTime, endTime    // Check if requested time completely contains a booking
    ]);

    // Transform the data to match the frontend expectations
    const formattedHalls = halls.map(hall => ({
      id: hall.HallID,
      name: hall.HallName,
      location: hall.Location,
      capacity: hall.Capacity,
      projector: hall.HasProjector === 1,
      ac: hall.HasAC === 1,
      image: hall.ImageURL || "/api/placeholder/400/200"
    }));

    res.json(formattedHalls);
  } catch (error) {
    console.error('Error fetching available halls:', error);
    res.status(500).json({ error: 'Failed to fetch available halls' });
  }
};

// Get all halls for a specific department
exports.getAllHalls = async (req, res) => {
  try {
    const { deptId } = req.params;
    
    const query = `
      SELECT * 
      FROM Halls 
      WHERE DeptID = ? 
      AND ActiveStatus = TRUE
    `;
    
    const [halls] = await db.query(query, [deptId]);
    
    const formattedHalls = halls.map(hall => ({
      id: hall.HallID,
      name: hall.HallName,
      location: hall.Location,
      capacity: hall.Capacity,
      projector: hall.HasProjector === 1,
      ac: hall.HasAC === 1,
      image: hall.ImageURL || "/api/placeholder/400/200"
    }));

    res.json(formattedHalls);
  } catch (error) {
    console.error('Error fetching halls:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
};