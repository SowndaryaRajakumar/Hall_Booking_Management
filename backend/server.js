const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const hallRoutes = require('./routes/hallRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const venueTypeRoutes = require('./routes/venueTypeRoutes');
const venueFacilityRoutes = require('./routes/venueFacilityRoutes');
const { ensureMasterData } = require('./migrations/ensureMasterData');
const bookingRoutes = require('./routes/bookingRoutes');
const bookingAvailabilityRoutes = require('./routes/bookingAvailabilityRoutes');
const deptBookingRoutes = require('./routes/deptBookingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const reportsRoutes = require('./routes/reportsRoutes');
const path = require("path");
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/venue-types', venueTypeRoutes);
app.use('/api/admin/venue-facilities', venueFacilityRoutes);
app.use('/api/venue-facilities', venueFacilityRoutes);
app.use('/api/halls', hallRoutes); 
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin-bookings', bookingRoutes);
app.use('/api/halls1', bookingAvailabilityRoutes); // Fixed the route path
app.use('/api/dept-bookings', deptBookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

ensureMasterData().catch((error) => console.error('Master-data migration failed:', error));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
