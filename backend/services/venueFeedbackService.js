const pool = require('../config/db');
const { createNotification } = require('./notificationService');
const whatsappService = require('./whatsappService');
const emailUtil = require('../utils/emailService');

/**
 * Service for Common & Department Venue Feedback, Complaint, and Escalation Management
 */

const VALID_TYPES = ['COMPLAINT', 'FEEDBACK', 'MAINTENANCE', 'FACILITY_ISSUE', 'CLEANLINESS', 'EQUIPMENT_ISSUE', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

/**
 * Submits a complaint / feedback against a venue with automatic routing:
 * - Department venues route to DEPARTMENT_ADMIN
 * - Common venues route to MASTER_ADMIN
 */
const createVenueFeedback = async ({
  venueId,
  type = 'COMPLAINT',
  priority = 'MEDIUM',
  subject,
  description,
  relatedBookingId = null,
  feedbackDate = null,
  submittedBy,
}) => {
  if (!venueId || !subject || !description || !submittedBy) {
    throw new Error('Venue, subject, description, and submitter are required.');
  }

  const normType = VALID_TYPES.includes(String(type).toUpperCase()) ? String(type).toUpperCase() : 'COMPLAINT';
  const normPriority = VALID_PRIORITIES.includes(String(priority).toUpperCase()) ? String(priority).toUpperCase() : 'MEDIUM';

  // Verify venue exists and get ownership
  const [venues] = await pool.query(
    `SELECT h.HallID, h.HallName, h.ownership_type, h.DeptID, d.DeptName
     FROM halls h
     LEFT JOIN departments d ON h.DeptID = d.DeptID
     WHERE h.HallID = ? LIMIT 1`,
    [venueId]
  );
  if (!venues.length) {
    throw new Error('Venue not found.');
  }
  const venue = venues[0];
  const isDeptVenue = venue.ownership_type === 'DEPARTMENT' && Boolean(venue.DeptID);
  const deptId = isDeptVenue ? venue.DeptID : null;

  const [res] = await pool.query(
    `INSERT INTO venue_feedback
     (venue_id, type, priority, status, subject, description, submitted_by, department_id, related_booking_id, feedback_date, created_at, updated_at)
     VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      venueId,
      normType,
      normPriority,
      subject,
      description,
      submittedBy,
      deptId,
      relatedBookingId || null,
      feedbackDate || null,
    ]
  );

  const feedbackId = res.insertId;

  // Get submitter details
  const [submitters] = await pool.query('SELECT staff_id, full_name, email, phone, role FROM staff WHERE staff_id = ?', [submittedBy]);
  const submitter = submitters[0] || {};

  const alertTitle = `New Venue ${normType === 'COMPLAINT' ? 'Complaint' : 'Feedback'}: ${venue.HallName}`;
  const alertMsg = `[${normPriority}] ${subject} for ${venue.HallName} (${venue.ownership_type}) submitted by ${submitter.full_name || 'Staff'}.`;

  // Routing pipeline:
  // If department venue -> notify Department Admin of that department
  // If common venue -> notify Master Admin
  try {
    let targetAdmins = [];
    if (isDeptVenue) {
      const [deptAdmins] = await pool.query(
        "SELECT staff_id, full_name, email, phone FROM staff WHERE role = 'DEPARTMENT_ADMIN' AND department_id = ? AND status = 'active'",
        [venue.DeptID]
      );
      targetAdmins = deptAdmins;
    } else {
      const [masterAdmins] = await pool.query(
        "SELECT staff_id, full_name, email, phone FROM staff WHERE role = 'MASTER_ADMIN' AND status = 'active'"
      );
      targetAdmins = masterAdmins;
    }

    for (const adm of targetAdmins) {
      await createNotification({
        userId: adm.staff_id,
        title: alertTitle,
        message: alertMsg,
        type: 'venue_feedback_submitted',
        relatedBookingId: relatedBookingId || null,
      });

      if (adm.email) {
        await emailUtil.sendEmail(
          adm.email,
          `[Venue ${normType}] ${subject} - ${venue.HallName}`,
          `
            <h3>New ${isDeptVenue ? 'Department' : 'Common'} Venue ${normType}</h3>
            <p><strong>Venue:</strong> ${venue.HallName} (${venue.ownership_type})</p>
            <p><strong>Priority:</strong> ${normPriority}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Submitted By:</strong> ${submitter.full_name || 'Staff'} (${submitter.email || 'N/A'})</p>
            <p>Please log in to the admin portal to review.</p>
          `
        );
      }

      if (adm.phone) {
        await whatsappService.sendWhatsAppMessage({
          to: adm.phone,
          userId: adm.staff_id,
          message: `🚨 *NEC Venue Alert: New ${normType}*\n\n• *Venue:* ${venue.HallName}\n• *Type:* ${venue.ownership_type}\n• *Priority:* ${normPriority}\n• *Subject:* ${subject}\n• *Submitted By:* ${submitter.full_name || 'Staff'}\n• *Status:* OPEN\n\nPlease log in to review.`,
        });
      }
    }
  } catch (notifErr) {
    console.warn('Warning: Venue feedback notification dispatch error:', notifErr.message);
  }

  return {
    success: true,
    id: feedbackId,
    feedbackId,
    status: 'OPEN',
    ownershipType: venue.ownership_type,
    routedTo: isDeptVenue ? 'DEPARTMENT_ADMIN' : 'MASTER_ADMIN',
    message: isDeptVenue
      ? 'Feedback submitted and routed to Department Administration.'
      : 'Feedback submitted and routed directly to Master Administration.',
  };
};

/**
 * Department Admin escalates an issue to Master Admin
 */
const escalateFeedback = async ({
  feedbackId,
  escalationReason,
  internalRemarks = null,
  user,
}) => {
  if (!escalationReason || !escalationReason.trim()) {
    throw new Error('An escalation reason is required to forward an issue to Master Admin.');
  }

  const [existingRows] = await pool.query(
    `SELECT vf.*, h.HallName AS venue_name, h.ownership_type, h.DeptID,
            d.DeptName AS department_name, s.full_name AS submitter_name, s.email AS submitter_email
     FROM venue_feedback vf
     JOIN halls h ON vf.venue_id = h.HallID
     LEFT JOIN departments d ON (vf.department_id = d.DeptID OR h.DeptID = d.DeptID)
     JOIN staff s ON vf.submitted_by = s.staff_id
     WHERE vf.id = ? LIMIT 1`,
    [feedbackId]
  );

  if (!existingRows.length) {
    throw new Error('Venue feedback record not found.');
  }

  const feedback = existingRows[0];
  const userStaffId = user.staffId || user.id;

  // Department Admin check: verify department scope
  if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
    if (feedback.department_id && Number(feedback.department_id) !== Number(user.departmentId)) {
      throw new Error('You can only escalate issues originating in your department.');
    }
  }

  await pool.query(
    `UPDATE venue_feedback
     SET status = 'ESCALATED',
         escalated_by = ?,
         escalated_at = NOW(),
         escalation_reason = ?,
         internal_remarks = COALESCE(?, internal_remarks),
         updated_at = NOW()
     WHERE id = ?`,
    [userStaffId, escalationReason, internalRemarks, feedbackId]
  );

  // Notify Master Admins (In-App, Email, WhatsApp)
  try {
    const [escalator] = await pool.query('SELECT full_name FROM staff WHERE staff_id = ?', [userStaffId]);
    const escalatorName = escalator[0]?.full_name || 'Department Admin';

    const [masterAdmins] = await pool.query(
      "SELECT staff_id, full_name, email, phone FROM staff WHERE role = 'MASTER_ADMIN' AND status = 'active'"
    );

    const alertTitle = `Escalated Venue Issue: ${feedback.venue_name}`;
    const alertMsg = `[ESCALATED] ${feedback.subject} for ${feedback.venue_name} forwarded by ${escalatorName}. Reason: "${escalationReason}"`;

    for (const ma of masterAdmins) {
      await createNotification({
        userId: ma.staff_id,
        title: alertTitle,
        message: alertMsg,
        type: 'venue_feedback_escalated',
      });

      if (ma.phone) {
        await whatsappService.sendWhatsAppMessage({
          to: ma.phone,
          userId: ma.staff_id,
          message: `⚠️ *NEC Escalated Issue Alert*\n\n• *Venue:* ${feedback.venue_name}\n• *Dept:* ${feedback.department_name || 'General'}\n• *Subject:* ${feedback.subject}\n• *Escalated By:* ${escalatorName}\n• *Reason:* ${escalationReason}\n\nPlease review in Master Admin portal.`,
        });
      }

      if (ma.email) {
        await emailUtil.sendEmail(
          ma.email,
          `[ESCALATED ISSUE] ${feedback.subject} - ${feedback.venue_name}`,
          `
            <h3>Venue Issue Escalated to Central Administration</h3>
            <p><strong>Venue:</strong> ${feedback.venue_name} (${feedback.department_name || 'General'})</p>
            <p><strong>Original Submitter:</strong> ${feedback.submitter_name}</p>
            <p><strong>Subject:</strong> ${feedback.subject}</p>
            <p><strong>Escalated By:</strong> ${escalatorName}</p>
            <p><strong>Escalation Reason:</strong> ${escalationReason}</p>
            ${internalRemarks ? `<p><strong>Admin Remarks:</strong> ${internalRemarks}</p>` : ''}
          `
        );
      }
    }
  } catch (notifErr) {
    console.warn('Warning: Escalation notification error:', notifErr.message);
  }

  return {
    success: true,
    message: 'Issue escalated to Master Admin successfully.',
    feedbackId,
    status: 'ESCALATED',
  };
};

/**
 * Updates status, resolution, and internal remarks
 */
const updateFeedbackStatus = async ({
  feedbackId,
  status,
  resolution = null,
  internalRemarks = null,
  resolvedBy,
}) => {
  const normStatus = String(status).toUpperCase();
  if (!VALID_STATUSES.includes(normStatus)) {
    throw new Error(`Invalid status: ${status}. Must be one of [${VALID_STATUSES.join(', ')}]`);
  }

  const [existingRows] = await pool.query(
    `SELECT vf.*, h.HallName AS venue_name, s.full_name AS submitter_name, s.email AS submitter_email, s.phone AS submitter_phone
     FROM venue_feedback vf
     JOIN halls h ON vf.venue_id = h.HallID
     JOIN staff s ON vf.submitted_by = s.staff_id
     WHERE vf.id = ? LIMIT 1`,
    [feedbackId]
  );

  if (!existingRows.length) {
    throw new Error('Venue feedback record not found.');
  }

  const feedback = existingRows[0];
  const isResolvedOrClosed = normStatus === 'RESOLVED' || normStatus === 'CLOSED';

  await pool.query(
    `UPDATE venue_feedback
     SET status = ?,
         resolution = COALESCE(?, resolution),
         internal_remarks = COALESCE(?, internal_remarks),
         resolved_by = ?,
         resolved_at = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      normStatus,
      resolution || null,
      internalRemarks || null,
      isResolvedOrClosed ? resolvedBy : feedback.resolved_by,
      isResolvedOrClosed ? new Date() : feedback.resolved_at,
      feedbackId,
    ]
  );

  // Notify submitter about status update
  try {
    const title = `Venue Issue Update: ${normStatus}`;
    const msg = `Your ${feedback.type.toLowerCase()} for ${feedback.venue_name} ("${feedback.subject}") is now ${normStatus}.${resolution ? ' Resolution: ' + resolution : ''}`;

    await createNotification({
      userId: feedback.submitted_by,
      title,
      message: msg,
      type: 'venue_feedback_status_updated',
    });

    if (feedback.submitter_email) {
      await emailUtil.sendEmail(
        feedback.submitter_email,
        `[Update] Venue Issue: ${feedback.subject} - ${normStatus}`,
        `
          <h3>Venue Feedback Status Update</h3>
          <p>Dear ${feedback.submitter_name},</p>
          <p>Your issue for <strong>${feedback.venue_name}</strong> has been updated to <strong>${normStatus}</strong>.</p>
          ${resolution ? `<p><strong>Resolution:</strong> ${resolution}</p>` : ''}
          <p>Thank you for helping us maintain campus venues.</p>
        `
      );
    }

    if (feedback.submitter_phone) {
      await whatsappService.sendWhatsAppMessage({
        to: feedback.submitter_phone,
        userId: feedback.submitted_by,
        message: `📢 *NEC Venue Portal: Issue Update*\n\nDear ${feedback.submitter_name},\nYour reported issue for *${feedback.venue_name}* (*${feedback.subject}*) status is now: *${normStatus}*.${resolution ? '\nResolution: ' + resolution : ''}\n\nThank you.`,
      });
    }
  } catch (notifErr) {
    console.warn('Warning: Feedback status update notification error:', notifErr.message);
  }

  return {
    success: true,
    id: feedbackId,
    feedbackId,
    status: normStatus,
    message: `Issue updated to ${normStatus}.`,
  };
};

/**
 * Manually sends an update / resolution notification to the submitter via selected channels
 */
const notifySubmitter = async ({
  feedbackId,
  channels = ['in_app'], // ['in_app', 'email', 'whatsapp']
  customMessage = '',
  user,
}) => {
  const [existingRows] = await pool.query(
    `SELECT vf.*, h.HallName AS venue_name, s.full_name AS submitter_name, s.email AS submitter_email, s.phone AS submitter_phone
     FROM venue_feedback vf
     JOIN halls h ON vf.venue_id = h.HallID
     JOIN staff s ON vf.submitted_by = s.staff_id
     WHERE vf.id = ? LIMIT 1`,
    [feedbackId]
  );

  if (!existingRows.length) {
    throw new Error('Venue feedback record not found.');
  }

  const feedback = existingRows[0];
  const messageText = customMessage.trim() || `Your venue issue for ${feedback.venue_name} (${feedback.subject}) has been addressed. Status: ${feedback.status}.${feedback.resolution ? ' Resolution: ' + feedback.resolution : ''}`;

  const results = { inApp: false, email: false, whatsapp: false };

  if (channels.includes('in_app')) {
    await createNotification({
      userId: feedback.submitted_by,
      title: `Venue Issue Update: ${feedback.status}`,
      message: messageText,
      type: 'venue_feedback_update',
    });
    results.inApp = true;
  }

  if (channels.includes('email') && feedback.submitter_email) {
    await emailUtil.sendEmail(
      feedback.submitter_email,
      `[Resolution Update] Venue Issue: ${feedback.subject}`,
      `
        <h3>Venue Issue Update</h3>
        <p>Dear ${feedback.submitter_name},</p>
        <p>${messageText}</p>
        ${feedback.resolution ? `<p><strong>Resolution:</strong> ${feedback.resolution}</p>` : ''}
        <p>Regards,<br/>Venue Management Office</p>
      `
    );
    results.email = true;
  }

  if (channels.includes('whatsapp') && feedback.submitter_phone) {
    await whatsappService.sendWhatsAppMessage({
      to: feedback.submitter_phone,
      userId: feedback.submitted_by,
      message: `🔔 *NEC Venue Update*\n\nDear ${feedback.submitter_name},\n${messageText}\n\nStatus: *${feedback.status}*`,
    });
    results.whatsapp = true;
  }

  return {
    success: true,
    message: 'Notifications sent to submitter successfully.',
    results,
  };
};

/**
 * Gets venue feedback history for a specific venue
 */
const getVenueFeedbackHistory = async (venueId) => {
  const [stats] = await pool.query(
    `SELECT
       COUNT(*) AS totalIssues,
       SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS openCount,
       SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgressCount,
       SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalatedCount,
       SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolvedCount,
       SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS closedCount,
       SUM(CASE WHEN priority = 'CRITICAL' THEN 1 ELSE 0 END) AS criticalCount,
       SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) AS highCount
     FROM venue_feedback
     WHERE venue_id = ?`,
    [Number(venueId)]
  );

  const [venueRows] = await pool.query(
    `SELECT h.HallID, h.HallName, h.Location, h.Capacity, h.VenueType, h.ownership_type, d.DeptName
     FROM halls h
     LEFT JOIN departments d ON h.DeptID = d.DeptID
     WHERE h.HallID = ? LIMIT 1`,
    [Number(venueId)]
  );

  const [items] = await pool.query(
    `SELECT vf.*, s.full_name AS submitter_name, s.email AS submitter_email,
            r.full_name AS resolver_name, esc.full_name AS escalator_name
     FROM venue_feedback vf
     JOIN staff s ON vf.submitted_by = s.staff_id
     LEFT JOIN staff r ON vf.resolved_by = r.staff_id
     LEFT JOIN staff esc ON vf.escalated_by = esc.staff_id
     WHERE vf.venue_id = ?
     ORDER BY vf.created_at DESC`,
    [Number(venueId)]
  );

  return {
    venue: venueRows[0] || null,
    summary: {
      total: stats[0].totalIssues || 0,
      open: stats[0].openCount || 0,
      inProgress: stats[0].inProgressCount || 0,
      escalated: stats[0].escalatedCount || 0,
      resolved: stats[0].resolvedCount || 0,
      closed: stats[0].closedCount || 0,
      critical: stats[0].criticalCount || 0,
      high: stats[0].highCount || 0,
    },
    items,
  };
};

module.exports = {
  createVenueFeedback,
  escalateFeedback,
  updateFeedbackStatus,
  notifySubmitter,
  getVenueFeedbackHistory,
  VALID_TYPES,
  VALID_PRIORITIES,
  VALID_STATUSES,
};
