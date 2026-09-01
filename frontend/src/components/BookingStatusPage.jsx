import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Clock, Building, Users, Tag, CheckCircle, XCircle, Loader2 } from "lucide-react";

const API_URL = "http://localhost:5000/api";

const BookingStatusPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const staffId = localStorage.getItem("staffId");
      if (!staffId) {
        throw new Error("Staff ID not found. Please login again.");
      }
      
      const response = await axios.get(`${API_URL}/bookings/staff/${staffId}`);
      setBookings(response.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.response?.data?.error || err.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/bookings/${bookingId}`);
      // Refresh bookings after cancellation
      fetchBookings();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert(err.response?.data?.error || "Failed to cancel booking");
    }
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse time slot
    const [startTime] = booking.timeSlot.split('-');
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create a date object with booking date and time
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    
    if (activeTab === "upcoming") {
      return bookingDateTime > now;
    } else if (activeTab === "past") {
      return bookingDateTime < now;
    } else {
      return true; // all bookings
    }
  });

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const date = new Date(booking.bookingDate).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {});

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Booking Status</h2>
          <p className="text-indigo-100 mt-1">View and manage your hall bookings</p>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === "upcoming"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Upcoming Bookings
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === "past"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Past Bookings
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                All Bookings
              </button>
            </nav>
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              <span className="ml-2 text-gray-600">Loading bookings...</span>
            </div>
          )}
          
          {/* No bookings state */}
          {!loading && filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
              <p className="mt-2 text-gray-500">
                {activeTab === "upcoming" && "You don't have any upcoming bookings."}
                {activeTab === "past" && "You don't have any past bookings."}
                {activeTab === "all" && "You don't have any bookings yet."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate("/book-hall")}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Book a Hall
                </button>
              </div>
            </div>
          )}
          
          {/* Bookings list */}
          {!loading && filteredBookings.length > 0 && (
            <div className="space-y-8">
              {Object.entries(groupedBookings).map(([date, dateBookings]) => (
                <div key={date} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{date}</h3>
                  
                  <div className="space-y-4">
                    {dateBookings.map((booking) => {
                      // Parse time slot
                      const [startTime, endTime] = booking.timeSlot.split('-');
                      const [startHours, startMinutes] = startTime.split(':').map(Number);
                      
                      // Create a date object with booking date and time
                      const bookingDateTime = new Date(booking.bookingDate);
                      bookingDateTime.setHours(startHours, startMinutes, 0, 0);
                      
                      const now = new Date();
                      const isPast = bookingDateTime < now;
                      
                      return (
                        <div key={booking.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                            <div className="flex items-center">
                              <Clock className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="font-medium">{booking.timeSlot}</span>
                            </div>
                            <div className="flex items-center">
                              {isPast ? (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Completed</span>
                              ) : (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Upcoming</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                              <div className="mb-4 md:mb-0">
                                <h4 className="text-lg font-medium text-gray-900">{booking.hallName}</h4>
                                <div className="mt-1 text-sm text-gray-500 flex items-center">
                                  <Building className="h-4 w-4 mr-1" />
                                  <span>{booking.location}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Users className="h-4 w-4 mr-1" />
                                  <span>Capacity: {booking.capacity}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Tag className="h-4 w-4 mr-1" />
                                  <span>{booking.department}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Purpose:</span> {booking.purpose}
                              </p>
                            </div>
                            
                            {!isPast && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => cancelBooking(booking.id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  Cancel Booking
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => navigate("/staff-dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Dashboard
            </button>
            
            <button
              onClick={() => navigate("/book-hall")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Book a Hall
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingStatusPage;