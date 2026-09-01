import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import HallList from '../components/HallList';
import TimeSlots from '../components/TimeSlots';

const DepartmentHallBookingPage = () => {
  const { deptId } = useParams();
  const location = useLocation();
  const [department, setDepartment] = useState(null);
  const [departmentHalls, setDepartmentHalls] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get department information and all its halls
  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      try {
        setLoading(true);
        
        // If department info was passed via navigation state, use it
        if (location.state?.department) {
          setDepartment(location.state.department);
        } else {
          // Otherwise fetch from API
          const deptResponse = await axios.get(`/api/departments/${deptId}`);
          setDepartment(deptResponse.data);
        }
        
        // Fetch all halls for this department (needed for the TimeSlots component)
        const hallsResponse = await axios.get(`/api/halls/department/${deptId}`);
        setDepartmentHalls(hallsResponse.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching department information:', error);
        setLoading(false);
      }
    };
    
    if (deptId) {
      fetchDepartmentInfo();
    }
  }, [deptId, location.state]);
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{department?.name || 'Department'} Halls</h1>
        <p className="text-gray-600">Book a hall for your event</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Time slot selection panel */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Select Date & Time</h2>
          <TimeSlots 
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTimeSlot={selectedTimeSlot}
            setSelectedTimeSlot={setSelectedTimeSlot}
            departmentHalls={departmentHalls}
          />
        </div>
        
        {/* Hall listing panel */}
        <div className="md:col-span-2">
          <HallList 
            departmentId={deptId}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
          />
        </div>
      </div>
    </div>
  );
};

export default DepartmentHallBookingPage;