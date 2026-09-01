// import React from 'react';
// import { Building2 } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// const HallList = ({ halls, selectedDate, selectedTimeSlot }) => {
//   const navigate = useNavigate();
  
//   const handleBookNow = (hall) => {
//     // Navigate to HandleBookingPage with the selected hall, date and time information
//     navigate(`/handle-booking/${hall.id}`, { 
//       state: { 
//         hall,
//         selectedDate: selectedDate.toISOString(), // Convert date to string for navigation
//         selectedTimeSlot 
//       } 
//     });
//   };
//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex items-center mb-4">
//         <Building2 className="h-5 w-5 text-blue-600 mr-2" />
//         <h2 className="text-lg font-semibold">Available Halls</h2>
//       </div>
     
//       {selectedDate && selectedTimeSlot ? (
//         <div className="space-y-4">
//           {halls.map((hall) => (
//             <div
//               key={hall.id}
//               className="p-4 border rounded-md hover:border-blue-500 cursor-pointer"
//             >
//               <h3 className="font-semibold">{hall.name}</h3>
//               <p className="text-sm text-gray-600">Capacity: {hall.capacity}</p>
//               <p className="text-sm text-gray-600">
//                 Facilities: {hall.facilities.join(', ')}
//               </p>
//               <div className="mt-2 bg-blue-50 p-2 rounded text-sm text-blue-800">
//                 <p><strong>Selected Date:</strong> {selectedDate.toLocaleDateString()}</p>
//                 <p><strong>Selected Time:</strong> {selectedTimeSlot}</p>
//               </div>
//               <button 
//                 className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
//                 onClick={() => handleBookNow(hall)}
//               >
//                 Book Now
//               </button>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-gray-500 text-center">
//           Please select date and time to view available halls
//         </p>
//       )}
//     </div>
//   );
// };

// export default HallList;




// // import React, { useEffect, useState } from 'react';
// // import axios from 'axios';

// // const HallList = ({ selectedTimeSlot, onHallSelect }) => {
// //   const [halls, setHalls] = useState([]);

// //   useEffect(() => {
// //     if (selectedTimeSlot) {
// //       fetchAvailableHalls();
// //     }
// //   }, [selectedTimeSlot]);

// //   const fetchAvailableHalls = async () => {
// //     try {
// //       const response = await axios.get(`http://localhost:5000/api/halls/available`, {
// //         params: {
// //           timeSlot: selectedTimeSlot
// //         }
// //       });

// //       setHalls(response.data);
// //     } catch (error) {
// //       console.error('Error fetching available halls:', error);
// //       setHalls([]);
// //     }
// //   };

// //   return (
// //     <div>
// //       <h2>Available Halls</h2>
// //       {halls.length === 0 ? (
// //         <p>No halls available for this time slot.</p>
// //       ) : (
// //         <ul>
// //           {halls.map((hall) => (
// //             <li key={hall.id} onClick={() => onHallSelect(hall)}>
// //               {hall.name} - {hall.department} - Capacity: {hall.capacity}
// //             </li>
// //           ))}
// //         </ul>
// //       )}
// //     </div>
// //   );
// // };

// // export default HallList;




import React from 'react';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HallList = ({ halls, selectedDate, selectedTimeSlot, onSelectHall }) => {
  const navigate = useNavigate();
  
  const handleBookNow = (hall) => {
    // First option: Call the onSelectHall function if provided (for in-page selection)
    if (onSelectHall) {
      onSelectHall(hall);
      return;
    }
    
    // Second option: Navigate to HandleBookingPage with the selected hall, date and time information
    navigate(`/handle-booking/${hall.id}`, { 
      state: { 
        hall,
        selectedDate: selectedDate instanceof Date 
          ? selectedDate.toISOString() 
          : selectedDate, // Convert date to string for navigation
        selectedTimeSlot 
      } 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <Building2 className="h-5 w-5 text-blue-600 mr-2" />
        <h2 className="text-lg font-semibold">Available Halls</h2>
      </div>
     
      {selectedDate && selectedTimeSlot ? (
        halls && halls.length > 0 ? (
          <div className="space-y-4">
            {halls.map((hall) => (
              <div
                key={hall.id}
                className="p-4 border rounded-md hover:border-blue-500 cursor-pointer"
              >
                <h3 className="font-semibold">{hall.name}</h3>
                <p className="text-sm text-gray-600">Location: {hall.location}</p>
                <p className="text-sm text-gray-600">Capacity: {hall.capacity}</p>
                {hall.facilities && (
                  <p className="text-sm text-gray-600">
                    Facilities: {Array.isArray(hall.facilities) 
                      ? hall.facilities.join(', ') 
                      : hall.facilities}
                  </p>
                )}
                <div className="mt-2 bg-blue-50 p-2 rounded text-sm text-blue-800">
                  <p><strong>Selected Date:</strong> {formatDate(selectedDate)}</p>
                  <p><strong>Selected Time:</strong> {selectedTimeSlot}</p>
                </div>
                <button 
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  onClick={() => handleBookNow(hall)}
                >
                  Book Now
                </button>
              </div>
            ))}</div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No halls available for the selected date and time</p>
          </div>
        )
      ) : (
        <p className="text-gray-500 text-center">
          Please select date and time to view available halls
        </p>
      )}
    </div>
  );
};

export default HallList;