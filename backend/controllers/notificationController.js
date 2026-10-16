const notificationService = require('../services/notificationService');

/**
 * Controller for notification endpoints.
 */

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.staffId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - invalid session' });
    }

    const result = await notificationService.getUserNotifications(userId, req.query);
    return res.status(200).json({
      success: true,
      data: result.data,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.staffId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - invalid session' });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notification count',
      error: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.staffId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - invalid session' });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ success: false, message: 'Valid notification ID is required' });
    }

    const result = await notificationService.markAsRead(Number(id), userId);

    if (result.status === 404) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (result.status === 403) {
      return res.status(403).json({ success: false, message: 'Forbidden - not your notification' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.staffId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - invalid session' });
    }

    const result = await notificationService.markAllAsRead(userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.staffId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - invalid session' });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ success: false, message: 'Valid notification ID is required' });
    }

    const result = await notificationService.deleteNotification(Number(id), userId);

    if (result.status === 404) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (result.status === 403) {
      return res.status(403).json({ success: false, message: 'Forbidden - not your notification' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
