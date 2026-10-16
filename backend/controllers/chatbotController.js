const db = require('../config/db');
require('dotenv').config();
const { handleIntelligentBookingChat } = require('../services/chatbotAssistantService');

// Attempt to import GoogleGenAI dynamically or safely
let GoogleGenAI = null;
try {
  const genaiPkg = require('@google/genai');
  GoogleGenAI = genaiPkg.GoogleGenAI || genaiPkg.default;
} catch (e) {
  // @google/genai might not be installed or available
}

// --------------------------------------------------
// System Knowledge Base (FAQs & Process Flows)
// --------------------------------------------------

const FACULTY_FAQS = {
  bookVenue: "To book a venue:\n1. Click 'Book Venue' in the sidebar menu.\n2. Select your desired department and venue/hall.\n3. Choose an available date and time slot.\n4. Enter the purpose of your event and expected attendees.\n5. Click 'Submit Booking Request'. Your request will be sent to the admin for approval.",
  checkAvailability: "To check venue availability:\n1. Navigate to 'Book Venue' from the sidebar.\n2. Select a venue and date to see live slot availability.\n3. Green slots indicate available times, while red/blue slots indicate booked times.",
  viewBookings: "To view your bookings:\n1. Click 'My Bookings' in the sidebar menu.\n2. You can filter requests by status: All, Pending, Approved, or Rejected.",
  cancelBooking: "To cancel a booking:\n1. Go to 'My Bookings'.\n2. Locate the booking you wish to cancel.\n3. Click the 'Cancel Booking' button and confirm.",
  statusPending: "Pending means your venue booking request has been submitted successfully and is currently awaiting review by the Admin.",
  statusApproved: "Approved means the Admin has accepted your booking request. The venue is reserved for your specified time slot.",
  statusRejected: "Rejected means the Admin could not approve your request (e.g. due to maintenance or priority scheduling). A rejection reason is usually attached.",
  changePassword: "To change your password:\n1. Go to 'Profile' in the sidebar menu.\n2. Click on 'Change Password'.\n3. Request a 6-digit OTP verification code sent to your email, enter it, and set your new password.",
  seeProfile: "Click on 'Profile' in the sidebar to view your account details, staff ID, department, and email.",
  availableVenues: "Available venues include Seminar Halls, Auditoriums, Computer Labs, and Smart Classrooms listed in the 'Book Venue' section."
};

const ADMIN_FAQS = {
  approveBooking: "To approve a booking:\n1. Go to 'Bookings' or 'Dashboard' in the Admin panel.\n2. Find the pending request and click 'Approve'. The faculty member will receive an instant notification.",
  rejectBooking: "To reject a booking:\n1. Go to 'Bookings' or 'Dashboard'.\n2. Click 'Reject' on the pending request.\n3. Enter an optional rejection reason to inform the faculty member.",
  cancelApproved: "To cancel an already approved booking:\n1. Open 'Bookings'.\n2. Locate the approved booking and click 'Cancel'.",
  manageVenues: "To manage venues:\n1. Go to 'Venue Management' in the sidebar.\n2. You can add new venues, edit capacity/type/location, or set maintenance status.",
  manageDepartments: "Departments can be managed under 'Venue Management' or system configuration settings.",
  manageFaculty: "To manage faculty members:\n1. Click 'Faculty Management' in the sidebar.\n2. You can add new faculty, edit user roles/departments, or deactivate accounts.",
  viewReports: "To view reports and analytics:\n1. Go to 'Reports' in the sidebar.\n2. View overall utilization, popular venues, busiest departments, and export reports in PDF or CSV format."
};

/**
 * Handle incoming chat messages
 */
const processMessage = async (req, res) => {
  try {
    const { message, language } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const user = req.user || {};
    const role = user.role === 'admin' ? 'admin' : 'staff';
    const userEmail = user.email || '';
    const staffId = user.staffId || null;
    const userName = user.name || (role === 'admin' ? 'Administrator' : 'Faculty');

    const cleanQuery = message.toLowerCase().trim();

    // --------------------------------------------------
    // Intelligent Natural Language Booking Assistant
    // --------------------------------------------------
    try {
      const assistantResult = await handleIntelligentBookingChat({
        message,
        user,
        role,
      });

      if (assistantResult && assistantResult.handled) {
        return res.json({
          success: true,
          response: assistantResult.response,
          action: assistantResult.navAction?.type || (assistantResult.recommendedVenues ? 'VENUE_RECOMMENDATION' : null),
          navPath: assistantResult.navAction?.path || null,
          recommendedVenues: assistantResult.recommendedVenues || null,
          bookingIntent: assistantResult.bookingIntent || null,
        });
      }
    } catch (assistantErr) {
      console.error('Intelligent assistant processing error:', assistantErr);
    }

    // --------------------------------------------------
    // Dynamic Data Query Handling
    // --------------------------------------------------
    let dynamicContext = "";

    // 1. Pending Bookings Count
    if (cleanQuery.includes("pending") && (cleanQuery.includes("how many") || cleanQuery.includes("count") || cleanQuery.includes("number"))) {
      try {
        if (role === 'admin') {
          const [rows] = await db.query("SELECT COUNT(*) AS count FROM bookings WHERE LOWER(status) = 'pending'");
          const count = rows[0]?.count || 0;
          dynamicContext = `System Data: There are currently ${count} pending booking request(s) awaiting admin review.`;
        } else {
          const [rows] = await db.query("SELECT COUNT(*) AS count FROM bookings WHERE (email = ? OR staff_id = ?) AND LOWER(status) = 'pending'", [userEmail, staffId]);
          const count = rows[0]?.count || 0;
          dynamicContext = `System Data: You have ${count} pending booking request(s).`;
        }
      } catch (err) {
        console.error("Dynamic DB error (pending count):", err.message);
      }
    }

    // 2. Available Venues Today / Available Halls
    if (cleanQuery.includes("available venue") || cleanQuery.includes("venues available") || cleanQuery.includes("available halls") || cleanQuery.includes("halls available")) {
      try {
        const [halls] = await db.query("SELECT hall_name, capacity, location FROM halls WHERE status = 'active' OR status IS NULL LIMIT 8");
        if (halls.length > 0) {
          const venueList = halls.map(h => `${h.hall_name} (Capacity: ${h.capacity || 'N/A'}, Location: ${h.location || 'NEC Campus'})`).join(", ");
          dynamicContext += ` System Data: Currently available halls in system: ${venueList}.`;
        }
      } catch (err) {
        console.error("Dynamic DB error (available venues):", err.message);
      }
    }

    // 3. User's Own Bookings List
    if (cleanQuery.includes("show my booking") || cleanQuery.includes("view my booking") || cleanQuery.includes("my booking list") || cleanQuery.includes("list my booking")) {
      try {
        const [bookings] = await db.query(
          "SELECT id, venue_name, booking_date, start_time, end_time, status FROM bookings WHERE email = ? OR staff_id = ? ORDER BY booking_date DESC LIMIT 5",
          [userEmail, staffId]
        );
        if (bookings.length > 0) {
          const listStr = bookings.map(b => `#${b.id}: ${b.venue_name || 'Venue'} on ${String(b.booking_date).slice(0,10)} (${b.status})`).join("; ");
          dynamicContext += ` System Data: Your recent bookings: ${listStr}.`;
        } else {
          dynamicContext += ` System Data: You have no recent venue bookings recorded.`;
        }
      } catch (err) {
        console.error("Dynamic DB error (my bookings):", err.message);
      }
    }

    // --------------------------------------------------
    // 1. If Gemini AI Key is set, call Gemini API
    // --------------------------------------------------
    const apiKey = process.env.AI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      try {
        if (GoogleGenAI) {
          const ai = new GoogleGenAI({ apiKey });
          const systemInstruction = `You are the AI Assistant for the NEC Venue Portal / Hall Booking application at National Engineering College (NEC).
You are talking to a logged-in user:
- Name: ${userName}
- Role: ${role === 'admin' ? 'Admin (Full access)' : 'Faculty / Staff'}
- Department: ${user.department || 'General'}

System Instructions:
1. Provide concise, helpful, and accurate answers regarding NEC Venue booking rules, processes, and status definitions.
2. Respect authentication: Faculty users must only see their own information. Never invent fake user data.
3. SECURITY REQUIREMENT: Never expose JWT tokens, passwords, OTPs, API keys, or database credentials.
4. ${dynamicContext ? `Use this real-time system data to answer: ${dynamicContext}` : ''}
5. Keep your tone polite, professional, and clear.`;

          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
              { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }] }
            ]
          });

          const replyText = response.text || response.response?.text?.();
          if (replyText) {
            return res.json({ success: true, response: replyText });
          }
        }
      } catch (aiErr) {
        console.warn("Gemini API call failed, falling back to smart intent matcher:", aiErr.message);
      }
    }

    // --------------------------------------------------
    // 2. Intelligent Intent & FAQ Fallback Engine
    // --------------------------------------------------
    let reply = "";

    // Dynamic data priority response
    if (dynamicContext) {
      reply = `${dynamicContext}\n\n`;
    }

    // --------------------------------------------------
    // Profile Intent Handling (English, Tamil, Tanglish, Hindi)
    // --------------------------------------------------
    const profilePath = role === 'admin' ? '/admin/profile' : '/faculty/profile';
    let navAction = null;

    // Detect language or query flavor
    const isTamilScript = /[\u0B80-\u0BFF]/.test(cleanQuery);
    const isHindiScript = /[\u0900-\u097F]/.test(cleanQuery);
    const isTanglish = cleanQuery.includes("pannu") || cleanQuery.includes("panrathu") || cleanQuery.includes("panradhu") || cleanQuery.includes("epdi") || cleanQuery.includes("eppadi") || cleanQuery.includes("mathu") || cleanQuery.includes("ku po");

    // 1. Navigation / Open Profile
    const isOpenProfileQuery =
      (cleanQuery.includes("profile") && (cleanQuery.includes("open") || cleanQuery.includes("go to") || cleanQuery.includes("show") || cleanQuery.includes("view") || cleanQuery.includes("see") || cleanQuery.includes("ku po"))) ||
      cleanQuery === "profile" ||
      cleanQuery === "my profile" ||
      cleanQuery.includes("profile open pannu") ||
      cleanQuery.includes("en profile") ||
      cleanQuery.includes("என் ப்ரொஃபைலை திற") ||
      cleanQuery.includes("புரொஃபைல் திற") ||
      cleanQuery.includes("profile திற") ||
      cleanQuery.includes("சுயவிவரம்") ||
      cleanQuery.includes("मेरी प्रोफ़ाइल खोलें") ||
      cleanQuery.includes("प्रोफ़ाइल खोलें") ||
      cleanQuery.includes("प्रोफ़ाइल दिखाएं");

    // 2. How to Edit Profile / Update email
    const isEditProfileQuery =
      (cleanQuery.includes("edit") && cleanQuery.includes("profile")) ||
      (cleanQuery.includes("update") && (cleanQuery.includes("profile") || cleanQuery.includes("email") || cleanQuery.includes("phone") || cleanQuery.includes("name"))) ||
      (cleanQuery.includes("change") && (cleanQuery.includes("email") || cleanQuery.includes("name") || cleanQuery.includes("phone"))) ||
      cleanQuery.includes("profile எப்படி edit") ||
      cleanQuery.includes("மின்னஞ்சலை எப்படி") ||
      cleanQuery.includes("profile epdi edit") ||
      cleanQuery.includes("email epdi change") ||
      cleanQuery.includes("email epdi mathrathu") ||
      cleanQuery.includes("प्रोफ़ाइल कैसे संपादित") ||
      cleanQuery.includes("ईमेल कैसे बदलें") ||
      cleanQuery.includes("प्रोफ़ाइल एडिट");

    // 3. How to Change Password
    const isChangePasswordQuery =
      (cleanQuery.includes("change") && cleanQuery.includes("password")) ||
      (cleanQuery.includes("reset") && cleanQuery.includes("password")) ||
      (cleanQuery.includes("how") && cleanQuery.includes("password")) ||
      cleanQuery.includes("password எப்படி மாற்றுவது") ||
      cleanQuery.includes("கடவுச்சொல் எப்படி") ||
      cleanQuery.includes("password மாற்று") ||
      cleanQuery.includes("password epdi change") ||
      cleanQuery.includes("password epdi mathrathu") ||
      cleanQuery.includes("password change pannu") ||
      cleanQuery.includes("पासवर्ड कैसे बदलें") ||
      cleanQuery.includes("पासवर्ड चेंज");

    if (isOpenProfileQuery) {
      navAction = { type: 'NAVIGATE', path: profilePath };
      if (isTamilScript) {
        reply = `உங்கள் சுயவிவரப் பக்கத்தைத் திறக்கிறேன்...\nஅங்கு உங்கள் தனிப்பட்ட விவரங்கள், துறை, தொடர்புத் தகவல்களைப் பார்க்கலாம் மற்றும் மாற்றலாம்.`;
      } else if (isTanglish) {
        reply = `Ungal profile page-ah open panren. Anga unga details paarkkavum, edit seyyavum mudiyum!`;
      } else if (isHindiScript) {
        reply = `आपकी प्रोफ़ाइल खोली जा रही है...\nवहाँ आप अपनी व्यक्तिगत जानकारी, संपर्क विवरण और सुरक्षा सेटिंग्स देख और प्रबंधित कर सकते हैं।`;
      } else {
        reply = `Opening your Profile page...\nYou can view and manage your personal details, contact information, and account security here.`;
      }
    } else if (isEditProfileQuery) {
      navAction = { type: 'NAVIGATE', path: profilePath };
      if (isTamilScript) {
        reply = `உங்கள் சுயவிவரத்தை மாற்ற:\n1. சுயவிவரப் பக்கத்திற்குச் செல்லவும் ('சுயவிவரம்' மெனுவை அழுத்தவும்).\n2. 'சுயவிவரத்தைத் திருத்து' பொத்தானை அழுத்தவும்.\n3. உங்கள் பெயர், மின்னஞ்சல் அல்லது தொலைபேசி எண்ணை மாற்றவும்.\n4. 'மாற்றங்களைச் சேமி' பொத்தானை அழுத்தவும்.\n(குறிப்பு: மின்னஞ்சல் மற்ற கணக்கில் பயன்பாட்டில் இருக்கக்கூடாது).`;
      } else if (isTanglish) {
        reply = `Profile edit panna:\n1. Sidebar-la irukkum 'Profile' page-ku ponga.\n2. 'Edit Profile' button click pannunga.\n3. Unga Name, Email, Phone number update pannunga.\n4. 'Save Changes' click pannunga.`;
      } else if (isHindiScript) {
        reply = `अपनी प्रोफ़ाइल संपादित करने के लिए:\n1. साइडबार मेनू से अपनी 'प्रोफ़ाइल' पर जाएँ।\n2. 'प्रोफ़ाइल संपादित करें' बटन पर क्लिक करें।\n3. अपना नाम, ईमेल या फ़ोन नंबर अपडेट करें।\n4. 'परिवर्तन सहेजें' पर क्लिक करें।`;
      } else {
        reply = `To edit your profile:\n1. Open your Profile page from the sidebar menu.\n2. Click the 'Edit Profile' button.\n3. Update your full name, email address, or phone number.\n4. Click 'Save Changes' to update your account.\n\nNote: Duplicate emails already used by another account will be rejected for security.`;
      }
    } else if (isChangePasswordQuery) {
      navAction = { type: 'NAVIGATE', path: profilePath };
      if (isTamilScript) {
        reply = `கடவுச்சொல்லை மாற்ற:\n1. உங்கள் சுயவிவரப் பக்கத்திற்குச் செல்லவும்.\n2. 'பாதுகாப்பு' பகுதியில் 'கடவுச்சொல்லை மாற்று' பொத்தானை அழுத்தவும்.\n3. தற்போதைய கடவுச்சொல் மற்றும் புதிய கடவுச்சொல்லை (குறைந்தபட்சம் 8 எழுத்துக்கள்) உள்ளிடவும்.\n4. 'கடவுச்சொல்லை புதுப்பி' என்பதை அழுத்தவும். உங்கள் கணக்கு பாதுகாப்பாக புதுப்பிக்கப்படும்.`;
      } else if (isTanglish) {
        reply = `Password change panna:\n1. Profile page-ku ponga.\n2. 'Security' section-la 'Change Password' click pannunga.\n3. Unga Current Password matrum New Password (8+ characters) type pannunga.\n4. 'Update Password' click pannunga.`;
      } else if (isHindiScript) {
        reply = `अपना पासवर्ड बदलने के लिए:\n1. अपनी प्रोफ़ाइल पृष्ठ पर जाएँ।\n2. 'सुरक्षा' अनुभाग में 'पासवर्ड बदलें' पर क्लिक करें।\n3. अपना वर्तमान पासवर्ड और नया मजबूत पासवर्ड (न्यूनतम 8 अक्षर) दर्ज करें।\n4. 'पासवर्ड अपडेट करें' पर क्लिक करें।`;
      } else {
        reply = `To change your password:\n1. Navigate to your Profile page.\n2. In the 'Security' section, click 'Change Password'.\n3. Enter your Current Password, New Password (at least 8 characters with uppercase, lowercase, number, and special character), and Confirm Password.\n4. Click 'Update Password'. Your password will be updated and you will be asked to log in again with your new credentials.`;
      }
    }

    if (!reply && role === 'admin') {
      if (cleanQuery.includes("approve")) {
        reply += ADMIN_FAQS.approveBooking;
      } else if (cleanQuery.includes("reject")) {
        reply += ADMIN_FAQS.rejectBooking;
      } else if (cleanQuery.includes("cancel")) {
        reply += ADMIN_FAQS.cancelApproved;
      } else if (cleanQuery.includes("venue") && (cleanQuery.includes("manage") || cleanQuery.includes("add") || cleanQuery.includes("edit"))) {
        reply += ADMIN_FAQS.manageVenues;
      } else if (cleanQuery.includes("faculty") || cleanQuery.includes("staff")) {
        reply += ADMIN_FAQS.manageFaculty;
      } else if (cleanQuery.includes("report") || cleanQuery.includes("analytics")) {
        reply += ADMIN_FAQS.viewReports;
      } else if (cleanQuery.includes("department")) {
        reply += ADMIN_FAQS.manageDepartments;
      }
    }

    if (!reply && role === 'staff') {
      if (cleanQuery.includes("how") && cleanQuery.includes("book")) {
        reply += FACULTY_FAQS.bookVenue;
      } else if (cleanQuery.includes("availab")) {
        reply += FACULTY_FAQS.checkAvailability;
      } else if (cleanQuery.includes("view") && cleanQuery.includes("booking")) {
        reply += FACULTY_FAQS.viewBookings;
      } else if (cleanQuery.includes("cancel")) {
        reply += FACULTY_FAQS.cancelBooking;
      } else if (cleanQuery.includes("pending")) {
        reply += FACULTY_FAQS.statusPending;
      } else if (cleanQuery.includes("approved")) {
        reply += FACULTY_FAQS.statusApproved;
      } else if (cleanQuery.includes("rejected")) {
        reply += FACULTY_FAQS.statusRejected;
      }
    }

    // Default polite response if no specific intent matched
    if (!reply.trim()) {
      if (role === 'admin') {
        reply = `Hello ${userName}! I am your NEC Admin AI Assistant.\nI can help you with:\n- Booking approvals & rejections\n- Real-time pending requests count\n- Managing venues, facilities & faculty\n- Viewing venue reports and timetable schedules.\n\nHow can I help you today?`;
      } else {
        reply = `Hello ${userName}! I am your NEC Venue AI Assistant.\nI can help you with:\n- Booking halls & checking slot availability\n- Tracking your booking status (Pending, Approved, Rejected)\n- Cancelling requests & changing your password.\n\nHow can I assist you?`;
      }
    }

    return res.json({
      success: true,
      response: reply.trim(),
      action: navAction?.type || null,
      navPath: navAction?.path || null,
    });

  } catch (error) {
    console.error("Error processing chatbot message:", error);
    return res.status(500).json({ success: false, message: "Internal chatbot processing error." });
  }
};

module.exports = { processMessage };
