import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { addStaff } from "../../api/staffApi";
import { getDepartments } from "../../api/departmentApi";

const AddFacultyModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employee_id: "",
    role: "staff",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error(error);
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
    if (
      !formData.full_name ||
      !formData.email ||
      !formData.department ||
      !formData.password
    ) {
      alert("Please fill all fields.");
      return;
    }

    if (!formData.email.endsWith("@nec.edu.in")) {
      alert("Only NEC email addresses are allowed.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      await addStaff(
        {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          designation: formData.designation,
          employee_id: formData.employee_id,
          role: formData.role,
          password: formData.password,
        },
        token
      );

      alert("Faculty Added Successfully!");

      setFormData({
        full_name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        employee_id: "",
        role: "staff",
        password: "",
        confirmPassword: "",
      });

      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

      <div className="bg-white rounded-xl w-full max-w-lg p-6">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Add Faculty
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-4">

          {/* Faculty Name */}
          <input
            type="text"
            placeholder="Faculty Name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="tel"
            placeholder="Phone Number (optional)"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          {/* Department */}
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          >
            <option value="">Select Department</option>

            {departments.map((dept) => (
              <option
                key={dept.DeptID}
                value={dept.DeptName}
              >
                {dept.DeptName}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Designation (optional)"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Employee ID (optional)"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          />

          {/* Role */}
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
          >
            <option value="staff">Faculty</option>
            <option value="admin">Administrator</option>
          </select>

          {/* Generate Password */}
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={generatePassword}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Generate Password
            </button>

            {formData.password && (
              <span className="text-sm text-gray-700">
                Password:
                <strong className="ml-1">
                  {formData.password}
                </strong>
              </span>
            )}

          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Add Faculty"}
          </button>

        </div>

      </div>

    </div>
  );
};

export default AddFacultyModal;
