const nodemailer = require('nodemailer');

// Create a transporter using email/password authentication
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Email template for user booking confirmation
const generateUserBookingEmail = (booking) => {
  return `
    <h2>Booking Confirmation</h2>
    <p>Dear ${booking.staffName},</p>
    
    <p>Your hall booking request has been received with the following details:</p>
    
    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
      <p><strong>Hall:</strong> ${booking.hallName}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.timeFrom} - ${booking.timeTo}</p>
      <p><strong>Purpose:</strong> ${booking.reason}</p>
    </div>
    
    <p>Your booking is currently pending approval. You will receive another email once your booking has been reviewed.</p>
    
    <p>Contact Information:</p>
    <ul>
      <li>Name: ${booking.staffName}</li>
      <li>Email: ${booking.staffEmail}</li>
      <li>Phone: ${booking.staffPhone}</li>
    </ul>
    
    <p>If you need to make any changes to your booking, please contact the administration office.</p>
    
    <p>Best regards,<br>Hall Booking System</p>
  `;
};

// Email template for admin notification
const generateAdminNotificationEmail = (booking) => {
  return `
    <h2>New Hall Booking Request</h2>
    <p>Dear Admin,</p>
    
    <p>A new hall booking request has been submitted and requires your review:</p>
    
    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
      <p><strong>Hall:</strong> ${booking.hallName}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.timeFrom} - ${booking.timeTo}</p>
      <p><strong>Purpose:</strong> ${booking.reason}</p>
    </div>
    
    <p><strong>Requested by:</strong></p>
    <ul>
      <li>Name: ${booking.staffName}</li>
      <li>Email: ${booking.staffEmail}</li>
      <li>Phone: ${booking.staffPhone}</li>
    </ul>
    
    <p>Please log in to the admin panel to approve or reject this request.</p>
    
    <p>Best regards,<br>Hall Booking System</p>
  `;
};

// Email template for booking status update
const generateStatusUpdateEmail = (booking) => {
  let statusMessage = '';
  
  switch(booking.status) {
    case 'approved':
      statusMessage = 'We are pleased to inform you that your booking has been approved.';
      break;
    case 'rejected':
      statusMessage = 'We regret to inform you that your booking has been rejected.';
      break;
    case 'cancelled':
      statusMessage = 'This is to confirm that your booking has been cancelled as requested.';
      break;
    default:
      statusMessage = 'The status of your booking has been updated.';
  }
  
  return `
    <h2>Booking Status Update</h2>
    <p>Dear ${booking.staff_name},</p>
    
    <p>${statusMessage}</p>
    
    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
      <p><strong>Hall:</strong> ${booking.hall_name}</p>
      <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${booking.time_from} - ${booking.time_to}</p>
      <p><strong>Purpose:</strong> ${booking.reason}</p>
      <p><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${booking.status}</span></p>
    </div>
    
    <p>If you have any questions, please contact the administration office.</p>
    
    <p>Best regards,<br>Hall Booking System</p>
  `;
};

// Function to send booking confirmation email to user
const sendBookingConfirmation = async (booking) => {
  try {
    // Verify transporter connection
    await transporter.verify();
    
    const mailOptions = {
      from: `NEC-Hall_Booking_Confirmation<${process.env.EMAIL_USER}>`,
      to: booking.staffEmail,
      subject: `Hall Booking Confirmation - ${booking.hallName}`,
      html: generateUserBookingEmail(booking)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('User confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending user confirmation email:', error);
    return false;
  }
};

// Function to send notification to admin
const sendAdminNotification = async (booking) => {
  try {
    if (!process.env.ADMIN_EMAIL) {
      throw new Error('Admin email not configured in environment variables');
    }

    // Verify transporter connection
    await transporter.verify();
    
    const mailOptions = {
      from: `NEC-Hall_Booking_Request<$process.env.EMAIL_USER>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Hall Booking Request - ${booking.hallName}`,
      html: generateAdminNotificationEmail(booking)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    throw error;
  }
};

// Function to send status update email
const sendStatusUpdate = async (booking) => {
  try {
    console.log('Sending status update email with data:', booking);
    
    if (!booking.staff_email) {
      console.error('No recipient email found for status update');
      return { sent: false, error: 'No recipient email address' };
    }
    
    await transporter.verify();
    
    const mailOptions = {
      from: `NEC-Hall_Booking_Approved<$process.env.EMAIL_USER>`,
      to: booking.staff_email,
      subject: `Booking Status Update: ${booking.status.toUpperCase()}`,
      html: generateStatusUpdateEmail(booking)
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Status update email sent:', info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending status update email:', error);
    return { sent: false, error: error.message };
  }
};

const sendPasswordChangeOtp = async ({ email, name, otp }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email service is not configured');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `NEC Venue Portal <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'NEC Venue Portal - Password Change Verification',
    text: `Hello ${name},\n\nA request was made to change your NEC Venue Portal password.\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes. If you did not request this password change, you can safely ignore this email.\n\nRegards,\nNEC Venue Portal`,
  });
};

const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log(`[EmailService:Simulated] To: ${to} | Subject: ${subject}`);
      return { sent: true, simulated: true };
    }
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `NEC Venue Portal <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.warn('sendEmail error:', error.message);
    return { sent: false, error: error.message };
  }
};

module.exports = {
  sendBookingConfirmation,
  sendAdminNotification,
  sendStatusUpdate,
  sendPasswordChangeOtp,
  sendEmail,
};
