import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Check, Calendar, Clock, Building2, Users, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const BookingConfirmation = () => {
  const { deptId, hallId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedDate, selectedTimeSlot, department } = location.state || {};
  
  const [hall, setHall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingData, setBookingData] = useState({
    purpose: '',
    attendees: '',
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    additionalNotes: ''
  });

  // Fetch hall details
  useEffect(() => {
    const fetchHallDetails = async () => {
      try {
        const response = await axios.get(`/api/halls/${hallId}`);
        setHall(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching hall details:', err);
        setError('Failed to fetch hall details');
        setLoading(false);
      }
    };

    fetchHallDetails();
  }, [hallId]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData({
      ...bookingData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/bookings', {
        hallId: parseInt(hallId),
        deptId: parseInt(deptId),
        bookingDate: selectedDate,
        timeSlot: selectedTimeSlot,
        purpose: bookingData.purpose,
        attendees: parseInt(bookingData.attendees) || 0,
        requesterName: bookingData.requesterName,
        requesterEmail: bookingData.requesterEmail,
        requesterPhone: bookingData.requesterPhone,
        additionalNotes: bookingData.additionalNotes
      });

      setBookingSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Error submitting booking:', err);
      setError('Failed to submit booking request. Please try again.');
      setLoading(false);
    }
  };

  if (loading && !hall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !hall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center"
        >
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your booking request has been submitted successfully and is pending approval.
          </p>
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <span>{selectedDate}</span>
            </div>
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <span>{selectedTimeSlot}</span>
            </div>
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-500 mr-2" />
              <span>{hall.HallName}</span>
            </div>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/my-bookings')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Return Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmation</h1>
          <p className="text-gray-600">Complete your booking details</p>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Department</p>
                <p className="font-medium">{department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Hall</p>
                <p className="font-medium">{hall?.HallName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-medium">{selectedDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time Slot</p>
                <p className="font-medium">{selectedTimeSlot}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="font-medium">{hall?.Location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Capacity</p>
                <p className="font-medium">{hall?.Capacity} people</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Projector</p>
                <p className="font-medium">{hall?.HasProjector ? 'Available' : 'Not Available'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Air Conditioning</p>
                <p className="font-medium">{hall?.HasAC ? 'Available' : 'Not Available'}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Booking *
                </label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={bookingData.purpose}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Number of Attendees *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="attendees"
                    name="attendees"
                    min="1"
                    max={hall?.Capacity}
                    value={bookingData.attendees}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Maximum capacity: {hall?.Capacity} people
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="requesterName" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="requesterName"
                    name="requesterName"
                    value={bookingData.requesterName}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="requesterEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="requesterEmail"
                    name="requesterEmail"
                    value={bookingData.requesterEmail}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="requesterPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="requesterPhone"
                  name="requesterPhone"
                  value={bookingData.requesterPhone}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  rows="3"
                  value={bookingData.additionalNotes}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Booking Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;