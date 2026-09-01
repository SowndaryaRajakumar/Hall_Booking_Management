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

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />

        <Route path="/departments" element={<ProtectedRoute><DepartmentPage /></ProtectedRoute>} />
        <Route path="/booking/:deptId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/handle-booking/:hallId" element={<HandleBookingPage />} />

        <Route path="/faculty/dashboard" element={<ProtectedRoute role="staff"><FacultyDashboard /></ProtectedRoute>} />
        <Route path="/faculty/book-venue" element={<ProtectedRoute role="staff"><BookVenue /></ProtectedRoute>} />
        <Route path="/faculty/my-bookings" element={<ProtectedRoute role="staff"><MyBookings /></ProtectedRoute>} />
        <Route path="/faculty/profile" element={<ProtectedRoute role="staff"><FacultyProfile /></ProtectedRoute>} />

        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/book-venue" element={<ProtectedRoute role="admin"><AdminBookVenue /></ProtectedRoute>} />
        <Route path="/admin/bookings" element={<ProtectedRoute role="admin"><AdminBookings /></ProtectedRoute>} />
        <Route path="/admin/timetable" element={<ProtectedRoute role="admin"><Timetable /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
        <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />

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
        <Route path="/venue-management" element={<ProtectedRoute role="admin"><VenueManagement /></ProtectedRoute>} />
        <Route path="/faculty-management" element={<ProtectedRoute role="admin"><FacultyManagement /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
