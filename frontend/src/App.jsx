import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import Homepage from "./pages/Homepage";
import DepartmentPage from "./pages/DepartmentPage";
import BookingPage from "./pages/BookingPage";
import HandleBookingPage from "./pages/HandleBookingPage";
import Dashboard from "./pages/Dashboard/Dashboard";
import HallReview from "./pages/HallReview/Hallreview";
import Requests from "./pages/Requests/Requests";
import HallDetails from "./pages/HallDetail/HallDetails";
import AddHall from "./pages/AddHall/AddHall";
import UpdateHall from "./pages/UpdateHall/UpdateHall";
import PendingRequests from "./pages/PendingRequests/PendingRequests";
import ApprovedRequests from "./pages/ApprovedRequests/ApprovedRequests";
import RejectedRequests from "./pages/RejectedRequests/RejectedRequests";
import BookingStatus from "./pages/BookingStatus";
import HallBooking from "./components/HallBooking";
import BookingConfirmation from "./components/BookingConfirmation";
import BookHall from "./components/BookHall";
import BookingStatusPage from "./components/BookingStatusPage";
import LandingPage from "./pages/LandingPage";
import AdminHall from "./pages/AdminHall";
import TimeSlotSelection from "./pages/TimeSlotSelection";
import ProtectedRoute from "./routes/ProtectedRoute";
import PermissionRoute from "./routes/PermissionRoute";
import AccessDenied from "./pages/AccessDenied";

import FacultyManagement from "./pages/FacultyManagement/FacultyManagement";
import VenueManagement from "./pages/VenueManagement/VenueManagement";
import FacultyDashboard from "./pages/faculty/Dashboard/FacultyDashboard";
import AdminBookings from "./pages/AdminBookings/AdminBookings";
import BookVenue from "./pages/faculty/BookVenue/BookVenue";
import MyBookings from "./pages/faculty/MyBookings/MyBookings";
import FacultyProfile from "./pages/faculty/Profile/FacultyProfile";
import Timetable from "./pages/Timetable/Timetable";
import Reports from "./pages/Reports/Reports";
import AdminProfile from "./pages/AdminProfile/AdminProfile";
import AdminBookVenue from "./pages/AdminBookVenue/AdminBookVenue";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import VenueAnalytics from "./pages/admin/Analytics/VenueAnalytics";

// Master Admin Portal Pages
import DepartmentAdminManagement from "./pages/master/DepartmentAdminManagement";
import AccessControlPage from "./pages/master/AccessControlPage";
import CommonVenueManagement from "./pages/master/CommonVenueManagement";
import SystemAuditLogs from "./pages/master/SystemAuditLogs";
import MasterNotificationSettings from "./pages/master/MasterNotificationSettings";

// New Academic Allocations & Venue Feedback Pages
import FacultyAcademicCalendar from "./pages/faculty/AcademicCalendar/FacultyAcademicCalendar";
import AdminAcademicAllocations from "./pages/admin/AcademicAllocations/AdminAcademicAllocations";
import CommonVenueFeedback from "./pages/admin/VenueFeedback/CommonVenueFeedback";
import FacultyVenueHistory from "./pages/faculty/VenueHistory/FacultyVenueHistory";
import FacultyVenueFeedback from "./pages/faculty/VenueFeedback/FacultyVenueFeedback";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />

        {/* Public & Shared Routes */}
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="/departments" element={<ProtectedRoute><DepartmentPage /></ProtectedRoute>} />
        <Route path="/booking/:deptId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/handle-booking/:hallId" element={<HandleBookingPage />} />

        {/* Faculty Routes */}
        <Route path="/faculty/dashboard" element={<ProtectedRoute role="staff"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/book-venue" element={<ProtectedRoute role="staff"><BookVenue /></ProtectedRoute>} />
        <Route path="/faculty/academic-calendar" element={<ProtectedRoute role="staff"><FacultyAcademicCalendar /></ProtectedRoute>} />
        <Route path="/faculty/my-bookings" element={<ProtectedRoute role="staff"><MyBookings /></ProtectedRoute>} />
        <Route path="/faculty/venue-history" element={<ProtectedRoute role="staff"><FacultyVenueHistory /></ProtectedRoute>} />
        <Route path="/faculty/venue-feedback" element={<ProtectedRoute role="staff"><FacultyVenueFeedback /></ProtectedRoute>} />
        <Route path="/faculty/notifications" element={<ProtectedRoute role="staff"><NotificationsPage role="staff" /></ProtectedRoute>} />
        <Route path="/faculty/profile" element={<ProtectedRoute role="staff"><FacultyProfile /></ProtectedRoute>} />

        {/* Admin Common Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/book-venue" element={<ProtectedRoute role="admin"><AdminBookVenue /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><NotificationsPage role="admin" /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />

        {/* Permission-Guarded Admin Routes */}
        <Route
          path="/admin/bookings"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_BOOKINGS">
              <AdminBookings />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/timetable"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_TIMETABLE">
              <Timetable />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_ANALYTICS">
              <VenueAnalytics />
            </PermissionRoute>
          }
        />
        <Route path="/analytics" element={<Navigate to="/admin/analytics" replace />} />
        <Route
          path="/admin/reports"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_REPORTS">
              <Reports />
            </PermissionRoute>
          }
        />
        <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />

        <Route
          path="/venue-management"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="MANAGE_VENUES">
              <VenueManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/venue-management"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="MANAGE_VENUES">
              <VenueManagement />
            </PermissionRoute>
          }
        />

        <Route
          path="/faculty-management"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="MANAGE_FACULTY">
              <FacultyManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/faculty-management"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="MANAGE_FACULTY">
              <FacultyManagement />
            </PermissionRoute>
          }
        />

        {/* Master Admin Specific Routes */}
        <Route
          path="/department-admins"
          element={
            <PermissionRoute role="MASTER_ADMIN">
              <DepartmentAdminManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/department-admins"
          element={
            <PermissionRoute role="MASTER_ADMIN">
              <DepartmentAdminManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <PermissionRoute role="MASTER_ADMIN">
              <AccessControlPage />
            </PermissionRoute>
          }
        />

        {/* Department Admin Specific Route Aliases */}
        <Route
          path="/department-admin/dashboard"
          element={
            <PermissionRoute role="DEPARTMENT_ADMIN" permission="VIEW_DASHBOARD">
              <Dashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/department-admin/faculty"
          element={
            <PermissionRoute role="DEPARTMENT_ADMIN" permission="MANAGE_FACULTY">
              <FacultyManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/department-admin/venues"
          element={
            <PermissionRoute role="DEPARTMENT_ADMIN" permission={["MANAGE_VENUES", "MANAGE_DEPARTMENT_VENUES"]}>
              <VenueManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/department-halls"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission={["MANAGE_VENUES", "MANAGE_DEPARTMENT_VENUES"]}>
              <VenueManagement />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/common-venues"
          element={<Navigate to="/venue-management?type=COMMON" replace />}
        />
        <Route
          path="/admin/venue-feedback"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission={["MANAGE_VENUE_FEEDBACK", "SUBMIT_VENUE_FEEDBACK"]}>
              <CommonVenueFeedback />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/academic-calendar"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_ACADEMIC_CALENDAR">
              <AdminAcademicAllocations />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/academic-allocations"
          element={
            <PermissionRoute role={["MASTER_ADMIN", "DEPARTMENT_ADMIN"]} permission="VIEW_ACADEMIC_CALENDAR">
              <AdminAcademicAllocations />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/notification-settings"
          element={
            <PermissionRoute role="MASTER_ADMIN">
              <MasterNotificationSettings />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <PermissionRoute role="MASTER_ADMIN">
              <SystemAuditLogs />
            </PermissionRoute>
          }
        />

        {/* Legacy / Direct Routes */}
        <Route path="/hall-review" element={<HallReview />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/hall-details/:id" element={<HallDetails />} />
        <Route path="/update-hall/:id" element={<UpdateHall />} />
        <Route path="/add-hall" element={<AddHall />} />
        <Route path="/requests/pending" element={<PendingRequests />} />
        <Route path="/requests/approved" element={<ApprovedRequests />} />
        <Route path="/requests/rejected" element={<RejectedRequests />} />
        <Route path="/booking-status" element={<BookingStatus />} />
        <Route path="/bookingstatuspage" element={<BookingStatusPage />} />
        <Route path="/book-hall/:deptId" element={<BookHall />} />
        <Route path="/hall" element={<HallBooking />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/confirmation" element={<BookingConfirmation />} />
        <Route path="/admin-halls/:hallId" element={<AdminHall />} />
        <Route path="/Select-timeslot/:deptId" element={<TimeSlotSelection />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
