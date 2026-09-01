import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, User, Mail, Phone, FileText, ArrowLeft } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Configure axios base URL
const api = axios.create({
  baseURL: 'http://localhost:5000'
});

const AdminHall = () => {
  const navigate = useNavigate();
  const { hallId } = useParams();
  const location = useLocation();
  const { hall } = location.state || {};

  const [formData, setFormData] = useState({
    staffName: '',
    staffEmail: '',
    staffPhone: '',
    reason: '',
    date: '',
    timeFrom: '',
    timeTo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hall) {
      navigate('/admin-halls');  // Redirect if no hall is selected
    }
  }, [hall, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const bookingData = {
        hallId: hall.id,
        hallName: hall.name,
        ...formData,
      };

      const response = await api.post('/api/admin-bookings', bookingData);
      console.log('Booking successful:', response.data);

      toast.success('Booking successful!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setTimeout(() => {
        navigate('/booking-status');
      }, 3000);

    } catch (error) {
      console.error('Error submitting booking:', error);
      
      if (error.response?.status === 409) {
        toast.error('This time slot is already booked. Please choose a different time.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error('Failed to submit booking. Please try again.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      setError('Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ToastContainer />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Back to Admin Halls</span>
          </button>

          <h1 className="text-3xl font-bold mb-1">{hall?.name || 'Admin Hall'} Booking</h1>
          <p className="text-gray-600">Book this hall for official events or meetings</p>
        </div>

        {/* Hall Information */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Hall Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {hall?.name}</p>
              <p><strong>Location:</strong> {hall?.location}</p>
              <p><strong>Capacity:</strong> {hall?.capacity} people</p>
              <p><strong>Facilities:</strong> {hall?.facilities?.join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff Name */}
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="text"
                name="staffName"
                placeholder="Staff Name"
                value={formData.staffName}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Staff Email */}
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="email"
                name="staffEmail"
                placeholder="Staff Email"
                value={formData.staffEmail}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Staff Phone */}
            <div className="flex items-center">
              <Phone className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="tel"
                name="staffPhone"
                placeholder="Staff Phone"
                value={formData.staffPhone}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Date */}
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Time From */}
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="time"
                name="timeFrom"
                value={formData.timeFrom}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Time To */}
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              <input
                type="time"
                name="timeTo"
                value={formData.timeTo}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            {/* Reason */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-start">
                <FileText className="h-5 w-5 mr-2 text-gray-600" />
                <textarea
                  name="reason"
                  placeholder="Reason for booking"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-600 mt-4">{error}</p>}

          <div className="flex mt-6 space-x-4">
            <button
              type="submit"
              className={`${
                isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-md flex items-center`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Booking'}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default AdminHall;