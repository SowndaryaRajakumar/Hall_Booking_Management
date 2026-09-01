// src/utils/hallsModel.js

/**
 * Hall and Department data model for frontend use
 * This handles the relationship between departments and their available halls
 */

// Define hall facilities for reuse
const FACILITIES = {
    PROJECTOR: 'Projector',
    AC: 'AC',
    WHITEBOARD: 'Whiteboard',
    SOUND_SYSTEM: 'Sound System',
    STAGE: 'Stage',
    VIDEO_CONFERENCING: 'Video Conferencing',
    CATERING: 'Catering',
    WIFI: 'Wi-Fi',
    COMPUTERS: 'Computers',
    RECORDING: 'Recording Equipment'
  };
  
  // Define all available halls with complete information
  const hallsData = [
    {
      id: 1,
      name: 'lab1',
      capacity: 100,
      facilities: [FACILITIES.PROJECTOR, FACILITIES.AC, FACILITIES.SOUND_SYSTEM],
      image: '/api/placeholder/400/250',
      description: 'Modern seminar hall with multimedia capabilities',
      location: 'Main Building, 1st Floor',
    },
    {
      id: 2,
      name: 'lab2',
      capacity: 50,
      facilities: [FACILITIES.WHITEBOARD, FACILITIES.AC, FACILITIES.VIDEO_CONFERENCING],
      image: '/api/placeholder/400/250',
      description: 'Professional conference room for meetings and discussions',
      location: 'Administrative Block, 2nd Floor',
  
    },
    {
      id: 3,
      name: 'lab3',
      capacity: 200,
      facilities: [FACILITIES.STAGE, FACILITIES.SOUND_SYSTEM, FACILITIES.AC, FACILITIES.RECORDING],
      image: '/api/placeholder/400/250',
      description: 'Large auditorium suitable for events and presentations',
      location: 'Central Block, Ground Floor',
      hourlyRate: 3000
    },
    {
      id: 4,
      name: 'lab12',
      capacity: 40,
      facilities: [FACILITIES.COMPUTERS, FACILITIES.PROJECTOR, FACILITIES.AC, FACILITIES.WIFI],
      image: '/api/placeholder/400/250',
      description: 'Fully equipped computer lab with latest hardware',
      location: 'Tech Building, 3rd Floor',
      hourlyRate: 2000
    },
    {
      id: 5, 
      name: 'Lecture Hall B',
      capacity: 80,
      facilities: [FACILITIES.PROJECTOR, FACILITIES.AC, FACILITIES.WHITEBOARD],
      image: '/api/placeholder/400/250',
      description: 'Spacious lecture hall for classes and seminars',
      location: 'Academic Block, 1st Floor',
      hourlyRate: 1200
    },
    {
      id: 6,
      name: 'Meeting Room C',
      capacity: 20,
      facilities: [FACILITIES.WHITEBOARD, FACILITIES.AC, FACILITIES.VIDEO_CONFERENCING, FACILITIES.WIFI],
      image: '/api/placeholder/400/250',
      description: 'Small meeting room for focused group discussions',
      location: 'Research Wing, 4th Floor',
      hourlyRate: 800
    }
  ];
  
  // Department arrays containing hall objects directly
  const CS = [
    hallsData.find(hall => hall.id === 1),
    hallsData.find(hall => hall.id === 2),
    hallsData.find(hall => hall.id === 4),
    hallsData.find(hall => hall.id === 6)
  ];
  
  const ECE = [
    hallsData.find(hall => hall.id === 1),
    hallsData.find(hall => hall.id === 3),
    hallsData.find(hall => hall.id === 4),
    hallsData.find(hall => hall.id === 5)
  ];
  
  const MECH = [
    hallsData.find(hall => hall.id === 2),
    hallsData.find(hall => hall.id === 3),
    hallsData.find(hall => hall.id === 5),
    hallsData.find(hall => hall.id === 6)
  ];
  
  const CIVIL = [
    hallsData.find(hall => hall.id === 1),
    hallsData.find(hall => hall.id === 3),
    hallsData.find(hall => hall.id === 5)
  ];
  
  // Department-specific information
  const departments = {
    1: {
      id: 1,
      name: 'Computer Science',
      code: 'CS',
      color: 'blue',
      students: 450,
      bookingRules: 'Maximum 4 hours per booking for computer labs'
    },
    2: {
      id: 2,
      name: 'Electronics',
      code: 'ECE',
      color: 'indigo',
      students: 380,
      bookingRules: 'Electronics equipment must be requested 48 hours in advance'
    },
    3: {
      id: 3,
      name: 'Mechanical',
      code: 'MECH',
      color: 'orange',
      students: 320,
      bookingRules: 'Additional space may be required for mechanical demonstrations'
    },
    4: {
      id: 4,
      name: 'Civil',
      code: 'CIVIL',
      color: 'green',
      students: 290,
      bookingRules: 'Model displays require prior approval'
    }
  };

 // Example admin halls data
const adminHalls = [
  {
    id: 5,
    name: 'Assembly Hall',
    location: 'Main Block - Ground Floor',
    capacity: 500,
    facilities: ['Projector', 'Sound System', 'AC'],
    description: 'Spacious hall for large gatherings and events.'
  },
  {
    id: 6,
    name: 'Auditorium',
    location: 'Main Block - 2nd Floor',
    capacity: 1000,
    facilities: ['Projector', 'Stage', 'AC'],
    description: 'Large auditorium suitable for conferences and shows.'
  },
  {
    id: 7,
    name: 'Conference Hall',
    location: 'Admin Block - 1st Floor',
    capacity: 200,
    facilities: ['Whiteboard', 'Wi-Fi', 'AC'],
    description: 'Perfect for meetings and corporate events.'
  }
];

  
  // Track hall bookings - structure: { hallId: { date: { timeSlot: true } } }
  let bookings = {};
  
  /**
   * Get department information by ID
   * @param {number} deptId - Department ID
   * @returns {object} Department information
   */
  export const getDepartment = (deptId) => {
    return departments[deptId] || null;
  };
  
  /**
   * Get all halls for a specific department by department ID
   * @param {number} deptId - Department ID
   * @returns {Array} Array of hall objects
   */
  export const getHallsByDepartment = (deptId) => {
    if (!departments[deptId]) {
      return [];
    }
    
    const deptCode = departments[deptId].code;
    
    switch (deptCode) {
      case 'CS': return CS;
      case 'ECE': return ECE;
      case 'MECH': return MECH;
      case 'CIVIL': return CIVIL;
      default: return [];
    }
  };
  
  /**
   * Get available halls for a specific department on a given date and time slot
   * All halls are available by default for all time slots unless specifically booked
   * 
   * @param {number} deptId - Department ID
   * @param {Date} date - Selected date
   * @param {string} timeSlot - Selected time slot
   * @returns {Promise} Promise that resolves to array of available halls
   */
  export const getAvailableHalls = (deptId, date, timeSlot) => {
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        const departmentHallList = getHallsByDepartment(deptId);
        const dateString = date.toISOString().split('T')[0];
        
        // Filter out any booked halls
        const availableHalls = departmentHallList.filter(hall => {
          const hallBookings = bookings[hall.id];
          if (!hallBookings) return true;
          
          const dateBookings = hallBookings[dateString];
          if (!dateBookings) return true;
          
          return !dateBookings[timeSlot];
        });
        
        resolve(availableHalls);
      }, 300);
    });
  };
  
  /**
   * Get detailed information for a specific hall
   * @param {number} hallId - Hall ID
   * @returns {object} Hall information
   */
  export const getHallDetails = (hallId) => {
    return hallsData.find(hall => hall.id === hallId) || null;
  };
  
  /**
   * Check if a specific hall is available for a given date and time
   * Halls are available by default unless specifically booked
   * 
   * @param {number} hallId - Hall ID
   * @param {Date} date - Selected date
   * @param {string} timeSlot - Selected time slot
   * @returns {Promise} Promise that resolves to a boolean
   */
  export const checkHallAvailability = (hallId, date, timeSlot) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dateString = date.toISOString().split('T')[0];
        const isBooked = bookings[hallId]?.[dateString]?.[timeSlot] || false;
        resolve(!isBooked);
      }, 200);
    });
  };
  
  /**
   * Book a hall for a specific date and time slot
   * 
   * @param {number} hallId - Hall ID
   * @param {Date} date - Selected date
   * @param {string} timeSlot - Selected time slot
   * @returns {Promise} Promise that resolves to a boolean indicating success
   */
  export const bookHall = (hallId, date, timeSlot) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dateString = date.toISOString().split('T')[0];
        
        // Initialize booking structures if they don't exist
        if (!bookings[hallId]) bookings[hallId] = {};
        if (!bookings[hallId][dateString]) bookings[hallId][dateString] = {};
        
        // Check if already booked
        if (bookings[hallId][dateString][timeSlot]) {
          resolve(false); // Already booked
          return;
        }
        
        // Book the hall
        bookings[hallId][dateString][timeSlot] = true;
        resolve(true);
      }, 300);
    });
  };

// Export function to get admin hall by ID
export const getAdminHall = (id) => {
  return adminHalls.find(hall => hall.id === id) || null;
};

  export default {
    FACILITIES,
    CS,
    ECE,
    MECH,
    CIVIL,
    getDepartment,
    getHallsByDepartment,
    getAvailableHalls,
    getHallDetails,
    checkHallAvailability,
    bookHall,
    getAdminHall
  };