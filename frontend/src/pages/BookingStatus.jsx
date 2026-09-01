import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Loader2 } from 'lucide-react';

const BookingStatus = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bookings when component mounts
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Assuming you have a way to get the current user's ID or token
        const response = await axios.get('http://localhost:5000/api/admin-bookings/bookings', {
          params: { 
            status: 'approved' 
            // You might want to add user-specific filtering here
          },
          // Include authentication headers if required
          // headers: {
          //   'Authorization': `Bearer ${userToken}`     
          // }
        });

        setBookings(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to fetch bookings');
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Format date function
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-gray-100 min-h-screen p-8 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-red-600 text-xl">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      {/* Back Button */}
      <button
        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-center mb-8">Approved Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center text-gray-600 text-xl">
          No approved bookings found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <Calendar className="h-8 w-8 text-green-600 mr-3" />
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{booking.hall_name}</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>Event:</strong> {booking.reason}</p>
                <p><strong>Date:</strong> {formatDate(booking.date)}</p>
                <p><strong>Start Time:</strong> {booking.time_from}</p>
                <p><strong>End Time:</strong> {booking.time_to}</p>
                <p><strong>Status:</strong>
                  <span className="text-green-600 font-bold ml-2">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingStatus;