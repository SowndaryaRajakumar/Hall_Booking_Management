const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

// All notification endpoints require authenticated user
router.use(authenticateToken);

// Specific paths before parameter routes
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);

// Collection & single resource routes
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
