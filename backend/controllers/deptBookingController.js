// controllers/deptBookingController.js
const db = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

// Create a new department booking
exports.createBooking = async (req, res) => {
  try {
    const { hallId, userId, bookingDate, startTime, endTime, purpose, attendees, department } = req.body;

    // Convert date and times to proper format
    const formattedDate = new Date(bookingDate);
    
    // Check if the hall is already booked for the selected time slot
    const checkQuery = `
      SELECT * FROM DeptBookings 
      WHERE HallID = ? 
      AND BookingDate = ? 
      AND ((StartTime <= ? AND EndTime > ?) OR (StartTime < ? AND EndTime >= ?) OR (StartTime >= ? AND EndTime <= ?))
      AND Status != 'Cancelled'
    `;
    
    const [existingBookings] = await db.query(checkQuery, [
      hallId, 
      formattedDate, 
      endTime, startTime, 
      endTime, startTime, 
      startTime, endTime
    ]);
    
    if (existingBookings.length > 0) {
      return res.status(409).json({ 
        error: 'This hall is already booked for the selected time slot' 
      });
    }
    
    // Create new booking
    const insertQuery = `
      INSERT INTO DeptBookings (
        HallID,  BookingDate, StartTime, EndTime, 
        Purpose, ExpectedAttendees, Status, CreatedAt, DeptID
      ) VALUES (?,  ?, ?, ?, ?, ?, 'Confirmed', NOW(), ?)
    `;
    
    const [result] = await db.query(insertQuery, [
      hallId, 
      formattedDate, 
      startTime, 
      endTime, 
      purpose, 
      attendees, 
      department.DeptID
    ]);
    
    // Get the newly created booking
    const [newBooking] = await db.query(
      `SELECT db.*, h.HallName, d.DeptName 
       FROM DeptBookings db 
       JOIN Halls h ON db.HallID = h.HallID 
       JOIN Departments d ON db.DeptID = d.DeptID 
       WHERE db.BookingID = ?`, 
      [result.insertId]
    );
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking[0]
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// Get all bookings for a department
exports.getDepartmentBookings = async (req, res) => {
  try {
    const { deptId } = req.params;
    const { page, limit, offset } = getPagination(req.query);
    
    const query = `
      SELECT db.*, h.HallName, u.FirstName, u.LastName 
      FROM DeptBookings db
      JOIN Halls h ON db.HallID = h.HallID
      JOIN Users u ON db.UserID = u.UserID
      WHERE db.DeptID = ?
      ORDER BY db.BookingDate DESC, db.StartTime ASC
    `;
    
    const [[countRow]] = await db.query('SELECT COUNT(*) AS total FROM DeptBookings WHERE DeptID = ?', [deptId]);
    const [bookings] = await db.query(`${query} LIMIT ? OFFSET ?`, [deptId, limit, offset]);
    
    const formattedBookings = bookings.map(booking => ({
      id: booking.BookingID,
      hallId: booking.HallID,
      hallName: booking.HallName,
      date: booking.BookingDate,
      startTime: booking.StartTime,
      endTime: booking.EndTime,
      purpose: booking.Purpose,
      attendees: booking.ExpectedAttendees,
      status: booking.Status,
      bookedBy: `${booking.FirstName} ${booking.LastName}`,
      createdAt: booking.CreatedAt
    }));

    res.json({ data: formattedBookings, pagination: makePagination({ page, limit, total: countRow.total }) });
  } catch (error) {
    console.error('Error fetching department bookings:', error);
    res.status(500).json({ error: 'Failed to fetch department bookings' });
  }
};

// Get a single booking
exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const query = `
      SELECT db.*, h.HallName, h.Location, h.Capacity, h.HasProjector, h.HasAC,
             d.DeptName, u.FirstName, u.LastName, u.Email
      FROM DeptBookings db
      JOIN Halls h ON db.HallID = h.HallID
      JOIN Departments d ON db.DeptID = d.DeptID
      JOIN Users u ON db.UserID = u.UserID
      WHERE db.BookingID = ?
    `;
    
    const [bookings] = await db.query(query, [bookingId]);
    
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    const formattedBooking = {
      id: booking.BookingID,
      hall: {
        id: booking.HallID,
        name: booking.HallName,
        location: booking.Location,
        capacity: booking.Capacity,
        projector: booking.HasProjector === 1,
        ac: booking.HasAC === 1
      },
      department: {
        id: booking.DeptID,
        name: booking.DeptName
      },
      user: {
        id: booking.UserID,
        name: `${booking.FirstName} ${booking.LastName}`,
        email: booking.Email
      },
      date: booking.BookingDate,
      startTime: booking.StartTime,
      endTime: booking.EndTime,
      purpose: booking.Purpose,
      attendees: booking.ExpectedAttendees,
      status: booking.Status,
      createdAt: booking.CreatedAt
    };

    res.json(formattedBooking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    
    // Check if status is valid
    const validStatuses = ['Pending', 'Confirmed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Pending, Confirmed, or Cancelled' });
    }
    
    const query = `
      UPDATE DeptBookings
      SET Status = ?, UpdatedAt = NOW()
      WHERE BookingID = ?
    `;
    
    const [result] = await db.query(query, [status, bookingId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ 
      message: 'Booking status updated successfully',
      status
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancelReason } = req.body;
    
    const query = `
      UPDATE DeptBookings
      SET Status = 'Cancelled', CancelReason = ?, UpdatedAt = NOW()
      WHERE BookingID = ?
    `;
    
    const [result] = await db.query(query, [cancelReason, bookingId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Get upcoming bookings for a hall
exports.getHallUpcomingBookings = async (req, res) => {
  try {
    const { hallId } = req.params;
    const today = new Date();
    
    const query = `
      SELECT db.BookingDate, db.StartTime, db.EndTime, db.Status
      FROM DeptBookings db
      WHERE db.HallID = ? 
      AND (db.BookingDate > ? OR (db.BookingDate = ? AND db.EndTime >= ?))
      AND db.Status != 'Cancelled'
      ORDER BY db.BookingDate ASC, db.StartTime ASC
      LIMIT 10
    `;
    
    const formattedToday = today.toISOString().split('T')[0];
    const currentTime = today.toTimeString().slice(0, 8);
    
    const [bookings] = await db.query(query, [hallId, formattedToday, formattedToday, currentTime]);
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching hall bookings:', error);
    res.status(500).json({ error: 'Failed to fetch hall bookings' });
  }
};
