const pool = require('../config/db');
require('dotenv').config();

/**
 * Official WhatsApp Business Cloud API Service
 * Handles message templates, formatting, delivery, error recovery,
 * and delivery tracking without failing parent booking operations.
 */

const getWhatsAppConfig = () => {
  const provider = process.env.WHATSAPP_PROVIDER || 'cloud_api';
  const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';

  const isConfigured = Boolean(token && phoneId);

  return {
    provider,
    apiUrl: apiUrl.replace(/\/$/, ''),
    token,
    phoneId,
    businessAccountId,
    apiVersion,
    isConfigured,
  };
};

/**
 * Core sendWhatsAppMessage abstraction.
 * Sends via official Meta Graph API when credentials exist.
 * Otherwise falls back to mock/dev mode with full database tracking.
 */
const sendWhatsAppMessage = async ({
  to,
  message,
  templateData = null,
  bookingId = null,
  userId = null,
  notificationType = 'whatsapp_alert',
}) => {
  if (!to) {
    console.warn('[WhatsAppService] No recipient phone number provided. Skipping WhatsApp dispatch.');
    return { success: false, error: 'No recipient phone number provided' };
  }

  // Sanitize phone number (remove whitespace, dashes, parentheticals)
  let cleanPhone = String(to).replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.slice(1);
  }
  // Default to India country code 91 if a 10-digit number is passed
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const config = getWhatsAppConfig();
  let deliveryStatus = 'PENDING';
  let errorMessage = null;
  let responseData = null;

  try {
    if (config.isConfigured) {
      const endpoint = `${config.apiUrl}/${config.phoneId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      responseData = await response.json();

      if (!response.ok) {
        deliveryStatus = 'FAILED';
        errorMessage = responseData?.error?.message || `WhatsApp API error: HTTP ${response.status}`;
        console.error('[WhatsAppService] Meta Cloud API Error:', responseData?.error || responseData);
      } else {
        deliveryStatus = 'SENT';
        console.log(`[WhatsAppService] Successfully delivered WhatsApp message to +${cleanPhone} (MessageId: ${responseData?.messages?.[0]?.id})`);
      }
    } else {
      // Truthful delivery status: WhatsApp API not configured with credentials
      deliveryStatus = 'NOT_CONFIGURED';
      errorMessage = 'Meta WhatsApp Cloud API credentials not configured; dispatch simulated in development mode.';
      console.log(`[WhatsAppService:DevMode] Simulated WhatsApp message recorded for +${cleanPhone}:\n${message}\n---`);
    }
  } catch (netErr) {
    deliveryStatus = 'FAILED';
    errorMessage = netErr.message || 'Network error reaching WhatsApp API';
    console.error('[WhatsAppService] Network error during dispatch:', netErr.message);
  }

  // Record delivery entry in notifications table for audit and in-app traceability
  try {
    if (userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, related_booking_id, booking_id, title, message, type, notification_type, channel, status, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'whatsapp', ?, ?, NOW())`,
        [
          userId,
          bookingId || null,
          bookingId || null,
          'WhatsApp Alert',
          message,
          notificationType,
          notificationType,
          deliveryStatus,
          errorMessage,
        ]
      );
    }
  } catch (dbErr) {
    console.error('[WhatsAppService] Failed to record WhatsApp log in notifications table:', dbErr.message);
  }

  return {
    success: deliveryStatus === 'SENT',
    simulated: !config.isConfigured,
    status: deliveryStatus,
    error: errorMessage,
    data: responseData,
  };
};

/**
 * 1. Booking Request Event:
 * Recipient: Department Admin OR Master Admin depending on venue ownership
 */
const sendBookingRequestNotification = async (booking, recipient = {}) => {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;

  const message = [
    '🏛 *NEC Venue Management Portal: New Booking Request*',
    '',
    `• *Booking ID:* #${booking.id}`,
    `• *Faculty:* ${booking.staff_name || booking.staffName}`,
    `• *Department:* ${booking.department || recipient.department || 'General'}`,
    `• *Venue:* ${booking.hall_name || booking.hallName}`,
    `• *Date:* ${formattedDate}`,
    `• *Time:* ${timeSlot}`,
    `• *Purpose:* ${booking.reason || 'Academic / Institutional'}`,
    `• *Status:* PENDING APPROVAL`,
    '',
    'Please log in to review and approve/reject this request.',
  ].join('\n');

  return sendWhatsAppMessage({
    to: recipient.phone || recipient.staff_phone,
    message,
    bookingId: booking.id,
    userId: recipient.staff_id || recipient.id,
    notificationType: 'booking_request',
  });
};

/**
 * 2. Booking Approved Event:
 * Recipient: Faculty
 */
const sendBookingApprovedNotification = async (booking, recipient = {}) => {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;

  const message = [
    '✅ *NEC Venue Portal: Booking Approved!*',
    '',
    `Dear ${booking.staff_name || booking.staffName},`,
    'Your venue reservation request has been approved.',
    '',
    `• *Booking ID:* #${booking.id}`,
    `• *Venue:* ${booking.hall_name || booking.hallName}`,
    `• *Date:* ${formattedDate}`,
    `• *Time:* ${timeSlot}`,
    `• *Purpose:* ${booking.reason || 'Academic'}`,
    `• *Approved By:* ${recipient.approverName || 'College Administration'}`,
    '',
    'You may present this confirmation at the venue.',
  ].join('\n');

  return sendWhatsAppMessage({
    to: recipient.phone || booking.staff_phone,
    message,
    bookingId: booking.id,
    userId: recipient.staff_id || booking.staff_id || recipient.id,
    notificationType: 'booking_approved',
  });
};

/**
 * 3. Booking Rejected Event:
 * Recipient: Faculty with clear rejection reason
 */
const sendBookingRejectedNotification = async (booking, recipient = {}) => {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;
  const reason = booking.rejectionReason || booking.remarks || recipient.rejectionReason || 'Venue unavailable or scheduling conflict';

  const message = [
    '❌ *NEC Venue Portal: Booking Rejected*',
    '',
    `Dear ${booking.staff_name || booking.staffName},`,
    'Your venue booking request could not be approved.',
    '',
    `• *Booking ID:* #${booking.id}`,
    `• *Venue:* ${booking.hall_name || booking.hallName}`,
    `• *Date:* ${formattedDate}`,
    `• *Time:* ${timeSlot}`,
    `• *Rejection Reason:* ${reason}`,
    '',
    'Please choose another time slot or contact administration.',
  ].join('\n');

  return sendWhatsAppMessage({
    to: recipient.phone || booking.staff_phone,
    message,
    bookingId: booking.id,
    userId: recipient.staff_id || booking.staff_id || recipient.id,
    notificationType: 'booking_rejected',
  });
};

/**
 * 4. Booking Cancelled Event:
 * Recipient: Relevant Admin or Faculty
 */
const sendBookingCancelledNotification = async (booking, recipient = {}) => {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeSlot = `${String(booking.time_from || booking.timeFrom).slice(0, 5)} - ${String(booking.time_to || booking.timeTo).slice(0, 5)}`;
  const reason = booking.cancellationReason || recipient.cancellationReason || 'Cancelled by requester';

  const message = [
    '⚠️ *NEC Venue Portal: Booking Cancelled*',
    '',
    `• *Booking ID:* #${booking.id}`,
    `• *Venue:* ${booking.hall_name || booking.hallName}`,
    `• *Date:* ${formattedDate}`,
    `• *Time:* ${timeSlot}`,
    `• *Cancelled By:* ${recipient.cancelledByName || 'Requester'}`,
    `• *Reason:* ${reason}`,
    '',
    'The allocated time slot is now released back to available inventory.',
  ].join('\n');

  return sendWhatsAppMessage({
    to: recipient.phone || recipient.staff_phone,
    message,
    bookingId: booking.id,
    userId: recipient.staff_id || recipient.id,
    notificationType: 'booking_cancelled',
  });
};

module.exports = {
  getWhatsAppConfig,
  sendWhatsAppMessage,
  sendBookingRequestNotification,
  sendBookingApprovedNotification,
  sendBookingRejectedNotification,
  sendBookingCancelledNotification,
};
