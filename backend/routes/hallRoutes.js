// routes/hallRoutes.js
const express = require('express');
const router = express.Router();
const hallController = require('../controllers/hallController');
const upload = require("../middlewares/uploadVenueImage");
// Get all halls
router.get('/', hallController.getAllHalls);

// Get active halls
router.get('/active', hallController.getActiveHalls);

// Get halls by department
router.get('/department/:deptId', hallController.getHallsByDepartment);

// Delete a venue permanently
router.delete('/:id', hallController.deleteHall);

// Get hall by ID
router.get('/:id', hallController.getHallById);

// Check hall availability
router.post('/availability', hallController.checkHallsAvailability);

router.get('/ava', hallController.getAvailableHalls);


// Add a new hall

router.post(
    "/",
    upload.single("venueImage"),
    hallController.createHall
);
// Update a hall
router.put(
  "/:id",
  upload.single("venueImage"),
  hallController.updateHall
);
// Toggle hall status
router.patch('/status/:id', hallController.toggleHallStatus);

module.exports = router;