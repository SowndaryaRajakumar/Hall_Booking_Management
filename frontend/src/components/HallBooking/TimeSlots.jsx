import React, { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { checkHallAvailability } from '../../utils/HallsModel';

const TimeSlots = ({ selectedDate, setSelectedDate, selectedTimeSlot, setSelectedTimeSlot, departmentHalls }) => {
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlotAvailability, setTimeSlotAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  // Available time slots
  const timeSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  // Generate calendar days for current month
  useEffect(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    setCalendarDays(daysInMonth);
  }, [currentMonth]);

  // Check availability for the selected date
  useEffect(() => {
    if (!selectedDate || !departmentHalls || departmentHalls.length === 0) return;
    
    setLoading(true);
    const checkAvailability = async () => {
      const availability = {};
      
      // For each time slot, check if any hall is available
      for (const timeSlot of timeSlots) {
        availability[timeSlot] = { available: false, loading: true };
        
        // Check availability across all halls for this department
        const availabilityPromises = departmentHalls.map(hall => 
          checkHallAvailability(hall.id, selectedDate, timeSlot)
        );
        
        const results = await Promise.all(availabilityPromises);
        // If any hall is available during this time slot, mark as available
        availability[timeSlot] = { 
          available: results.some(isAvailable => isAvailable),
          loading: false
        };
      }
      
      setTimeSlotAvailability(availability);
      setLoading(false);
    };
    
    checkAvailability();
  }, [selectedDate, departmentHalls]);

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Select a date from the calendar
  const handleDateSelect = (day) => {
    setSelectedDate(day);
    setSelectedTimeSlot(null); // Reset time slot when date changes
  };

  // Select a time slot
  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  return (
    <div>
      {/* Calendar navigation */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          &larr;
        </button>
        <h3 className="font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button 
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-gray-100"
        >
          &rarr;
        </button>
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1 mb-4 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
        
        {/* Add empty spaces for days before the first of the month */}
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
          <div key={`empty-${index}`} className="h-8"></div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map(day => (
          <button
            key={day.toString()}
            onClick={() => handleDateSelect(day)}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
              isSameDay(day, selectedDate)
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-100'
            }`}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="font-medium mb-2">Time Slots for {format(selectedDate, 'MMM d, yyyy')}</h3>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map(timeSlot => {
              const availability = timeSlotAvailability[timeSlot];
              const isAvailable = availability?.available;
              const isLoading = availability?.loading;
              
              return (
                <button
                  key={timeSlot}
                  onClick={() => isAvailable && handleTimeSlotSelect(timeSlot)}
                  disabled={!isAvailable || isLoading}
                  className={`w-full py-2 px-3 rounded-lg border flex justify-between items-center ${
                    selectedTimeSlot === timeSlot
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : isAvailable
                        ? 'border-gray-300 hover:border-gray-400'
                        : 'border-red-200 bg-red-50'
                  }`}
                >
                  <span>{timeSlot}</span>
                  {isLoading ? (
                    <span className="text-xs text-gray-500">Checking...</span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isAvailable ? 'Available' : 'Booked'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlots;