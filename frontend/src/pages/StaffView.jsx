import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, Check, User, BookOpen, Clock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const StaffView = () => {
  const navigate = useNavigate();
  const [staffInfo, setStaffInfo] = useState(null);
  const [statsData, setStatsData] = useState({
    totalBookings: 0,
    approvedBookings: 0,
    pendingBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const fetchData = async (showRetry = false) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      if (showRetry) {
        setRetrying(true);
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      // Fetch staff details and stats in parallel
      const [staffResponse, statsResponse] = await Promise.all([
        axios.get('http://localhost:5000/api/staff/me', { headers }),
        axios.get('http://localhost:5000/api/staff/stats', { headers })
      ]);

      if (staffResponse.data.success) {
        setStaffInfo(staffResponse.data.data);
      }
      
      if (statsResponse.data.success) {
        setStatsData(statsResponse.data.data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching staff data:', err);
      setError(err.response?.status === 404 
        ? 'Staff profile not found. Please contact support.' 
        : 'Failed to load staff information');
      
      // Redirect to login if unauthorized
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleRetry = () => {
    fetchData(true);
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      <span className="text-gray-600">Loading...</span>
    </div>
  );

  const ErrorMessage = () => (
    <div className="flex items-center space-x-2 bg-red-50 p-3 rounded-lg">
      <AlertCircle className="h-5 w-5 text-red-500" />
      <span className="text-red-600">{error}</span>
      <button 
        onClick={handleRetry}
        disabled={retrying}
        className="ml-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors disabled:opacity-50"
      >
        {retrying ? (
          <div className="flex items-center space-x-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Retrying...</span>
          </div>
        ) : (
          'Retry'
        )}
      </button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen p-4 sm:p-8">
      {/* Staff Profile Section */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 w-full">
            <User className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 bg-blue-100 rounded-full p-2 sm:p-3" />
            <div className="flex-grow">
              {loading ? (
                <LoadingSpinner />
              ) : error ? (
                <ErrorMessage />
              ) : staffInfo ? (
                <>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
                    Welcome, {staffInfo.full_name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {staffInfo.email} • {staffInfo.department}
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-sm sm:text-base">No staff information available</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 w-full sm:w-auto justify-end">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <span className="hidden sm:block">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <span className="sm:hidden">
              {new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center space-x-4">
          <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 bg-blue-100 rounded-full p-2 sm:p-3" />
          <div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700">Total Bookings</h3>
            <p className="text-xl sm:text-3xl font-bold text-gray-800">{statsData.totalBookings}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center space-x-4">
          <Check className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 bg-green-100 rounded-full p-2 sm:p-3" />
          <div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700">Approved</h3>
            <p className="text-xl sm:text-3xl font-bold text-green-800">{statsData.approvedBookings}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex items-center space-x-4">
          <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-600 bg-yellow-100 rounded-full p-2 sm:p-3" />
          <div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700">Pending</h3>
            <p className="text-xl sm:text-3xl font-bold text-yellow-800">{statsData.pendingBookings}</p>
          </div>
        </div>
      </div>

      {/* Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <button 
          className="bg-white rounded-xl shadow-lg p-6 text-left cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={() => handleNavigation('/departments')}
        >
          <Home className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Hall Booking</h2>
          <p className="text-sm text-gray-600 mb-4">
            Create and manage hall reservations efficiently.
          </p>
          <div className="flex items-center text-blue-600 hover:text-blue-800 text-sm group">
            <span className="mr-2">Book Now</span>
            <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
        
        <button 
          className="bg-white rounded-xl shadow-lg p-6 text-left cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          onClick={() => handleNavigation('/booking-status')}
        >
          <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Booking Status</h2>
          <p className="text-sm text-gray-600 mb-4">
            Track and monitor your hall booking requests.
          </p>
          <div className="flex items-center text-green-600 hover:text-green-800 text-sm group">
            <span className="mr-2">View Status</span>
            <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default StaffView;