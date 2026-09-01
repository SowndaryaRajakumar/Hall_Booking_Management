import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateStaff } from "../../api/staffApi";
import { getDepartments } from "../../api/departmentApi";

const EditFacultyModal = ({
  isOpen,
  faculty,
  onClose,
  onSuccess,
  allowRoleEdit = true,
}) => {

  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employee_id: "",
    role: "staff",
  });

  useEffect(() => {
    if (faculty) {
      setFormData({
        full_name: faculty.full_name || "",
        email: faculty.email || "",
        phone: faculty.phone || "",
        department: faculty.department || "",
        designation: faculty.designation || "",
        employee_id: faculty.employee_id || faculty.employeeId || "",
        role: faculty.role || "staff",
      });
    }
  }, [faculty]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error(err);
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
      const token = localStorage.getItem("token");

      await updateStaff(
        faculty.staff_id,
        formData,
        token
      );

      alert("Faculty updated successfully.");

      onSuccess();
      onClose();

    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen || !faculty) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

      <div className="bg-white rounded-xl w-full max-w-lg p-6">

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold">
            Edit Faculty
          </h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        <div className="space-y-4">

          <input
            className="w-full border p-3 rounded-lg"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Faculty Name"
          />

          <input
            className="w-full border p-3 rounded-lg"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
          />

          <input
            className="w-full border p-3 rounded-lg"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone number"
          />

          <select
            className="w-full border p-3 rounded-lg"
            name="department"
            value={formData.department}
            onChange={handleChange}
          >
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
            className="w-full border p-3 rounded-lg"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            placeholder="Designation"
          />

          <input
            className="w-full border p-3 rounded-lg"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            placeholder="Employee ID"
          />

          {allowRoleEdit && <select
            className="w-full border p-3 rounded-lg"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="staff">Faculty</option>
            <option value="admin">Administrator</option>
          </select>}

        </div>

        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleUpdate}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            Update Faculty
          </button>

        </div>

      </div>

    </div>
  );
};

export default EditFacultyModal;
