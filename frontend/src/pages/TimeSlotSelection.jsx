import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { format, addDays, isSameDay } from 'date-fns';
import { Calendar, Clock, Users, MapPin, Monitor, Snowflake, ChevronRight, Loader2 } from 'lucide-react';

const API_URL = "http://localhost:5000/api";

const timeSlots = [
  "09:15 AM - 10:05 AM",
  "10:06 AM - 10:55 AM",
  "11:10 AM - 12:00 PM",
  "01:50 PM - 02:40 PM",
  "02:40 PM - 03:30 PM",
  "03:45 PM - 04:30 PM",
  "3:00 PM - 4:00 PM",
  "4:30 PM - 5:15 PM"
];

const TimeSlotSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { department } = location.state || {};
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableHalls, setAvailableHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Generate dates for next 7 days
  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  };
  
  const availableDates = generateDates();
  
  useEffect(() => {
    const fetchAvailableHalls = async () => {
      if (!selectedDate || !selectedTimeSlot || !department) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Parse the time slot
        const [startTime, endTime] = selectedTimeSlot.split(' - ');
        
        // Format the date for API request
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        
        // Make API request to get available halls
        const response = await axios.get(`${API_URL}/halls1/available`, {
          params: {
            date: formattedDate,
            startTime,
            endTime,
            deptId: department.DeptID
          }
        });
        
        setAvailableHalls(response.data);
      } catch (err) {
        console.error("Error fetching available halls:", err);
        setError("Failed to load available halls. Please try again.");
        setAvailableHalls([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableHalls();
  }, [selectedDate, selectedTimeSlot, department]);
  
  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null); // Reset time slot when date changes
  };
  
  // Handle time slot selection
  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };
  
  // Handle "Book Now" button click
  // Handle "Book Now" button click
const handleBookNow = (hall) => {
  navigate(`/handle-booking/${hall.id}`, {
    state: {
      hall,
      selectedDate: selectedDate.toISOString(),
      selectedTimeSlot,
      department
    }
  });
};
  
  if (!department) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-lg text-gray-700">Department information not found.</p>
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
  
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Department Info Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-blue-800">{department.DeptName}</h2>
          <p className="text-gray-600">Select a date and time slot to view available halls</p>
        </div>
        
        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Select Date
          </h3>
          
          <div className="flex overflow-x-auto pb-2 space-x-2">
            {availableDates.map((date) => (
              <button
                key={date.toString()}
                onClick={() => handleDateSelect(date)}
                className={`flex-shrink-0 p-3 rounded-md ${
                  isSameDay(selectedDate, date)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold">{format(date, 'EEE')}</div>
                  <div className="text-lg">{format(date, 'd')}</div>
                  <div className="text-xs">{format(date, 'MMM')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Slot Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Select Time Slot
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {timeSlots.map((timeSlot) => (
              <button
                key={timeSlot}
                onClick={() => handleTimeSlotSelect(timeSlot)}
                className={`p-3 border rounded-md text-center ${
                  selectedTimeSlot === timeSlot
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {timeSlot}
              </button>
            ))}
          </div>
        </div>
        
        {/* Available Halls */}
        {selectedTimeSlot && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Available Halls for {format(selectedDate, 'EEEE, MMMM d')} at {selectedTimeSlot}
            </h3>
            
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="ml-2 text-gray-600">Loading available halls...</span>
              </div>
            ) : (
              <>
                {availableHalls.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-md">
                    <p className="text-gray-600">No halls available for the selected time slot.</p>
                    <p className="text-gray-500 mt-2">Please try a different date or time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {availableHalls.map((hall) => (
                      <div key={hall.id} className="border rounded-md p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-bold text-lg">{hall.name}</h4>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <p className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" /> {hall.location}
                              </p>
                              <p className="flex items-center">
                                <Users className="h-4 w-4 mr-1" /> Capacity: {hall.capacity}
                              </p>
                              <div className="flex space-x-2 mt-2">
                                {hall.projector && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                    <Monitor className="h-3 w-3 mr-1" /> Projector
                                  </span>
                                )}
                                {hall.ac && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                    <Snowflake className="h-3 w-3 mr-1" /> AC
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBookNow(hall)}
                            className="h-10 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                          >
                            Book Now
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlotSelection;