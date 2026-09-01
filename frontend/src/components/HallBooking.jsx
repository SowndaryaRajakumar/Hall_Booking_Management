import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Calendar, Clock, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const HallBooking = () => {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [availableHalls, setAvailableHalls] = useState([]);
  const [department, setDepartment] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Time slots
  const timeSlots = [
    '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00'
  ];

  // Format date for min attribute
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];

  // Get department details
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const response = await axios.get(`/api/departments/${deptId}`);
        setDepartment(response.data);
      } catch (err) {
        console.error('Error fetching department:', err);
        setError('Failed to fetch department details');
      }
    };

    fetchDepartment();
  }, [deptId]);

  // Handle search button click
  const handleSearch = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setError('Please select both date and time slot');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/halls/availability', {
        deptId: parseInt(deptId),
        selectedDate,
        timeSlot: selectedTimeSlot
      });
      
      setAvailableHalls(response.data);
      setSearchPerformed(true);
      setLoading(false);
    } catch (err) {
      console.error('Error checking availability:', err);
      setError('Failed to fetch available halls. Please try again.');
      setLoading(false);
    }
  };

  // Handle hall selection
  const handleSelectHall = (hallId) => {
    navigate(`/booking-confirmation/${deptId}/${hallId}`, {
      state: {
        selectedDate,
        selectedTimeSlot,
        department: department?.name
      }
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {department ? `${department.name} Department` : 'Loading...'}
          </h1>
          <p className="text-gray-600">
            Select date and time to find available halls
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Select Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="date"
                  name="date"
                  min={formattedToday}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700">
                Select Time Slot
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Search Available Halls
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && searchPerformed ? (
          <div className="text-center py-12">
            <div className="spinner"></div>
            <p className="mt-4 text-gray-600">Searching for available halls...</p>
          </div>
        ) : searchPerformed && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {availableHalls.length > 0 
                ? `Available Halls on ${selectedDate} at ${selectedTimeSlot}`
                : `No halls available on ${selectedDate} at ${selectedTimeSlot}`}
            </h2>

            {availableHalls.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {availableHalls.map((hall) => (
                  <motion.div
                    key={hall.id}
                    variants={itemVariants}
                    whileHover="hover"
                    className="bg-white rounded-lg overflow-hidden shadow-md"
                  >
                    <div className="h-40 bg-blue-100 relative">
                      {hall.image ? (
                        <img 
                          src={hall.image} 
                          alt={hall.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Building2 className="h-16 w-16 text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-gray-900">{hall.name}</h3>
                      <p className="text-gray-600 mt-1">{hall.location}</p>
                      
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Capacity: {hall.capacity}
                        </span>
                        
                        <button
                          onClick={() => handleSelectHall(hall.id)}
                          className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                  <X className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">No Available Halls</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try selecting a different date or time slot.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HallBooking;