import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HandleBooking from '../components/HallBooking/HandleBooking';
import axios from 'axios';

const HandleBookingPage = () => {
  const location = useLocation();
  const { hallId } = useParams();
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHallData = async () => {
      try {
        setLoading(true);
        
        // Use hall data from location state if available
        if (location.state?.hall) {
          setHall(location.state.hall);
        } 
        // Otherwise fetch hall data using the hallId
        else if (hallId) {
          // Replace with your actual API endpoint
          const response = await axios.get(`/api/halls/${hallId}`);
          setHall(response.data);
        } else {
          // No hall data available, redirect to hall listing
          setError('No hall selected');
          navigate('/hall-booking');
        }
      } catch (err) {
        console.error('Error fetching hall data:', err);
        setError('Failed to load hall information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchHallData();
  }, [location.state, hallId, navigate]);

  // Function to handle successful booking
  const handleBookingSuccess = (bookingData) => {
    // You could store booking confirmation in state/context
    // or just navigate with the data
    navigate('/booking-status', { 
      state: { 
        booking: bookingData,
        success: true 
      }
    });
  };

  // Function to handle booking errors
  const handleBookingError = (errorMessage) => {
    setError(errorMessage);
    // Optionally scroll to error message
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to hall selection page
  const goToHallBooking = () => {
    navigate('/booking');
  };

  // Navigate to specific hall page (if available)
  const goToHallPage = () => {
    if (hallId) {
      navigate(`/booking/${hallId}`);
    } else {
      navigate('/booking');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto py-6 px-4">
        {/* Breadcrumb Navigation with proper clickable links */}
        <div className="flex items-center mb-6">
          <button 
            onClick={goToHallBooking}
            className="text-blue-600 hover:underline"
          >
            Hall Booking
          </button>
          <span className="mx-2">›</span>
          <button
            onClick={goToHallPage}
            className="text-blue-600 hover:underline"
          >
            {hall?.name || 'Hall Selection'}
          </button>
          <span className="mx-2">›</span>
          <span className="font-medium">Book hall</span>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-sm underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Content Display */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : hall ? (
          <HandleBooking 
            hall={hall} 
            onBookingSuccess={handleBookingSuccess}
            onBookingError={handleBookingError}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-700 mb-4">No hall information available.</p>
            <button 
              onClick={goToHallBooking}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Return to Hall Selection
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default HandleBookingPage;