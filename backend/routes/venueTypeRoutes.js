const express = require('express');
const controller = require('../controllers/venueTypeController');
const authenticateToken = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

router.get('/', controller.listVenueTypes);
router.get('/admin', authenticateToken, requireAdmin, controller.listVenueTypes);
router.post('/', authenticateToken, requireAdmin, controller.createVenueType);
router.put('/:id', authenticateToken, requireAdmin, controller.updateVenueType);
router.delete('/:id', authenticateToken, requireAdmin, controller.deleteVenueType);

module.exports = router;
