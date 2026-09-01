import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Building, MapPin, Users, Monitor, Snowflake, Image, ChevronDown, Loader2 } from "lucide-react";

const API_URL = "http://localhost:5000/api";

const AddHall = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [newHall, setNewHall] = useState({
    name: "",
    location: "",
    capacity: "",
    projector: false,
    ac: false,
    image: "",
    deptId: "",
  });

  useEffect(() => {
    // Fetch departments when component mounts
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_URL}/departments`);
        setDepartments(response.data);
        // Set default department if available
        if (response.data.length > 0) {
          setNewHall(prev => ({ ...prev, deptId: response.data[0].DeptID }));
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError("Failed to load departments. Please try again later.");
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewHall({ ...newHall, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newHall.name || !newHall.location || !newHall.capacity || !newHall.deptId) {
      setError("Please fill in all required fields.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/halls`, {
        name: newHall.name,
        location: newHall.location,
        capacity: parseInt(newHall.capacity),
        projector: newHall.projector,
        ac: newHall.ac,
        image: newHall.image || "/api/placeholder/400/200",
        deptId: newHall.deptId
      });
      
      setSuccess(true);
      setTimeout(() => {
        // Navigate to the hall review page after successful submission
        navigate("/hall-review");
      }, 1500);
    } catch (err) {
      console.error("Error adding hall:", err);
      setError(err.response?.data?.error || "Failed to add hall. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Add New Lecture Hall</h2>
          <p className="text-blue-100 mt-1">Enter details to register a new hall in the booking system</p>
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
              <p>Hall has been added successfully. Redirecting to review page...</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hall Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hall Name <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={newHall.name}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Main Auditorium"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="location"
                    value={newHall.location}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Building B, Floor 2"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="capacity"
                    value={newHall.capacity}
                    onChange={handleChange}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 100"
                    min="1"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <select 
                    name="deptId" 
                    value={newHall.deptId} 
                    onChange={handleChange}
                    required
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Image className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="image"
                  value={newHall.image}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Leave empty to use a default image</p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-3">Hall Amenities</h3>
              <div className="bg-gray-50 p-4 rounded-md flex flex-col md:flex-row gap-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="projector"
                    checked={newHall.projector}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <Monitor className="h-5 w-5 text-gray-500 mr-2" />
                    <span>Projector Available</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="ac"
                    checked={newHall.ac}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <Snowflake className="h-5 w-5 text-gray-500 mr-2" />
                    <span>AC Available</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {(newHall.name || newHall.location || newHall.capacity > 0) && (
              <div className="border rounded-md overflow-hidden mt-6">
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <h3 className="text-md font-medium">Hall Preview</h3>
                </div>
                <div className="p-4">
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-500">
                    {newHall.image ? (
                      <img src="/api/placeholder/400/200" alt="Hall preview" className="object-cover rounded-md" />
                    ) : (
                      <span>No image provided</span>
                    )}
                  </div>
                  <h4 className="font-bold text-lg">{newHall.name || "Hall Name"}</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p className="flex items-center"><MapPin className="h-4 w-4 mr-1" /> {newHall.location || "Location"}</p>
                    <p className="flex items-center"><Users className="h-4 w-4 mr-1" /> Capacity: {newHall.capacity || 0}</p>
                    <div className="flex space-x-2 mt-2">
                      {newHall.projector && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Monitor className="h-3 w-3 mr-1" /> Projector
                        </span>
                      )}
                      {newHall.ac && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Snowflake className="h-3 w-3 mr-1" /> AC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <button 
                type="button" 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-blue-600 border border-transparent rounded-md text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Adding...
                  </>
                ) : "Add Hall"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddHall;