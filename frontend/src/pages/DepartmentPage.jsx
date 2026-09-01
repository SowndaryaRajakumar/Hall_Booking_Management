// pages/DepartmentPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react'; // Import Back icon
import DepartmentSelect from '../components/DepartmentSelect';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const DepartmentPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Back Button */}
      <div className="p-4">
        <button 
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          onClick={() => navigate(-1)} // Navigate back
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>

      <DepartmentSelect />
      <Footer />
    </div>
  );
};

export default DepartmentPage;
