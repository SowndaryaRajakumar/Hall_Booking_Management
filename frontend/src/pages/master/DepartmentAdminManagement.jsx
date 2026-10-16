import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  KeyRound,
  Pencil,
  Lock,
  Power,
  Building2,
  Mail,
  Phone,
  User,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import Pagination from "../../components/Pagination";
import {
  getDepartmentAdmins,
  createDepartmentAdmin,
  updateDepartmentAdmin,
  toggleAdminStatus,
  resetAdminPassword,
  getAdminPermissions,
  updateAdminPermissions,
} from "../../api/masterAdminApi";
import { getDepartments } from "../../api/departmentApi";

const DepartmentAdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [permSaving, setPermSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    departmentId: "",
    phone: "",
    designation: "",
    employeeId: "",
  });
  const [newPassword, setNewPassword] = useState("");

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminsRes, deptsRes] = await Promise.all([
        getDepartmentAdmins({ page: currentPage, limit: 10, search }),
        getDepartments({ limit: 100 }),
      ]);
      setAdmins(adminsRes.data || []);
      setPagination(adminsRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setDepartments(deptsRes || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Admin
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createDepartmentAdmin(formData);
      showToast("Department Admin created successfully!");
      setShowAddModal(false);
      setFormData({
        fullName: "",
        email: "",
        password: "",
        departmentId: "",
        phone: "",
        designation: "",
        employeeId: "",
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Edit Admin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDepartmentAdmin(selectedAdmin.staff_id, formData);
      showToast("Department Admin details updated!");
      setShowEditModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (admin) => {
    const isActivating = admin.status !== "active";
    const confirmed = window.confirm(
      `Are you sure you want to ${isActivating ? "activate" : "deactivate"} ${admin.full_name}?`
    );
    if (!confirmed) return;

    try {
      await toggleAdminStatus(admin.staff_id);
      showToast(`Admin account has been ${isActivating ? "activated" : "deactivated"}.`);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    try {
      await resetAdminPassword(selectedAdmin.staff_id, newPassword);
      showToast("Password reset successfully!");
      setShowResetModal(false);
      setNewPassword("");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Open Permissions Modal
  const openPermissionsModal = async (admin) => {
    setSelectedAdmin(admin);
    try {
      const res = await getAdminPermissions(admin.staff_id);
      setAdminPermissions(res.permissions || []);
      setShowPermModal(true);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Toggle single permission switch in modal
  const handleTogglePermission = (permId) => {
    setAdminPermissions((prev) =>
      prev.map((p) => (p.id === permId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    setPermSaving(true);
    try {
      await updateAdminPermissions(selectedAdmin.staff_id, adminPermissions);
      showToast("Permissions updated successfully!");
      setShowPermModal(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPermSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
              notification.type === "error"
                ? "bg-red-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {notification.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                <ShieldCheck size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Department Admin Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Oversee departmental administrators, assign branches, customize permissions, and manage access.
            </p>
          </div>

          <button
            onClick={() => {
              setFormData({
                fullName: "",
                email: "",
                password: "",
                departmentId: departments[0]?.DeptID || "",
                phone: "",
                designation: "Department Admin",
                employeeId: "",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition cursor-pointer"
          >
            <Plus size={18} />
            Add Department Admin
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search department admin by name, email, department, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none text-gray-800"
          />
        </div>

        {/* Admins Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="py-4 px-6">Admin Name</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Designation</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      Loading department administrators...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      No Department Admins found. Click "Add Department Admin" to create one.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.staff_id} className="hover:bg-gray-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{admin.full_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail size={12} />
                          {admin.email}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          <Building2 size={12} />
                          {admin.DeptName || admin.department}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {admin.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone size={13} className="text-gray-400" />
                            {admin.phone}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{admin.designation || "Department Admin"}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              admin.status === "active" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {admin.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <button
                            title="View Details"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit */}
                          <button
                            title="Edit Profile"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setFormData({
                                fullName: admin.full_name,
                                email: admin.email,
                                departmentId: admin.department_id || "",
                                phone: admin.phone || "",
                                designation: admin.designation || "",
                                employeeId: admin.employee_id || "",
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Permissions */}
                          <button
                            title="Manage Permissions & Access"
                            onClick={() => openPermissionsModal(admin)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          >
                            <KeyRound size={16} />
                          </button>

                          {/* Reset Password */}
                          <button
                            title="Reset Password"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setNewPassword("");
                              setShowResetModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                          >
                            <Lock size={16} />
                          </button>

                          {/* Status toggle */}
                          <button
                            title={admin.status === "active" ? "Deactivate Admin" : "Activate Admin"}
                            onClick={() => handleToggleStatus(admin)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              admin.status === "active"
                                ? "text-gray-500 hover:text-red-600 hover:bg-red-50"
                                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* ADD DEPARTMENT ADMIN MODAL */}
        {/* ============================================================ */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={18} className="text-blue-600" />
                  Add Department Administrator
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Dr. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. cseadmin@nec.edu.in"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department *</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.DeptID} value={dept.DeptID}>
                        {dept.DeptName} ({dept.DeptCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Designation</label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. HOD / Dept Head"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer"
                  >
                    Create Administrator
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EDIT DEPARTMENT ADMIN MODAL */}
        {/* ============================================================ */}
        {showEditModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Pencil size={18} className="text-blue-600" />
                  Edit Department Administrator
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept.DeptID} value={dept.DeptID}>
                        {dept.DeptName} ({dept.DeptCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Designation</label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PERMISSIONS & ACCESS CONTROL MODAL */}
        {/* ============================================================ */}
        {showPermModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <KeyRound size={18} className="text-amber-500" />
                    Permission Controls: {selectedAdmin.full_name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Department: {selectedAdmin.DeptName || selectedAdmin.department} • Configure granular module privileges
                  </p>
                </div>
                <button
                  onClick={() => setShowPermModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Permission toggle list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {adminPermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition"
                  >
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800">{perm.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {perm.key}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(perm.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        perm.enabled ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          perm.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {adminPermissions.filter((p) => p.enabled).length} of {adminPermissions.length} permissions enabled
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPermModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={permSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    {permSaving ? "Saving..." : "Save Permissions"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* RESET PASSWORD MODAL */}
        {/* ============================================================ */}
        {showResetModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Lock size={18} className="text-purple-600" />
                  Reset Admin Password
                </h3>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Enter a new password for <strong>{selectedAdmin.full_name}</strong> ({selectedAdmin.email}).
              </p>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW DETAILS MODAL */}
        {/* ============================================================ */}
        {showViewModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <User size={18} className="text-blue-600" />
                  Administrator Profile
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Full Name</span>
                  <span className="font-semibold text-gray-800">{selectedAdmin.full_name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Email Address</span>
                  <span className="text-gray-700">{selectedAdmin.email}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Department</span>
                  <span className="text-blue-700 font-medium">
                    {selectedAdmin.DeptName || selectedAdmin.department}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Designation</span>
                  <span className="text-gray-700">{selectedAdmin.designation || "Department Admin"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Phone</span>
                  <span className="text-gray-700">{selectedAdmin.phone || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Status</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                      selectedAdmin.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {selectedAdmin.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DepartmentAdminManagement;
