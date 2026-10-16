import React, { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { addStaff } from "../../api/staffApi";
import { getDepartments } from "../../api/departmentApi";

const AddFacultyModal = ({ isOpen, onClose, onSuccess }) => {
  const rawRole = localStorage.getItem("role") || "";
  const userDepartment = localStorage.getItem("department") || "";
  const isMasterAdmin = ["MASTER_ADMIN", "superadmin"].includes(rawRole);
  const isDeptAdmin = !isMasterAdmin && (rawRole === "DEPARTMENT_ADMIN" || rawRole === "admin");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: isDeptAdmin ? userDepartment : "",
    designation: "",
    employee_id: "",
    role: "FACULTY",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      if (isDeptAdmin && userDepartment) {
        setFormData((prev) => ({
          ...prev,
          department: userDepartment,
          role: "FACULTY",
        }));
      }
    }
  }, [isOpen, isDeptAdmin, userDepartment]);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const generatePassword = () => {
    const name = formData.full_name.trim().split(" ")[0] || "Faculty";
    const password = `${name}@123`;

    setFormData((prev) => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
  };

  const handleSubmit = async () => {
    const finalDepartment = isDeptAdmin ? userDepartment : formData.department;

    if (
      !formData.full_name.trim() ||
      !formData.email.trim() ||
      !finalDepartment ||
      !formData.password
    ) {
      alert("Please fill all required fields (Name, Email, Department, Password).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      await addStaff(
        {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          department: finalDepartment,
          designation: formData.designation.trim(),
          employee_id: formData.employee_id.trim(),
          role: "FACULTY",
          password: formData.password,
        },
        token
      );

      alert("Faculty Added Successfully!");

      setFormData({
        full_name: "",
        email: "",
        phone: "",
        department: isDeptAdmin ? userDepartment : "",
        designation: "",
        employee_id: "",
        role: "FACULTY",
        password: "",
        confirmPassword: "",
      });

      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to add faculty.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Add Faculty</h2>
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
          {/* Faculty Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. John Doe"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Phone Number (WhatsApp notification recipient)
            </label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              placeholder="faculty@college.edu"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Department *
            </label>
            <div className="relative">
              <select
                name="department"
                value={isDeptAdmin ? userDepartment : formData.department}
                onChange={handleChange}
                disabled={isDeptAdmin}
                className={`w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  isDeptAdmin ? "bg-gray-100 text-gray-600 cursor-not-allowed pr-8" : ""
                }`}
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
            {isDeptAdmin && (
              <p className="text-[11px] text-gray-500 mt-1">
                Department Admins can only add faculty to their assigned department.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Designation
              </label>
              <input
                type="text"
                placeholder="Assistant Professor"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="EMP-102"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Generate Password */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={generatePassword}
                className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition"
              >
                Auto Generate Password
              </button>
              {formData.password && (
                <span className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded border">
                  {formData.password}
                </span>
              )}
            </div>
            <div className="mt-2">
              <input
                type="password"
                placeholder="Or enter custom password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? "Saving..." : "Add Faculty"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFacultyModal;
