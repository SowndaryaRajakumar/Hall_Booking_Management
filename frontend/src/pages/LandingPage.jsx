import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Departments Div */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-64">
          <h2 className="text-2xl font-bold mb-4 text-blue-800">Departments</h2>
          <div className="flex-grow flex items-center justify-center">
            <Link 
              to="/departments" 
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 w-full text-center"
            >
              View Departments
            </Link>
          </div>
        </div>

        {/* Administrative Bookings Div */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-64">
          <h2 className="text-2xl font-bold mb-4 text-green-800">Administrative Booking</h2>
          <div className="flex-grow flex items-center justify-center">
            <Link 
              to="/admin/bookings" 
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 w-full text-center"
            >
              Manage Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;