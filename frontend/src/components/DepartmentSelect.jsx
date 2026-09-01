import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const DepartmentSelect = () => {
  const navigate = useNavigate();

  // Departments and Administrative Halls
  const departments = [
    { 
      id: 1, 
      name: 'Computer Science', 
      code: 'CS', 
      students: 450,
      description: 'Innovating technology and software solutions'
    },
    { 
      id: 2, 
      name: 'Electronics', 
      code: 'ECE', 
      students: 380,
      description: 'Advancing electronic and communication technologies'
    },
    { 
      id: 3, 
      name: 'Mechanical', 
      code: 'MECH', 
      students: 320,
      description: 'Designing and engineering mechanical systems'
    },
    { 
      id: 4, 
      name: 'Civil', 
      code: 'CIVIL', 
      students: 290,
      description: 'Building infrastructure for the future'
    }
  ];

  const adminHalls = [
    {
      id: 5,
      name: 'Assembly Hall',
      code: 'ASSEMBLY',
      capacity: 1000,
      description: 'Spacious hall for large-scale events and gatherings',
      location: 'Main Campus, Block A',
      facilities: ['Projector', 'Sound System', 'Air Conditioning', 'Stage']
    },
    {
      id: 6,
      name: 'Auditorium',
      code: 'AUDI',
      capacity: 700,
      description: 'Well-equipped auditorium for presentations and performances',
      location: 'Main Campus, Block B',
      facilities: ['Projector', 'Sound System', 'Air Conditioning', 'Podium']
    },
    {
      id: 7,
      name: 'Conference Hall',
      code: 'CONF',
      capacity: 300,
      description: 'Professional space for meetings and conferences',
      location: 'Admin Building, 2nd Floor',
      facilities: ['Projector', 'Video Conferencing', 'Air Conditioning', 'Whiteboard']
    }
  ];

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
      transition: {
        duration: 0.5
      }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  // Function to handle navigation to AdminHall
  const handleAdminHallClick = (hall) => {
    navigate(`/admin-halls/${hall.id}`, { state: { hall } });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
             BOOKING SELECTION
          </h1>
          <p className="text-xl text-gray-600">
            Choose a department or administrative hall to proceed with your booking
          </p>
        </div>

        {/* Departments Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-8 mb-16"
        >
          {/* {departments.map((dept) => (
            <motion.div
              key={dept.id}
              variants={itemVariants}
              whileHover="hover"
              onClick={() => navigate(`/booking/${dept.id}`)}
              className="bg-white shadow-lg rounded-2xl overflow-hidden 
                         cursor-pointer transform transition-all 
                         hover:shadow-xl hover:-translate-y-2"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <Building2  className="h-10 w-10 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {dept.name}
                    </h2>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">
                  {dept.description}
                </p>

                <div className="flex justify-between items-center border-t pt-4 mt-4">
                  <button 
                    className="bg-blue-100 text-blue-600 p-2 rounded-full 
                               hover:bg-blue-200 hover:text-blue-700 
                               transition-all"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))} */}

{departments.map((dept) => (
  <motion.div
    key={dept.id}
    variants={itemVariants}
    whileHover="hover"
    onClick={() => navigate(`/select-timeslot/${dept.id}`, { 
      state: { 
        department: {
          DeptID: dept.id,
          DeptName: dept.name,
          DeptCode: dept.code,
          Students: dept.students,
          Description: dept.description
        } 
      } 
    })}
    className="bg-white shadow-lg rounded-2xl overflow-hidden 
               cursor-pointer transform transition-all 
               hover:shadow-xl hover:-translate-y-2"
  >
    <div className="p-6">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-3 rounded-full mr-4">
          <Building2 className="h-10 w-10 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {dept.name}
          </h2>
        </div>
      </div>

      <p className="text-gray-600 mb-4">
        {dept.description}
      </p>

      <div className="flex justify-between items-center border-t pt-4 mt-4">
        <button 
          className="bg-blue-100 text-blue-600 p-2 rounded-full 
                     hover:bg-blue-200 hover:text-blue-700 
                     transition-all"
        >
          <ArrowRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  </motion.div>
))}
        </motion.div>

        {/* Administrative Halls Section */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Administrative Halls</h2>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-8"
        >
          {adminHalls.map((hall) => (
            <motion.div
              key={hall.id}
              variants={itemVariants}
              whileHover="hover"
              onClick={() => handleAdminHallClick(hall)}
              className="bg-white shadow-lg rounded-2xl overflow-hidden 
                         cursor-pointer transform transition-all 
                         hover:shadow-xl hover:-translate-y-2"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full mr-4">
                    <Users className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {hall.name}
                    </h2>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">
                  {hall.description}
                </p>

                <div className="flex justify-between items-center border-t pt-4 mt-4">
                  <button 
                    className="bg-green-100 text-green-600 p-2 rounded-full 
                               hover:bg-green-200 hover:text-green-700 
                               transition-all"
                  >
                    <ArrowRight className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
        </motion.div>
      </div>
    </div>
  );
};

export default DepartmentSelect;