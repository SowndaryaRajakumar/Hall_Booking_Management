import React, { useState, useEffect, useCallback } from "react";
import {
  Building,
  Plus,
  Search,
  Pencil,
  Check,
  X,
  Users,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  MessageSquare,
  History,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import Pagination from "../../components/Pagination";
import {
  getMasterVenues,
  createMasterVenue,
  updateMasterVenue,
  getVenueAccessRules,
  updateVenueAccessRules,
} from "../../api/masterAdminApi";
import { getVenueFeedbackHistory } from "../../api/venueFeedbackApi";
import { getDepartments } from "../../api/departmentApi";

const CommonVenueManagement = () => {
  const [venues, setVenues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("COMMON"); // 'ALL', 'COMMON', 'DEPARTMENT'
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [venueHistoryData, setVenueHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedVenue, setSelectedVenue] = useState(null);
  const [accessList, setAccessList] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const openVenueHistoryModal = async (venue) => {
    setSelectedVenue(venue);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await getVenueFeedbackHistory(venue.HallID);
      setVenueHistoryData(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const [formData, setFormData] = useState({
    hallName: "",
    location: "",
    capacity: "",
    deptId: "",
    venueType: "Auditorium",
    ownershipType: "COMMON",
    category: "Auditorium",
    approvalRole: "MASTER_ADMIN",
  });

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search,
      };
      if (activeTab !== "ALL") {
        params.ownershipType = activeTab;
      }
      const [venuesRes, deptsRes] = await Promise.all([
        getMasterVenues(params),
        getDepartments({ limit: 100 }),
      ]);
      setVenues(venuesRes.data || []);
      setPagination(venuesRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setDepartments(deptsRes || []);
    } catch (err) {
      showToast(err.message || "Failed to load venues", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, activeTab]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  // Handle Create Venue
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMasterVenue(formData);
      showToast("Venue registered successfully!");
      setShowAddModal(false);
      loadVenues();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Edit Venue
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateMasterVenue(selectedVenue.HallID, formData);
      showToast("Venue details updated!");
      setShowEditModal(false);
      loadVenues();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Open Access Control Modal
  const openAccessModal = async (venue) => {
    setSelectedVenue(venue);
    try {
      const res = await getVenueAccessRules(venue.HallID);
      setAccessList(res.accessList || []);
      setShowAccessModal(true);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Toggle department in access modal
  const handleToggleDeptAccess = (deptId) => {
    setAccessList((prev) =>
      prev.map((item) =>
        item.departmentId === deptId ? { ...item, allowed: !item.allowed } : item
      )
    );
  };

  // Save Department Access Matrix
  const handleSaveAccessRules = async () => {
    setAccessSaving(true);
    try {
      const allowedIds = accessList.filter((item) => item.allowed).map((item) => item.departmentId);
      await updateVenueAccessRules(selectedVenue.HallID, allowedIds);
      showToast("Department access rules saved successfully!");
      setShowAccessModal(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAccessSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Toast */}
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
                <Building size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Venue Classification & Access Control
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Configure Common Venues (Auditoriums, Conference Halls) and Department Venues. Control department visibility and approval authorities.
            </p>
          </div>

          <button
            onClick={() => {
              setFormData({
                hallName: "",
                location: "",
                capacity: "",
                deptId: departments[0]?.DeptID || 1,
                venueType: "Auditorium",
                ownershipType: "COMMON",
                category: "Auditorium",
                approvalRole: "MASTER_ADMIN",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition cursor-pointer"
          >
            <Plus size={18} />
            Add Venue
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          {[
            { id: "COMMON", label: "Common Venues (College-Wide)" },
            { id: "DEPARTMENT", label: "Department Venues" },
            { id: "ALL", label: "All Venues" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search venue by name, location, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none text-gray-800"
          />
        </div>

        {/* Venues Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="py-4 px-6">Venue Name</th>
                  <th className="py-4 px-6">Classification</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Capacity</th>
                  <th className="py-4 px-6">Approval Role</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      Loading venues...
                    </td>
                  </tr>
                ) : venues.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      No venues found under this category.
                    </td>
                  </tr>
                ) : (
                  venues.map((venue) => (
                    <tr key={venue.HallID} className="hover:bg-gray-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{venue.HallName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{venue.VenueType || "General Venue"}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            venue.ownership_type === "COMMON"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Layers size={12} />
                          {venue.ownership_type === "COMMON" ? "COMMON VENUE" : "DEPARTMENT VENUE"}
                        </span>
                        {venue.ownership_type === "DEPARTMENT" && venue.DeptName && (
                          <div className="text-[11px] text-gray-400 mt-1 font-medium">{venue.DeptName}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{venue.Location}</td>
                      <td className="py-4 px-6 font-medium text-gray-800">{venue.Capacity} seats</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          <Shield size={12} />
                          {venue.approval_role === "MASTER_ADMIN" ? "Master Admin" : "Dept Admin"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Feedback & Complaint History */}
                          <button
                            onClick={() => openVenueHistoryModal(venue)}
                            title="Venue Complaint & Feedback History"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            Issues & Feedback
                          </button>

                          {/* Access Rules for Common Venues */}
                          {venue.ownership_type === "COMMON" && (
                            <button
                              onClick={() => openAccessModal(venue)}
                              title="Department Access Matrix"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                            >
                              <SlidersHorizontal size={13} />
                              Access Matrix
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            title="Edit Venue"
                            onClick={() => {
                              setSelectedVenue(venue);
                              setFormData({
                                hallName: venue.HallName,
                                location: venue.Location,
                                capacity: venue.Capacity,
                                deptId: venue.DeptID || 1,
                                venueType: venue.VenueType || "Auditorium",
                                ownershipType: venue.ownership_type || "COMMON",
                                category: venue.category || venue.VenueType || "Auditorium",
                                approvalRole: venue.approval_role || "MASTER_ADMIN",
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Pencil size={16} />
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
        {/* ADD VENUE MODAL */}
        {/* ============================================================ */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={18} className="text-blue-600" />
                  Register New Venue
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Venue Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.hallName}
                    onChange={(e) => setFormData({ ...formData, hallName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Main Auditorium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ownership Type *</label>
                    <select
                      value={formData.ownershipType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ownershipType: e.target.value,
                          approvalRole: e.target.value === "COMMON" ? "MASTER_ADMIN" : "DEPARTMENT_ADMIN",
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                    >
                      <option value="COMMON">COMMON (College-Wide)</option>
                      <option value="DEPARTMENT">DEPARTMENT (Branch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Approval Authority *</label>
                    <select
                      value={formData.approvalRole}
                      onChange={(e) => setFormData({ ...formData, approvalRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="MASTER_ADMIN">Master Admin Approval</option>
                      <option value="DEPARTMENT_ADMIN">Department Admin Approval</option>
                    </select>
                  </div>
                </div>

                {formData.ownershipType === "DEPARTMENT" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department</label>
                    <select
                      value={formData.deptId}
                      onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept.DeptID} value={dept.DeptID}>
                          {dept.DeptName} ({dept.DeptCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Venue Type / Category</label>
                    <input
                      type="text"
                      value={formData.venueType}
                      onChange={(e) => setFormData({ ...formData, venueType: e.target.value, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Auditorium / Lab"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Seating Capacity *</label>
                    <input
                      type="number"
                      required
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. 500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Main Block, 2nd Floor"
                  />
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
                    Register Venue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EDIT VENUE MODAL */}
        {/* ============================================================ */}
        {showEditModal && selectedVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Pencil size={18} className="text-blue-600" />
                  Edit Venue Details
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Venue Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.hallName}
                    onChange={(e) => setFormData({ ...formData, hallName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ownership Type</label>
                    <select
                      value={formData.ownershipType}
                      onChange={(e) => setFormData({ ...formData, ownershipType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                    >
                      <option value="COMMON">COMMON (College-Wide)</option>
                      <option value="DEPARTMENT">DEPARTMENT (Branch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Approval Authority</label>
                    <select
                      value={formData.approvalRole}
                      onChange={(e) => setFormData({ ...formData, approvalRole: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="MASTER_ADMIN">Master Admin Approval</option>
                      <option value="DEPARTMENT_ADMIN">Department Admin Approval</option>
                    </select>
                  </div>
                </div>

                {formData.ownershipType === "DEPARTMENT" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department</label>
                    <select
                      value={formData.deptId}
                      onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept.DeptID} value={dept.DeptID}>
                          {dept.DeptName} ({dept.DeptCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity</label>
                    <input
                      type="number"
                      required
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
        {/* DEPARTMENT ACCESS MATRIX MODAL */}
        {/* ============================================================ */}
        {showAccessModal && selectedVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-purple-600" />
                    Department Access Rules
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select which departments are allowed to view and book <strong>{selectedVenue.HallName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setShowAccessModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
                {accessList.map((item) => (
                  <label
                    key={item.departmentId}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <div>
                      <span className="font-semibold text-sm text-gray-800">{item.departmentName}</span>
                      <span className="text-xs text-gray-400 ml-2 font-mono">({item.departmentCode})</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={item.allowed}
                      onChange={() => handleToggleDeptAccess(item.departmentId)}
                      className="w-5 h-5 text-purple-600 rounded-md border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {accessList.filter((a) => a.allowed).length} of {accessList.length} departments allowed
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAccessModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAccessRules}
                    disabled={accessSaving}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    {accessSaving ? "Saving..." : "Save Access Rules"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Venue Complaint & Feedback History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded">
                    Facility Quality & Maintenance History
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">
                    {selectedVenue?.HallName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedVenue?.Location} • {selectedVenue?.Capacity} seats • {selectedVenue?.VenueType}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-16 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent" />
                  <p className="mt-2 text-xs text-gray-500 font-medium">Loading venue issue history...</p>
                </div>
              ) : venueHistoryData ? (
                <div className="space-y-4">
                  {/* Summary Counters */}
                  <div className="grid grid-cols-4 gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Total Issues</span>
                      <div className="text-xl font-black text-gray-900">
                        {venueHistoryData.summary?.total || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-red-600 uppercase">Open</span>
                      <div className="text-xl font-black text-red-600">
                        {venueHistoryData.summary?.open || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase">In Progress</span>
                      <div className="text-xl font-black text-amber-600">
                        {venueHistoryData.summary?.inProgress || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Resolved</span>
                      <div className="text-xl font-black text-emerald-600">
                        {venueHistoryData.summary?.resolved || 0}
                      </div>
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(venueHistoryData.items || []).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">
                        No recorded complaints or feedback for this venue.
                      </p>
                    ) : (
                      venueHistoryData.items.map((it) => (
                        <div
                          key={it.id}
                          className="p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{it.subject}</span>
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                it.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : it.status === "OPEN"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {it.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600">{it.description}</p>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                            <span>
                              By: <strong>{it.submitter_name}</strong> on{" "}
                              {new Date(it.created_at).toLocaleDateString()}
                            </span>
                            <span className="font-semibold text-gray-600">{it.type}</span>
                          </div>

                          {it.resolution && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-100 mt-1">
                              <strong>Resolution:</strong> {it.resolution}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="pt-4 border-t border-gray-100 mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CommonVenueManagement;
