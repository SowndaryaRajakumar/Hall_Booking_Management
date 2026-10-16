import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Pencil,
  Trash2
} from "lucide-react";

import AdminLayout from "../../layouts/AdminLayout";
import {
  getAllStaff,
  deleteStaff,
} from "../../api/staffApi";

import AddFacultyModal from "./AddFacultyModal";
import EditFacultyModal from "./EditFacultyModal";
import Pagination from "../../components/Pagination";

const FacultyManagement = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedFaculty, setSelectedFaculty] = useState(null);

  useEffect(() => { loadStaff(); }, [search, currentPage]);

  const loadStaff = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await getAllStaff(token, { page: currentPage, limit: 10, search });
      setStaff(response.data);
      setPagination(response.pagination || pagination);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStaff = staff;

  const handleDelete = async (faculty) => {
    // Prevent deleting logged-in admin
    if (faculty.email === localStorage.getItem("email")) {
      alert("You cannot delete your own account.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${faculty.full_name}"?`
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      await deleteStaff(faculty.staff_id, token);

      alert("Faculty deleted successfully!");

      loadStaff();

    } catch (err) {
      alert(err.message || "Failed to delete faculty.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 min-w-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">

          <h1 className="page-title text-2xl sm:text-3xl font-bold text-gray-800 break-words min-w-0">
            {t("nav.facultyManagement", "Faculty Management")}
          </h1>

          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition font-medium cursor-pointer"
          >
            <Plus size={18} />
            {t("faculty.addFaculty", "Add Faculty")}
          </button>

        </div>

        {/* Search */}
        <div className="relative mb-6">

          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />

          <input
            type="text"
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-10 w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />

        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left font-semibold">ID</th>
                <th className="p-4 text-left font-semibold">Faculty Name</th>
                <th className="p-4 text-left font-semibold">Email</th>
                <th className="p-4 text-left font-semibold">Department</th>
                <th className="p-4 text-left font-semibold">Designation</th>
                <th className="p-4 text-left font-semibold">Employee ID</th>
                <th className="p-4 text-left font-semibold">Role</th>
                <th className="p-4 text-left font-semibold">Status</th>
                <th className="p-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredStaff.length > 0 ? (

                filteredStaff.map((faculty) => (

                  <tr
                    key={faculty.staff_id}
                    className="border-b hover:bg-gray-50 transition"
                  >

                    <td className="p-4">
                      {faculty.staff_id}
                    </td>

                    <td className="p-4 font-medium">
                      {faculty.full_name}
                    </td>

                    <td className="p-4">
                      {faculty.email}
                    </td>

                    <td className="p-4">
                      {faculty.department}
                    </td>

                    <td className="p-4">
                      {faculty.designation || "Not provided"}
                    </td>

                    <td className="p-4">
                      {faculty.employee_id || "Not provided"}
                    </td>

                    <td className="p-4">

                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Faculty</span>

                    </td>

                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        🟢 Active
                      </span>
                    </td>

                    <td className="p-4">

                      <div className="flex justify-center gap-4">

                        <button
                          onClick={() => {
                            setSelectedFaculty(faculty);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Faculty"
                        >
                          <Pencil size={20} />
                        </button>

                        <button
                          onClick={() => handleDelete(faculty)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Faculty"
                        >
                          <Trash2 size={20} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan="9"
                    className="text-center py-8 text-gray-500"
                  >
                    No faculty found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />

        </div>

        {/* Add Faculty */}
        <AddFacultyModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={loadStaff}
        />

        {/* Edit Faculty */}
        <EditFacultyModal
          isOpen={showEditModal}
          faculty={selectedFaculty}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadStaff}
        />

      </div>
    </AdminLayout>
  );
};

export default FacultyManagement;
