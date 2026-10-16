const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');
const emailUtil = require('../utils/emailService');
const whatsappService = require('./whatsappService');

/**
 * Service to manage database-backed in-app notifications, email notifications,
 * and WhatsApp notification abstractions.
 */

// =========================================================================
// 1. IN-APP NOTIFICATIONS
// =========================================================================

/**
 * Create a single in-app notification for a specific user.
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'booking_update',
  relatedBookingId = null,
}) => {
  if (!userId || !title || !message) {
    throw new Error('userId, title, and message are required to create a notification.');
  }

  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, notification_type, channel, status, related_booking_id, booking_id, is_read, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'in_app', 'SENT', ?, ?, 0, NOW(), NOW())`,
    [userId, title, message, type, type, relatedBookingId || null, relatedBookingId || null]
  );

  return {
    id: result.insertId,
    userId,
    title,
    message,
    type,
    relatedBookingId,
    isRead: false,
  };
};

/**
 * Create notifications for all active admin users (legacy helper).
 */
const createNotificationForAdmins = async ({
  title,
  message,
  type = 'booking_request',
  relatedBookingId = null,
}) => {
  try {
    const [admins] = await pool.query(
      `SELECT staff_id, full_name, email FROM staff WHERE role IN ('MASTER_ADMIN', 'admin') AND status = 'active'`
    );

    if (!admins.length) {
      console.warn('No active master admin users found to notify.');
      return [];
    }

    const created = [];
    for (const admin of admins) {
      const notif = await createNotification({
        userId: admin.staff_id,
        title,
        message,
        type,
        relatedBookingId,
      });
      created.push(notif);
    }
    return created;
  } catch (error) {
    console.error('Error creating notifications for admins:', error);
    return [];
  }
};

/**
 * Get paginated notifications for a logged-in user with unread count and filters.
 */
const getUserNotifications = async (userId, queryParams = {}) => {
  const { page, limit, offset } = getPagination(queryParams);
  const filter = String(queryParams.status || queryParams.isRead || '').trim().toLowerCase();

  let whereClause = 'WHERE user_id = ?';
  const params = [userId];

  if (filter === 'unread' || filter === '0' || filter === 'false') {
    whereClause += ' AND is_read = 0';
  } else if (filter === 'read' || filter === '1' || filter === 'true') {
    whereClause += ' AND is_read = 1';
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
    params
  );

  const [notifications] = await pool.query(
    `SELECT id, user_id, title, message, type, related_booking_id, booking_id, channel, status, is_read, created_at, updated_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[unreadRow]] = await pool.query(
    `SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );

  return {
    status: 200,
    data: notifications,
    unreadCount: unreadRow ? Number(unreadRow.unreadCount) : 0,
    pagination: makePagination({ page, limit, total: countRow.total }),
  };
};

const getUnreadCount = async (userId) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return row ? Number(row.unreadCount) : 0;
};

const markAsRead = async (notificationId, userId) => {
  const [result] = await pool.query(
    `UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    const [existing] = await pool.query(`SELECT id, user_id FROM notifications WHERE id = ?`, [notificationId]);
    if (!existing.length) {
      return { status: 404, message: 'Notification not found' };
    }
    return { status: 403, message: 'You are not authorized to update this notification' };
  }

  return { status: 200, message: 'Notification marked as read', id: notificationId };
};

const markAllAsRead = async (userId) => {
  const [result] = await pool.query(
    `UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return { status: 200, message: 'All notifications marked as read', updatedCount: result.affectedRows };
};

const deleteNotification = async (notificationId, userId) => {
  const [result] = await pool.query(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    const [existing] = await pool.query(`SELECT id, user_id FROM notifications WHERE id = ?`, [notificationId]);
    if (!existing.length) {
      return { status: 404, message: 'Notification not found' };
    }
    return { status: 403, message: 'You are not authorized to delete this notification' };
  }

  return { status: 200, message: 'Notification deleted successfully', id: notificationId };
};

// =========================================================================
// 2. USER NOTIFICATION PREFERENCES
// =========================================================================

const getUserPreferences = async (userId) => {
  if (!userId) {
    return {
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
      receive_booking_notifications: 1,
      receive_approval_notifications: 1,
      receive_rejection_notifications: 1,
      receive_cancellation_notifications: 1,
    };
  }

  const [rows] = await pool.query(
    `SELECT * FROM notification_preferences WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    await pool.query(
      `INSERT IGNORE INTO notification_preferences (user_id, email_enabled, whatsapp_enabled, in_app_enabled) VALUES (?, 1, 1, 1)`,
      [userId]
    );
    return {
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
      receive_booking_notifications: 1,
      receive_approval_notifications: 1,
      receive_rejection_notifications: 1,
      receive_cancellation_notifications: 1,
    };
  }

  return rows[0];
};

const updatePreferences = async (userId, payload = {}) => {
  const current = await getUserPreferences(userId);
  const emailEnabled = payload.emailEnabled !== undefined ? (payload.emailEnabled ? 1 : 0) : current.email_enabled;
  const whatsappEnabled = payload.whatsappEnabled !== undefined ? (payload.whatsappEnabled ? 1 : 0) : current.whatsapp_enabled;
  const inAppEnabled = payload.inAppEnabled !== undefined ? (payload.inAppEnabled ? 1 : 0) : (current.in_app_enabled ?? 1);

  await pool.query(
    `INSERT INTO notification_preferences (user_id, email_enabled, whatsapp_enabled, in_app_enabled)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email_enabled = VALUES(email_enabled),
       whatsapp_enabled = VALUES(whatsapp_enabled),
       in_app_enabled = VALUES(in_app_enabled)`,
    [userId, emailEnabled, whatsappEnabled, inAppEnabled]
  );

  return getUserPreferences(userId);
};

// =========================================================================
// 3. MASTER ADMIN NOTIFICATION OVERRIDE SETTINGS
// =========================================================================

const getMasterNotificationSettings = async (masterAdminId) => {
  if (!masterAdminId) {
    return {
      department_booking_notifications: 0,
      common_venue_notifications: 1,
      auditorium_notifications: 1,
      conference_notifications: 1,
      event_notifications: 1,
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
    };
  }

  const [rows] = await pool.query(
    'SELECT * FROM master_notification_settings WHERE master_admin_id = ? LIMIT 1',
    [masterAdminId]
  );

  if (!rows.length) {
    await pool.query(
      `INSERT IGNORE INTO master_notification_settings
       (master_admin_id, department_booking_notifications, common_venue_notifications, auditorium_notifications, conference_notifications, event_notifications, email_enabled, whatsapp_enabled, in_app_enabled)
       VALUES (?, 0, 1, 1, 1, 1, 1, 1, 1)`,
      [masterAdminId]
    );
    return {
      master_admin_id: masterAdminId,
      department_booking_notifications: 0,
      common_venue_notifications: 1,
      auditorium_notifications: 1,
      conference_notifications: 1,
      event_notifications: 1,
      email_enabled: 1,
      whatsapp_enabled: 1,
      in_app_enabled: 1,
    };
  }

  return rows[0];
};

const updateMasterNotificationSettings = async (masterAdminId, payload = {}) => {
  const current = await getMasterNotificationSettings(masterAdminId);
  const updated = {
    department_booking_notifications: payload.department_booking_notifications !== undefined ? (payload.department_booking_notifications ? 1 : 0) : current.department_booking_notifications,
    common_venue_notifications: payload.common_venue_notifications !== undefined ? (payload.common_venue_notifications ? 1 : 0) : current.common_venue_notifications,
    auditorium_notifications: payload.auditorium_notifications !== undefined ? (payload.auditorium_notifications ? 1 : 0) : current.auditorium_notifications,
    conference_notifications: payload.conference_notifications !== undefined ? (payload.conference_notifications ? 1 : 0) : current.conference_notifications,
    event_notifications: payload.event_notifications !== undefined ? (payload.event_notifications ? 1 : 0) : current.event_notifications,
    email_enabled: payload.email_enabled !== undefined ? (payload.email_enabled ? 1 : 0) : current.email_enabled,
    whatsapp_enabled: payload.whatsapp_enabled !== undefined ? (payload.whatsapp_enabled ? 1 : 0) : current.whatsapp_enabled,
    in_app_enabled: payload.in_app_enabled !== undefined ? (payload.in_app_enabled ? 1 : 0) : current.in_app_enabled,
  };

  await pool.query(
    `INSERT INTO master_notification_settings
     (master_admin_id, department_booking_notifications, common_venue_notifications, auditorium_notifications, conference_notifications, event_notifications, email_enabled, whatsapp_enabled, in_app_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       department_booking_notifications = VALUES(department_booking_notifications),
       common_venue_notifications = VALUES(common_venue_notifications),
       auditorium_notifications = VALUES(auditorium_notifications),
       conference_notifications = VALUES(conference_notifications),
       event_notifications = VALUES(event_notifications),
       email_enabled = VALUES(email_enabled),
       whatsapp_enabled = VALUES(whatsapp_enabled),
       in_app_enabled = VALUES(in_app_enabled)`,
    [
      masterAdminId,
      updated.department_booking_notifications,
      updated.common_venue_notifications,
      updated.auditorium_notifications,
      updated.conference_notifications,
      updated.event_notifications,
      updated.email_enabled,
      updated.whatsapp_enabled,
      updated.in_app_enabled,
    ]
  );

  return getMasterNotificationSettings(masterAdminId);
};

// =========================================================================
// 4. CORE DISPATCHERS: EMAIL & WHATSAPP
// =========================================================================

const sendEmail = async ({ to, subject, html, text, userId = null, bookingId = null, notificationType = 'email_alert' }) => {
  let deliveryStatus = 'PENDING';
  let errorMessage = null;
  const isConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

  try {
    if (!to) {
      console.warn('[NotificationService:sendEmail] No recipient provided.');
      return false;
    }

    if (!isConfigured) {
      deliveryStatus = 'NOT_CONFIGURED';
      errorMessage = 'SMTP Email credentials (EMAIL_USER / EMAIL_PASSWORD) not configured in environment.';
      console.log(`[NotificationService:DevMode] Simulated Email to ${to}: ${subject}`);
    } else {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Venue Portal" <${process.env.EMAIL_USER || 'no-reply@college.edu'}>`,
        to,
        subject,
        html: html || text,
        text: text || '',
      });
      deliveryStatus = 'SENT';
      console.log(`[NotificationService:sendEmail] Email delivered to ${to} (MessageId: ${info.messageId})`);
    }
  } catch (error) {
    deliveryStatus = 'FAILED';
    errorMessage = error.message;
    console.error(`[NotificationService:sendEmail] Error sending email to ${to}:`, error.message);
  }

  // Record email delivery entry in notifications table if userId is present
  try {
    if (userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, related_booking_id, booking_id, title, message, type, notification_type, channel, status, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'email', ?, ?, NOW())`,
        [
          userId,
          bookingId || null,
          bookingId || null,
          subject,
          text || subject,
          notificationType,
          notificationType,
          deliveryStatus,
          errorMessage,
        ]
      );
    }
  } catch (dbErr) {
    console.error('[NotificationService] Failed to record Email log in notifications table:', dbErr.message);
  }

  return deliveryStatus === 'SENT';
};

const sendWhatsApp = async ({ toPhone, message }) => {
  const result = await whatsappService.sendWhatsAppMessage({ to: toPhone, message });
  return result.success;
};

// =========================================================================
// 5. CENTRALIZED NOTIFICATION ROUTING LOGIC
// =========================================================================

/**
 * Event: Faculty creates booking request
 * Routes strictly according to Venue Category & Ownership:
 * - Department Venue -> Department Admin receives notification.
 *   Master Admin only receives notification if Master Admin turned ON department_booking_notifications.
 * - Common Venue -> Master Admin receives notification (based on category settings).
 * - Faculty receives confirmation.
 */
const notifyBookingCreated = async (booking) => {
  try {
    const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;

    // Resolve venue details
    const [hallRows] = await pool.query(
      `SELECT h.HallID, h.HallName, h.DeptID, h.VenueType, h.ownership_type, h.category, h.approval_role, d.DeptName
       FROM halls h
       LEFT JOIN departments d ON h.DeptID = d.DeptID
       WHERE h.HallID = ? LIMIT 1`,
      [Number(booking.hall_id || booking.hallId)]
    );
    const hall = hallRows[0] || {};

    const isDepartmentVenue = hall.ownership_type === 'DEPARTMENT' || (!hall.ownership_type && hall.DeptID);
    const isCommonVenue = hall.ownership_type === 'COMMON' || !hall.DeptID;

    // CASE 1: DEPARTMENT VENUE
    if (isDepartmentVenue && hall.DeptID) {
      // 1. Notify Department Admin(s) of this department
      const [deptAdmins] = await pool.query(
        `SELECT staff_id, full_name, email, phone, role, department
         FROM staff
         WHERE status = 'active' AND role = 'DEPARTMENT_ADMIN' AND department_id = ?`,
        [hall.DeptID]
      );

      for (const admin of deptAdmins) {
        // In-app notification
        await createNotification({
          userId: admin.staff_id,
          title: 'New Department Booking Request',
          message: `New booking request #${booking.id} for ${booking.hall_name || booking.hallName} by ${booking.staff_name || booking.staffName}.`,
          type: 'booking_request',
          relatedBookingId: booking.id,
        });

        const prefs = await getUserPreferences(admin.staff_id);

        if (prefs.email_enabled && admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `[Dept Request] Booking #${booking.id} - ${booking.hall_name || booking.hallName}`,
            html: `
              <h2>Department Booking Request</h2>
              <p>Dear ${admin.full_name},</p>
              <p>A new booking request has been submitted for a venue in your department:</p>
              <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 15px 0;">
                <tr><td style="padding: 6px; font-weight: bold;">Booking ID:</td><td style="padding: 6px;">#${booking.id}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Faculty Name:</td><td style="padding: 6px;">${booking.staff_name || booking.staffName}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Venue:</td><td style="padding: 6px;">${booking.hall_name || booking.hallName}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Date:</td><td style="padding: 6px;">${formattedDate}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Time Slot:</td><td style="padding: 6px;">${timeSlot}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Purpose:</td><td style="padding: 6px;">${booking.reason}</td></tr>
              </table>
              <p>Please log in to your Department Admin portal to approve or reject this request.</p>
            `,
          });
        }

        if (prefs.whatsapp_enabled && admin.phone) {
          await whatsappService.sendBookingRequestNotification(booking, admin);
        }
      }

      // 2. Check Master Admin Notification Override
      const [masterAdmins] = await pool.query(
        `SELECT staff_id, full_name, email, phone, role FROM staff WHERE status = 'active' AND role = 'MASTER_ADMIN'`
      );

      for (const ma of masterAdmins) {
        const maSettings = await getMasterNotificationSettings(ma.staff_id);
        // Only notify Master Admin if department_booking_notifications is ON
        if (maSettings.department_booking_notifications) {
          if (maSettings.in_app_enabled) {
            await createNotification({
              userId: ma.staff_id,
              title: '[Dept Booking] Request Alert',
              message: `Dept booking #${booking.id} submitted for ${booking.hall_name || booking.hallName} (${hall.DeptName || 'Dept'}) by ${booking.staff_name || booking.staffName}.`,
              type: 'booking_request',
              relatedBookingId: booking.id,
            });
          }
          if (maSettings.email_enabled && ma.email) {
            await sendEmail({
              to: ma.email,
              subject: `[College Overview] Dept Booking #${booking.id} - ${booking.hall_name || booking.hallName}`,
              html: `<p>A department booking request #${booking.id} was submitted for ${booking.hall_name || booking.hallName} (${hall.DeptName || 'Dept'}).</p>`,
            });
          }
          if (maSettings.whatsapp_enabled && ma.phone) {
            await whatsappService.sendBookingRequestNotification(booking, ma);
          }
        }
      }
    }

    // CASE 2: COMMON VENUE
    if (isCommonVenue) {
      const [masterAdmins] = await pool.query(
        `SELECT staff_id, full_name, email, phone, role FROM staff WHERE status = 'active' AND role = 'MASTER_ADMIN'`
      );

      const venueNameLower = String(booking.hall_name || booking.hallName || '').toLowerCase();
      const venueTypeLower = String(hall.VenueType || hall.category || '').toLowerCase();
      const isAuditorium = venueNameLower.includes('auditorium') || venueNameLower.includes('audi') || venueTypeLower.includes('auditorium');
      const isConference = venueNameLower.includes('conference') || venueTypeLower.includes('conference');

      for (const ma of masterAdmins) {
        const maSettings = await getMasterNotificationSettings(ma.staff_id);

        let categoryEnabled = Boolean(maSettings.common_venue_notifications);
        if (isAuditorium && !maSettings.auditorium_notifications) categoryEnabled = false;
        if (isConference && !maSettings.conference_notifications) categoryEnabled = false;

        if (categoryEnabled) {
          if (maSettings.in_app_enabled) {
            await createNotification({
              userId: ma.staff_id,
              title: 'Common Venue Booking Request',
              message: `New booking request #${booking.id} for common venue ${booking.hall_name || booking.hallName} by ${booking.staff_name || booking.staffName}.`,
              type: 'booking_request',
              relatedBookingId: booking.id,
            });
          }

          if (maSettings.email_enabled && ma.email) {
            await sendEmail({
              to: ma.email,
              subject: `[Common Venue Request] Booking #${booking.id} - ${booking.hall_name || booking.hallName}`,
              html: `
                <h2>Common Venue Booking Request</h2>
                <p>Dear ${ma.full_name},</p>
                <p>A new booking request has been submitted for a college common venue:</p>
                <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 15px 0;">
                  <tr><td style="padding: 6px; font-weight: bold;">Booking ID:</td><td style="padding: 6px;">#${booking.id}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Faculty Name:</td><td style="padding: 6px;">${booking.staff_name || booking.staffName}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Venue:</td><td style="padding: 6px;">${booking.hall_name || booking.hallName}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Date:</td><td style="padding: 6px;">${formattedDate}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Time Slot:</td><td style="padding: 6px;">${timeSlot}</td></tr>
                  <tr><td style="padding: 6px; font-weight: bold;">Purpose:</td><td style="padding: 6px;">${booking.reason}</td></tr>
                </table>
                <p>Please log in to the Master Admin portal to approve or reject this request.</p>
              `,
            });
          }

          if (maSettings.whatsapp_enabled && ma.phone) {
            await whatsappService.sendBookingRequestNotification(booking, ma);
          }
        }
      }
    }

    // Confirmation for Faculty
    const facultyUserId = booking.staff_id || booking.staffId;
    if (facultyUserId) {
      await createNotification({
        userId: facultyUserId,
        title: 'Booking Request Submitted',
        message: `Your booking request #${booking.id} for ${booking.hall_name || booking.hallName} on ${formattedDate} (${timeSlot}) is pending review.`,
        type: 'booking_request',
        relatedBookingId: booking.id,
      });

      const facultyPrefs = await getUserPreferences(facultyUserId);
      const facultyEmail = booking.staff_email || booking.staffEmail;
      const facultyPhone = booking.staff_phone || booking.staffPhone || booking.phone;

      if (facultyPrefs.email_enabled && facultyEmail) {
        await sendEmail({
          to: facultyEmail,
          subject: `Booking Request Confirmation - #${booking.id} (${booking.hall_name || booking.hallName})`,
          html: `
            <h2>Booking Request Confirmation</h2>
            <p>Dear ${booking.staff_name || booking.staffName},</p>
            <p>Your booking request for <strong>${booking.hall_name || booking.hallName}</strong> on <strong>${formattedDate}</strong> (${timeSlot}) has been received and is currently <strong>Pending Approval</strong>.</p>
            <p>You will receive another update once the booking is reviewed.</p>
          `,
        });
      }

      if (facultyPrefs.whatsapp_enabled && facultyPhone) {
        await whatsappService.sendWhatsAppMessage({
          to: facultyPhone,
          message: `🏛 *NEC Venue Portal: Request Submitted*\nDear ${booking.staff_name || booking.staffName}, your booking request #${booking.id} for ${booking.hall_name || booking.hallName} on ${formattedDate} (${timeSlot}) has been submitted and is pending review.`,
          bookingId: booking.id,
          userId: facultyUserId,
          notificationType: 'booking_request_confirmation',
        });
      }
    }
  } catch (err) {
    console.error('[notifyBookingCreated] Error:', err);
  }
};

/**
 * Event: Admin approves booking
 * Notifies Faculty (Email + WhatsApp)
 */
const notifyBookingApproved = async (booking, approver = {}) => {
  try {
    const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;
    const facultyUserId = booking.staff_id || booking.staffId;

    if (facultyUserId) {
      await createNotification({
        userId: facultyUserId,
        title: 'Booking Approved',
        message: `Your booking #${booking.id} for ${booking.hall_name || booking.hallName} on ${formattedDate} (${timeSlot}) has been approved.`,
        type: 'booking_approved',
        relatedBookingId: booking.id,
      });

      const prefs = await getUserPreferences(facultyUserId);
      const facultyEmail = booking.staff_email || booking.staffEmail;
      const facultyPhone = booking.staff_phone || booking.staffPhone || booking.phone;

      if (prefs.email_enabled && facultyEmail) {
        await sendEmail({
          to: facultyEmail,
          subject: `Booking Approved - #${booking.id} (${booking.hall_name || booking.hallName})`,
          html: `
            <h2 style="color: #16a34a;">Booking Approved</h2>
            <p>Dear ${booking.staff_name || booking.staffName},</p>
            <p>We are pleased to inform you that your booking for <strong>${booking.hall_name || booking.hallName}</strong> has been <strong>Approved</strong>.</p>
            <p><strong>Date:</strong> ${formattedDate}<br><strong>Time:</strong> ${timeSlot}<br><strong>Purpose:</strong> ${booking.reason}</p>
          `,
        });
      }

      if (prefs.whatsapp_enabled && facultyPhone) {
        await whatsappService.sendBookingApprovedNotification(booking, {
          phone: facultyPhone,
          approverName: approver.name || approver.full_name || 'Administration',
        });
      }
    }
  } catch (err) {
    console.error('[notifyBookingApproved] Error:', err);
  }
};

/**
 * Event: Admin rejects booking
 * Notifies Faculty with rejection reason (Email + WhatsApp)
 */
const notifyBookingRejected = async (booking, rejectionReason = '') => {
  try {
    const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;
    const facultyUserId = booking.staff_id || booking.staffId;

    if (facultyUserId) {
      await createNotification({
        userId: facultyUserId,
        title: 'Booking Rejected',
        message: `Your booking #${booking.id} for ${booking.hall_name || booking.hallName} was rejected. Reason: ${rejectionReason || 'Venue unavailable or scheduling conflict.'}`,
        type: 'booking_rejected',
        relatedBookingId: booking.id,
      });

      const prefs = await getUserPreferences(facultyUserId);
      const facultyEmail = booking.staff_email || booking.staffEmail;
      const facultyPhone = booking.staff_phone || booking.staffPhone || booking.phone;

      if (prefs.email_enabled && facultyEmail) {
        await sendEmail({
          to: facultyEmail,
          subject: `Booking Rejected - #${booking.id} (${booking.hall_name || booking.hallName})`,
          html: `
            <h2 style="color: #dc2626;">Booking Rejected</h2>
            <p>Dear ${booking.staff_name || booking.staffName},</p>
            <p>We regret to inform you that your booking request #${booking.id} for <strong>${booking.hall_name || booking.hallName}</strong> on <strong>${formattedDate}</strong> (${timeSlot}) has been rejected.</p>
            <p><strong>Reason:</strong> ${rejectionReason || 'Venue unavailable or scheduling conflict.'}</p>
          `,
        });
      }

      if (prefs.whatsapp_enabled && facultyPhone) {
        await whatsappService.sendBookingRejectedNotification({
          ...booking,
          rejectionReason,
        }, { phone: facultyPhone });
      }
    }
  } catch (err) {
    console.error('[notifyBookingRejected] Error:', err);
  }
};

/**
 * Event: Booking Cancelled
 * Notifies relevant users (Email + WhatsApp)
 */
const notifyBookingCancelled = async (booking, cancelledByName = 'User', cancelReason = '') => {
  try {
    const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;
    const facultyUserId = booking.staff_id || booking.staffId;

    if (facultyUserId) {
      await createNotification({
        userId: facultyUserId,
        title: 'Booking Cancelled',
        message: `Booking #${booking.id} for ${booking.hall_name || booking.hallName} on ${formattedDate} has been cancelled by ${cancelledByName}.`,
        type: 'booking_cancelled',
        relatedBookingId: booking.id,
      });

      const prefs = await getUserPreferences(facultyUserId);
      const facultyEmail = booking.staff_email || booking.staffEmail;
      const facultyPhone = booking.staff_phone || booking.staffPhone || booking.phone;

      if (prefs.email_enabled && facultyEmail) {
        await sendEmail({
          to: facultyEmail,
          subject: `Booking Cancelled - #${booking.id} (${booking.hall_name || booking.hallName})`,
          html: `
            <h2>Booking Cancelled</h2>
            <p>Dear ${booking.staff_name || booking.staffName},</p>
            <p>This is to confirm that booking #${booking.id} for <strong>${booking.hall_name || booking.hallName}</strong> on <strong>${formattedDate}</strong> (${timeSlot}) has been cancelled.</p>
            ${cancelReason ? `<p><strong>Reason:</strong> ${cancelReason}</p>` : ''}
          `,
        });
      }

      if (prefs.whatsapp_enabled && facultyPhone) {
        await whatsappService.sendBookingCancelledNotification(
          { ...booking, cancellationReason: cancelReason },
          { phone: facultyPhone, cancelledByName }
        );
      }
    }
  } catch (err) {
    console.error('[notifyBookingCancelled] Error:', err);
  }
};

// =========================================================================
// 6. SCHEDULED REMINDERS
// =========================================================================

const checkUpcomingBookingReminders = async () => {
  try {
    const query = `
      SELECT b.id, b.hall_name, b.date, b.time_from, b.time_to, b.staff_email, s.staff_id, s.full_name
      FROM bookings b
      JOIN staff s ON (b.staff_id = s.staff_id OR (b.staff_id = 0 AND b.staff_email = s.email))
      WHERE b.status = 'Approved'
        AND DATE(b.date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_booking_id = b.id AND n.type = 'booking_reminder'
        )
      LIMIT 50
    `;

    const [upcoming] = await pool.query(query);

    for (const item of upcoming) {
      const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeFrom = String(item.time_from).slice(0, 5);
      const timeTo = String(item.time_to).slice(0, 5);

      await createNotification({
        userId: item.staff_id,
        title: 'Upcoming Booking Reminder',
        message: `Reminder: You have an upcoming venue reservation for ${item.hall_name} on ${formattedDate} (${timeFrom} - ${timeTo}).`,
        type: 'booking_reminder',
        relatedBookingId: item.id,
      });
    }

    if (upcoming.length > 0) {
      console.log(`Generated ${upcoming.length} upcoming booking reminder notifications.`);
    }
  } catch (error) {
    console.error('Error running upcoming booking reminder check:', error);
  }
};

const startReminderScheduler = () => {
  setTimeout(() => {
    checkUpcomingBookingReminders();
  }, 10000);

  setInterval(() => {
    checkUpcomingBookingReminders();
  }, 15 * 60 * 1000);
};

module.exports = {
  createNotification,
  createNotificationForAdmins,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  updatePreferences,
  getMasterNotificationSettings,
  updateMasterNotificationSettings,
  sendEmail,
  sendWhatsApp,
  notifyBookingCreated,
  notifyBookingApproved,
  notifyBookingRejected,
  notifyBookingCancelled,
  checkUpcomingBookingReminders,
  startReminderScheduler,
};
