const db = require('../config/db');

/**
 * Get available halls for a department at a specific date and time slot.
 */
const getAvailableHalls = (deptId, selectedDate, timeSlot) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT h.HallID as id, h.HallName as name, h.Location as location, 
             h.Capacity as capacity, h.Facilities as facilities
      FROM Halls h
      WHERE h.DeptID = ?
      AND h.HallID NOT IN (
        SELECT b.HallID
        FROM Bookings b
        WHERE b.BookingDate = ?
        AND b.TimeSlot = ?
        AND b.Status != 'cancelled'
      )
      ORDER BY h.Capacity DESC
    `;

    db.query(query, [deptId, selectedDate, timeSlot], (err, results) => {
      if (err) {
        return reject(err);
      }

      // Process facilities if they are stored as a comma-separated string
      const halls = results.map(hall => ({
        ...hall,
        facilities: hall.facilities ? hall.facilities.split(',').map(f => f.trim()) : []
      }));

      resolve(halls);
    });
  });
};

/**
 * Get all halls for a department.
 */
const getHallsByDepartment = (deptId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT HallID as id, HallName as name, Location as location, 
             Capacity as capacity, Facilities as facilities
      FROM Halls
      WHERE DeptID = ?
      ORDER BY Capacity DESC
    `;

    db.query(query, [deptId], (err, results) => {
      if (err) {
        return reject(err);
      }

      const halls = results.map(hall => ({
        ...hall,
        facilities: hall.facilities ? hall.facilities.split(',').map(f => f.trim()) : []
      }));

      resolve(halls);
    });
  });
};

/**
 * Check if a specific hall is available at a given time.
 */
const checkHallAvailability = (hallId, selectedDate, timeSlot) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) as bookingCount
      FROM Bookings
      WHERE HallID = ?
      AND BookingDate = ?
      AND TimeSlot = ?
      AND Status != 'cancelled'
    `;

    db.query(query, [hallId, selectedDate, timeSlot], (err, results) => {
      if (err) {
        return reject(err);
      }

      const isAvailable = results[0].bookingCount === 0;
      resolve(isAvailable);
    });
  });
};

module.exports = {
  getAvailableHalls,
  getHallsByDepartment,
  checkHallAvailability
};
