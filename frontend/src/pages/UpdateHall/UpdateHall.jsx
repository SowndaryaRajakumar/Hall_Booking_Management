import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const UpdateHall = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hardcoded departments list
  const departments = [
    { DeptID: 1, DeptName: "Computer Science" },
    { DeptID: 2, DeptName: "Electrical Engineering" },
    { DeptID: 3, DeptName: "Mechanical Engineering" },
    { DeptID: 4, DeptName: "Civil Engineering" },
    { DeptID: 5, DeptName: "Electronics & Communication" }
  ];

  const [hallDetails, setHallDetails] = useState({
    name: "",
    location: "",
    capacity: "",
    projector: false,
    ac: false,
    image: "",
    deptId: "",
    activeStatus: true
  });

  // Fetch hall details from the backend
  useEffect(() => {
    const fetchHallDetails = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/halls/${id}`);
        
        // Transform backend data to match component state
        setHallDetails({
          name: response.data.HallName || response.data.name,
          location: response.data.Location || response.data.location,
          capacity: response.data.Capacity || response.data.capacity,
          projector: response.data.HasProjector || response.data.projector,
          ac: response.data.HasAC || response.data.ac,
          image: response.data.ImageURL || response.data.image,
          deptId: response.data.DeptID || response.data.deptId,
          activeStatus: response.data.ActiveStatus !== undefined ? response.data.ActiveStatus : true
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching hall details:", error);
        toast.error("Failed to load hall details");
        setIsLoading(false);
      }
    };

    fetchHallDetails();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHallDetails({
      ...hallDetails,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send update request to the backend
      await axios.put(`/api/halls/${id}`, {
        name: hallDetails.name,
        location: hallDetails.location,
        capacity: hallDetails.capacity,
        projector: hallDetails.projector,
        ac: hallDetails.ac,
        image: hallDetails.image,
        deptId: hallDetails.deptId,
        activeStatus: hallDetails.activeStatus
      });
      
      toast.success("Hall updated successfully");
      navigate("/hall-review");
    } catch (error) {
      console.error("Error updating hall:", error);
      toast.error("Failed to update hall");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Update Hall</h2>
        </div>
        
        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hall Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hall Name
              </label>
              <input
                type="text"
                name="name"
                value={hallDetails.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={hallDetails.location}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={hallDetails.capacity}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                name="deptId"
                value={hallDetails.deptId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.DeptID} value={dept.DeptID}>
                    {dept.DeptName}
                  </option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="text"
                name="image"
                value={hallDetails.image || ""}
                onChange={handleChange}
                placeholder="Enter image URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preview image if available */}
          {hallDetails.image && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Image Preview:</p>
              <div className="relative h-56 rounded-md overflow-hidden shadow">
                <img
                  src={hallDetails.image}
                  alt="Hall preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Available';
                  }}
                />
              </div>
            </div>
          )}

          {/* Checkboxes for Amenities */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">Hall Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="projector"
                  name="projector"
                  checked={hallDetails.projector}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="projector" className="ml-2 text-gray-700">
                  Projector Available
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ac"
                  name="ac"
                  checked={hallDetails.ac}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="ac" className="ml-2 text-gray-700">
                  AC Available
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activeStatus"
                  name="activeStatus"
                  checked={hallDetails.activeStatus}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="activeStatus" className="ml-2 text-gray-700">
                  Active Status
                </label>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/hall-review")}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition-colors ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                "Update Hall"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateHall;