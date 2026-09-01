import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Search, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TimeSlots from '../components/HallBooking/TimeSlots';
import HallList from '../components/HallBooking/HallList';
import { getDepartment, getAdminHall, getAvailableHalls, getHallsByDepartment } from '../utils/HallsModel';

const BookingPage = () => {
  const navigate = useNavigate();
  const { deptId } = useParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableHalls, setAvailableHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState(null);
  const [adminHall, setAdminHall] = useState(null);
  const [departmentHalls, setDepartmentHalls] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHalls, setFilteredHalls] = useState([]);

  // Check if the booking is for an administrative hall
  const isAdminHall = window.location.pathname.includes('/booking/admin');

  // Load data based on whether it's a department or administrative hall
  useEffect(() => {
    if (isAdminHall) {
      const hallInfo = getAdminHall(Number(deptId));
      setAdminHall(hallInfo);
    } else {
      const deptInfo = getDepartment(Number(deptId));
      setDepartment(deptInfo);
      
      // Get all halls for this department
      const halls = getHallsByDepartment(Number(deptId));
      setDepartmentHalls(halls);
    }
  }, [deptId, isAdminHall]);

  // Load available halls when date or time slot changes
  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      setLoading(true);

      getAvailableHalls(Number(deptId), selectedDate, selectedTimeSlot)
        .then(halls => {
          setAvailableHalls(halls);
          setFilteredHalls(halls);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching halls:", error);
          setLoading(false);
        });
    }
  }, [deptId, selectedDate, selectedTimeSlot]);

  // Filter halls based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHalls(availableHalls);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = availableHalls.filter(hall =>
      hall.name.toLowerCase().includes(query) ||
      hall.facilities.some(facility => facility.toLowerCase().includes(query)) ||
      hall.description.toLowerCase().includes(query) ||
      hall.location.toLowerCase().includes(query)
    );

    setFilteredHalls(filtered);
  }, [searchQuery, availableHalls]);

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Back to Selection</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {isAdminHall ? adminHall?.name : department?.name} Booking
              </h1>
              <p className="text-gray-600">
                Find and book {isAdminHall ? 'administrative hall' : 'department hall'} for your events
              </p>
            </div>

            <div className="mt-4 md:mt-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search halls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <span className="text-sm text-gray-500 block">Date</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
            </div>

            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <span className="text-sm text-gray-500 block">Time Slot</span>
                <span className="font-medium">{selectedTimeSlot || 'Not selected'}</span>
              </div>
            </div>

            {filteredHalls.length > 0 && (
              <div className="flex items-center ml-auto">
                <span className="text-sm bg-green-100 text-green-800 py-1 px-3 rounded-full">
                  {filteredHalls.length} hall{filteredHalls.length !== 1 ? 's' : ''} available
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4">Select Time Slot</h2>
              <TimeSlots
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTimeSlot={selectedTimeSlot}
                setSelectedTimeSlot={setSelectedTimeSlot}
                departmentHalls={departmentHalls}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4">Available Halls</h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
                </div>
              ) : (
                <HallList
                  halls={filteredHalls}
                  selectedDate={selectedDate}
                  selectedTimeSlot={selectedTimeSlot}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookingPage;
