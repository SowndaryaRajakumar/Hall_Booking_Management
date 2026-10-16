import React, { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { updateStaff } from "../../api/staffApi";
import { getDepartments } from "../../api/departmentApi";

const EditFacultyModal = ({
  isOpen,
  faculty,
  onClose,
  onSuccess,
}) => {
  const rawRole = localStorage.getItem("role") || "";
  const userDepartment = localStorage.getItem("department") || "";
  const isMasterAdmin = ["MASTER_ADMIN", "superadmin"].includes(rawRole);
  const isDeptAdmin = !isMasterAdmin && (rawRole === "DEPARTMENT_ADMIN" || rawRole === "admin");

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employee_id: "",
    role: "FACULTY",
  });

  useEffect(() => {
    if (faculty) {
      setFormData({
        full_name: faculty.full_name || "",
        email: faculty.email || "",
        phone: faculty.phone || "",
        department: isDeptAdmin ? userDepartment : (faculty.department || ""),
        designation: faculty.designation || "",
        employee_id: faculty.employee_id || faculty.employeeId || "",
        role: faculty.role || "FACULTY",
      });
    }
  }, [faculty, isDeptAdmin, userDepartment]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const finalDept = isDeptAdmin ? userDepartment : formData.department;

      await updateStaff(
        faculty.staff_id,
        {
          ...formData,
          department: finalDept,
          role: "FACULTY",
        },
        token
      );

      alert("Faculty updated successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to update faculty.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !faculty) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Faculty</h2>
            {isDeptAdmin && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                Restricted to {userDepartment} department
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Full Name *
            </label>
            <input
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Faculty Name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email Address *
            </label>
            <input
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="faculty@college.edu"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Phone Number
            </label>
            <input
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Department
            </label>
            <div className="relative">
              <select
                className={`w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  isDeptAdmin ? "bg-gray-100 text-gray-600 cursor-not-allowed pr-8" : ""
                }`}
                name="department"
                value={isDeptAdmin ? userDepartment : formData.department}
                onChange={handleChange}
                disabled={isDeptAdmin}
              >
                {!isDeptAdmin && <option value="">Select Department</option>}
                {departments.map((dept) => (
                  <option key={dept.DeptID || dept.dept_id} value={dept.DeptName || dept.name}>
                    {dept.DeptName || dept.name}
                  </option>
                ))}
              </select>
              {isDeptAdmin && (
                <Lock
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Designation
              </label>
              <input
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Designation"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Employee ID
              </label>
              <input
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                placeholder="Employee ID"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? "Updating..." : "Update Faculty"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditFacultyModal;
