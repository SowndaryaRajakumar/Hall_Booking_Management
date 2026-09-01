import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar, Clock, Users, MapPin, Monitor, Snowflake, BookOpen, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = "http://localhost:5000/api";

const HandleBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hallId } = useParams();
  const { hall, selectedDate, selectedTimeSlot, department } = location.state || {};
  
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Get current user from localStorage or context
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!hall || !selectedDate || !selectedTimeSlot || !department) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg text-gray-700">Booking information not found.</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Departments
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Parse time slot to get start and end times
  const [startTime, endTime] = selectedTimeSlot.split(' - ');
  
  // Format date for display
  const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!purpose.trim()) {
      setError('Please provide a purpose for your booking');
      return;
    }
    
    if (!attendees.trim()) {
      setError('Please provide the expected number of attendees');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/dept-bookings`, {
        hallId: hall.id,
        bookingDate: selectedDate,
        startTime,
        endTime,
        purpose,
        attendees,
        department
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSuccess('Hall booked successfully!');
      setTimeout(() => {
        navigate(`/booking-confirmation/${response.data.booking.BookingID}`, {
          state: { booking: response.data.booking }
        });
      }, 2000);
    } catch (err) {
      console.error("Error creating booking:", err);
      setError(err.response?.data?.error || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-800">Complete Your Booking</h2>
          <p className="text-gray-600">{department.DeptName} - Finalize your hall reservation</p>
        </div>
        
        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Time Slot</p>
                  <p className="font-medium">{selectedTimeSlot}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <BookOpen className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Hall</p>
                  <p className="font-medium">{hall.name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{hall.location}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <div className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full flex items-center">
                <Users className="h-3 w-3 mr-1" /> Capacity: {hall.capacity}
              </div>
              
              {hall.projector && (
                <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center">
                  <Monitor className="h-3 w-3 mr-1" /> Projector
                </div>
              )}
              
              {hall.ac && (
                <div className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center">
                  <Snowflake className="h-3 w-3 mr-1" /> AC
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 text-green-700 flex items-start">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="purpose">
                Purpose of Booking <span className="text-red-500">*</span>
              </label>
              <textarea
                id="purpose"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe the purpose of your booking..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="attendees">
                Expected Number of Attendees <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="attendees"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter number of expected attendees"
                min={1}
                max={hall.capacity}
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum capacity: {hall.capacity}</p>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Go Back
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Booking
                    <Send className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HandleBooking;