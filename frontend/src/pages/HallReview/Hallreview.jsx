import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const HallReview = () => {
  const navigate = useNavigate();
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const response = await axios.get(`${API_URL}/halls`);
        setHalls(response.data);
      } catch (err) {
        console.error("Error fetching halls:", err);
        setError("Failed to load halls. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchHalls();
  }, []);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "/default-hall.jpg";
    
    // Handle both relative and absolute URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // For absolute URLs
      if (imageUrl.includes("images.app.goo.gl")) {
        return "/default-hall.jpg"; // Still filter Google image links
      }
      return imageUrl;
    } else {
      // For relative URLs, prepend your API URL or base URL
      // If imageUrl starts with '/', keep it as is; otherwise, add '/'
      const relativePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${API_URL}${relativePath}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-5 md:px-20">
      <h2 className="text-3xl font-semibold text-center text-gray-800 mb-6">Hall Review</h2>
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      {loading && <p className="text-center text-gray-600">Loading halls...</p>}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls.map((hall, index) => (
          <div
            key={hall.id || index}
            className="bg-white shadow-lg rounded-lg overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer"
          >
            {/* Click on Image to Redirect to Update Hall Page */}
            <div className="w-full h-56 relative" onClick={() => navigate(`/update-hall/${hall.id}`)}>
              <img
                src={getImageUrl(hall.image)}
                alt={hall.name}
                className="w-full h-full object-cover cursor-pointer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-hall.jpg";
                }}
              />
              {/* Add debug info if needed during development */}
              {/* <div className="absolute bottom-0 left-0 bg-black bg-opacity-70 text-white text-xs p-1">
                {hall.image || 'No Image URL'}
              </div> */}
            </div>

            <div className="p-4">
              <h3 className="text-xl font-bold text-gray-800">{hall.name}</h3>
              <p className="text-gray-600"><strong>Location:</strong> {hall.location}</p>
              <p className="text-gray-600"><strong>Capacity:</strong> {hall.capacity} seats</p>
              <p className="text-gray-600"><strong>Projector:</strong> {hall.projector ? "Yes" : "No"}</p>
              <p className="text-gray-600"><strong>AC:</strong> {hall.ac ? "Yes" : "No"}</p>
              <p className="text-gray-600"><strong>Department:</strong> {hall.department}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <button 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          onClick={() => navigate("/add-hall")}
        >
          Add Hall
        </button>
      </div>
    </div>
  );
};

export default HallReview;