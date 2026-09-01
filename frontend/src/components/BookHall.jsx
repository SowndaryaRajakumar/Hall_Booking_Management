import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Building, Calendar, Clock, Users, Check, AlertCircle, ChevronDown, Loader2 } from "lucide-react";

const API_URL = "http://localhost:5000/api";

const timeSlots = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
  "16:00-17:00", "17:00-18:00"
];

const BookHall = () => {
  const navigate = useNavigate();
  const { deptId } = useParams(); // Get deptId from URL
  const [departments, setDepartments] = useState([]);
  const [availableHalls, setAvailableHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedHall, setSelectedHall] = useState(null);

  const [bookingDetails, setBookingDetails] = useState({
    deptId: deptId || "",
    selectedDate: new Date().toISOString().split('T')[0], // Today's date as default
    timeSlot: "",
    hallId: "",
    purpose: "",
    staffId: localStorage.getItem("staffId") || "", // Get from local storage or context
  });

  useEffect(() => {
    // Fetch departments when component mounts
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_URL}/departments`);
        setDepartments(response.data?.data || response.data);
        if (deptId) {
          setBookingDetails(prev => ({ ...prev, deptId })); // Set deptId if available
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError("Failed to load departments. Please try again later.");
      }
    };

    fetchDepartments();
  }, [deptId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails({ ...bookingDetails, [name]: value });

    // Reset selected hall when department or date or time slot changes
    if (name === "deptId" || name === "selectedDate" || name === "timeSlot") {
      setSelectedHall(null);
      setBookingDetails(prev => ({ ...prev, hallId: "" }));
      // Clear available halls if department changes
      if (name === "deptId") {
        setAvailableHalls([]);
      }
    }
  };

  const checkAvailability = async () => {
    if (!bookingDetails.deptId || !bookingDetails.selectedDate || !bookingDetails.timeSlot) {
      setError("Please select department, date, and time slot to check availability.");
      return;
    }

    setLoading(true);
    setError(null);
    setAvailableHalls([]);

    try {
      const response = await axios.post(`${API_URL}/halls/check-availability`, {
        deptId: bookingDetails.deptId,
        selectedDate: bookingDetails.selectedDate,
        timeSlot: bookingDetails.timeSlot
      });

      setAvailableHalls(response.data);
      if (response.data.length === 0) {
        setError("No halls available for the selected time slot.");
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      setError(err.response?.data?.error || "Failed to check hall availability.");
    } finally {
      setLoading(false);
    }
  };

  const selectHall = (hall) => {
    setSelectedHall(hall);
    setBookingDetails(prev => ({ ...prev, hallId: hall.id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bookingDetails.deptId || !bookingDetails.selectedDate || !bookingDetails.timeSlot ||
        !bookingDetails.hallId || !bookingDetails.purpose) {
      setError("Please fill in all required fields.");
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/bookings`, {
        hallId: bookingDetails.hallId,
        staffId: bookingDetails.staffId,
        bookingDate: bookingDetails.selectedDate,
        timeSlot: bookingDetails.timeSlot,
        purpose: bookingDetails.purpose,
        departmentId: bookingDetails.deptId // Include department ID in booking
      });

      setSuccess(true);
      setTimeout(() => {
        // Navigate to booking status page after successful booking
        navigate("/booking-status");
      }, 1500);
    } catch (err) {
      console.error("Error booking hall:", err);
      setError(err.response?.data?.error || "Failed to book hall. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Check if selected date is in the past
  const isPastDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(bookingDetails.selectedDate);
    return selectedDate < today;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Book a Lecture Hall</h2>
          <p className="text-green-100 mt-1">Select a department, date, and time slot to find available halls</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 text-green-700">
              <p className="font-medium">Success!</p>
              <p>Hall has been booked successfully. Redirecting to booking status page...</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Department Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <select
                    name="deptId"
                    value={bookingDetails.deptId}
                    onChange={handleChange}
                    required
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.DeptID} value={dept.DeptID}>
                        {dept.DeptName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="selectedDate"
                    value={bookingDetails.selectedDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]} // Cannot select past dates
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                {isPastDate() && (
                  <p className="mt-1 text-sm text-red-600">Cannot select past dates</p>
                )}
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="timeSlot"
                    value={bookingDetails.timeSlot}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Time Slot</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Check Availability Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={checkAvailability}
                className="px-6 py-2 bg-green-600 border border-transparent rounded-md text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                disabled={loading || !bookingDetails.deptId || !bookingDetails.selectedDate || !bookingDetails.timeSlot || isPastDate()}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Checking...
                  </>
                ) : "Check Availability"}
              </button>
            </div>

            {/* Available Halls */}
            {availableHalls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Available Halls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableHalls.map((hall) => (
                    <div
                      key={hall.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedHall?.id === hall.id
                          ? "border-green-500 bg-green-50 ring-2 ring-green-500"
                          : "border-gray-200 hover:border-green-400"
                      }`}
                      onClick={() => selectHall(hall)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-900">{hall.name}</h4>
                        {selectedHall?.id === hall.id && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{hall.location}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>Capacity: {hall.capacity}</span>
                      </div>
                      {hall.facilities && hall.facilities.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Facilities:</p>
                          <p className="text-xs mt-1">
                            {Array.isArray(hall.facilities) 
                              ? hall.facilities.join(', ') 
                              : hall.facilities}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Halls Available Message */}
            {availableHalls.length === 0 && !loading && bookingDetails.deptId && bookingDetails.selectedDate && bookingDetails.timeSlot && (
              <div className="mt-6 bg-gray-50 p-4 rounded-md text-center">
                <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-900">No Halls Available</h3>
                <p className="text-gray-500 mt-1">
                  No lecture halls are available for the selected department, date, and time.
                </p>
                <p className="text-gray-500 mt-1">
                  Please try a different time slot or date.
                </p>
              </div>
            )}

            {/* Booking Purpose */}
            {selectedHall && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Booking <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="purpose"
                  value={bookingDetails.purpose}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g. Department meeting, Special lecture, etc."
                />
              </div>
            )}

            {/* Booking Summary */}
            {selectedHall && (
              <div className="mt-6 bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Booking Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Hall:</p>
                    <p className="font-medium">{selectedHall.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location:</p>
                    <p className="font-medium">{selectedHall.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date:</p>
                    <p className="font-medium">{new Date(bookingDetails.selectedDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time:</p>
                    <p className="font-medium">{bookingDetails.timeSlot}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={() => navigate("/staff-dashboard")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 border border-transparent rounded-md text-white font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                disabled={bookingLoading || !selectedHall || !bookingDetails.purpose}
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Booking...
                  </>
                ) : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookHall;
