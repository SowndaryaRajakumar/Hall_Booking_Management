import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Building2,
  Users,
  Shield,
  History,
  Check,
  X,
  Building,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";

import AdminLayout from "../../layouts/AdminLayout";
import { deleteHall, getAllHalls } from "../../api/hallApi";
import { getDepartments } from "../../api/departmentApi";
import {
  getVenueAccessRules,
  updateVenueAccessRules,
} from "../../api/masterAdminApi";
import { getVenueFeedbackHistory } from "../../api/venueFeedbackApi";

import AddVenueModal from "./AddVenueModal";
import AddCommonVenueModal from "./AddCommonVenueModal";
import EditVenueModal from "./EditVenueModal";
import Pagination from "../../components/Pagination";
import MasterDataManager from "./MasterDataManager";
import {
  createDepartment,
  createVenueType,
  deleteDepartment,
  deleteVenueType,
  getAdminDepartments,
  getAdminVenueTypes,
  updateDepartment,
  updateVenueType,
  createVenueFacility,
  deleteVenueFacility,
  getAdminVenueFacilities,
  updateVenueFacility,
} from "../../api/masterDataApi";

const VenueManagement = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role resolution
  const rawRole = localStorage.getItem("role") || "";
  const isMasterAdmin = ["MASTER_ADMIN", "superadmin", "ADMIN"].includes(rawRole);
  const userDept = localStorage.getItem("department") || "";

  // Active Tab: 'ALL' | 'COMMON' | 'DEPARTMENT'
  const initialTab = searchParams.get("type")?.toUpperCase() || "ALL";
  const [activeTab, setActiveTab] = useState(
    ["ALL", "COMMON", "DEPARTMENT"].includes(initialTab) ? initialTab : "ALL"
  );

  const [venues, setVenues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCommonModal, setShowAddCommonModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [masterDataView, setMasterDataView] = useState("");

  // Access Rules Modal for Common Venues
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessVenue, setAccessVenue] = useState(null);
  const [accessList, setAccessList] = useState([]);
  const [accessSaving, setAccessSaving] = useState(false);

  // Venue History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyVenue, setHistoryVenue] = useState(null);
  const [venueHistoryData, setVenueHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync tab change with search params
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === "ALL") {
      searchParams.delete("type");
    } else {
      searchParams.set("type", tab);
    }
    setSearchParams(searchParams);
  };

  // Load Departments on mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await getDepartments({ limit: 100 });
        setDepartments(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    };
    fetchDepts();
  }, []);

  const normalizeVenue = (venue) => ({
    hallId: venue.hallId ?? venue.HallID ?? venue.id,
    hallName: venue.hallName ?? venue.HallName ?? venue.name ?? "",
    department: venue.department ?? venue.DeptName ?? "",
    deptId: venue.deptId ?? venue.DeptID ?? "",
    ownershipType: venue.ownershipType ?? venue.ownership_type ?? "DEPARTMENT",
    location: venue.location ?? venue.Location ?? "",
    capacity: venue.capacity ?? venue.Capacity ?? "",
    numberOfSystems: venue.numberOfSystems ?? venue.NumberOfSystems ?? 0,
    venueType: venue.venueType ?? venue.VenueType ?? "",
    hasProjector: Boolean(venue.hasProjector ?? venue.HasProjector),
    hasSmartBoard: Boolean(venue.hasSmartBoard ?? venue.HasSmartBoard),
    hasWiFi: Boolean(venue.hasWiFi ?? venue.HasWiFi),
    hasSpeaker: Boolean(venue.hasSpeaker ?? venue.HasSpeaker),
    hasPodium: Boolean(venue.hasPodium ?? venue.HasPodium),
    hasWhiteBoard: Boolean(venue.hasWhiteBoard ?? venue.HasWhiteBoard),
    hasCCTV: Boolean(venue.hasCCTV ?? venue.HasCCTV),
    hasAC: Boolean(venue.hasAC ?? venue.HasAC),
    microphoneType: venue.microphoneType ?? venue.MicrophoneType ?? "None",
    additionalFeatures: venue.additionalFeatures ?? venue.AdditionalFeatures ?? "",
    image: venue.image ?? venue.ImageURL ?? null,
    activeStatus: Boolean(venue.activeStatus ?? venue.ActiveStatus ?? true),
    facilities: venue.facilities || [],
  });

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search,
        status: statusFilter,
      };
      if (activeTab === "COMMON") {
        params.ownershipType = "COMMON";
      } else if (activeTab === "DEPARTMENT") {
        params.ownershipType = "DEPARTMENT";
      }
      if (selectedDeptFilter !== "all" && activeTab !== "COMMON") {
        params.deptId = selectedDeptFilter;
      }
      const response = await getAllHalls(params);
      const normalizedVenues = (response.data || []).map(normalizeVenue);
      setVenues(normalizedVenues);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error(error);
      showToast("Unable to load venues. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, selectedDeptFilter, activeTab]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  // Tab Filtering (Frontend enforcement for instant responsiveness + server filtering)
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      if (activeTab === "COMMON") {
        return v.ownershipType === "COMMON";
      }
      if (activeTab === "DEPARTMENT") {
        return v.ownershipType === "DEPARTMENT";
      }
      return true;
    });
  }, [venues, activeTab]);

  const handleDeleteVenue = async (venue) => {
    // Dept Admin cannot delete Common Venues
    if (!isMasterAdmin && venue.ownershipType === "COMMON") {
      alert("Department Admins cannot delete Common Venues.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${venue.hallName} permanently?`
    );
    if (!confirmed) return;

    try {
      const response = await deleteHall(venue.hallId);
      if (response?.success) {
        showToast("Venue deleted successfully.");
        await loadVenues();
      } else {
        showToast(response?.message || "Failed to delete venue.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast(error.message || "Failed to delete venue.", "error");
    }
  };

  // Open Access Control Rules for Common Venue (Master Admin)
  const openAccessModal = async (venue) => {
    setAccessVenue(venue);
    setShowAccessModal(true);
    try {
      const data = await getVenueAccessRules(venue.hallId);
      setAccessList(data.rules || []);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleToggleAccess = (departmentId) => {
    setAccessList((prev) =>
      prev.map((item) =>
        item.department_id === departmentId
          ? { ...item, is_allowed: !item.is_allowed }
          : item
      )
    );
  };

  const handleSaveAccessRules = async () => {
    if (!accessVenue) return;
    setAccessSaving(true);
    try {
      const allowedDepartmentIds = accessList
        .filter((r) => r.is_allowed)
        .map((r) => r.department_id);

      await updateVenueAccessRules(accessVenue.hallId, allowedDepartmentIds);
      showToast("Access rules updated successfully!");
      setShowAccessModal(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAccessSaving(false);
    }
  };

  // Open Venue History Modal
  const openHistoryModal = async (venue) => {
    setHistoryVenue(venue);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await getVenueFeedbackHistory(venue.hallId);
      setVenueHistoryData(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <AdminLayout>
      <div className="venue-management ui-page p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
              toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "error" ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                {isMasterAdmin ? "Master Admin Operations" : "Department Operations"}
              </span>
              <span className="text-blue-300 text-sm">Consolidated Facility Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Venue Management
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {isMasterAdmin
                ? "Manage college-wide Common Venues (Auditoriums, Conference Halls) and Department-specific classrooms and laboratories."
                : `Manage ${userDept ? userDept + " " : ""}Department venues and view common campus facilities.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "COMMON" ? (
              isMasterAdmin && (
                <button
                  onClick={() => setShowAddCommonModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md transition active:scale-95"
                >
                  <Plus size={18} />
                  + Add Common Venue
                </button>
              )
            ) : activeTab === "DEPARTMENT" ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition active:scale-95"
              >
                <Plus size={18} />
                + Add Department Venue
              </button>
            ) : (
              <>
                {isMasterAdmin && (
                  <button
                    onClick={() => setShowAddCommonModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
                  >
                    <Plus size={16} />
                    + Add Common Venue
                  </button>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
                >
                  <Plus size={16} />
                  + Add Department Venue
                </button>
              </>
            )}
          </div>
        </div>

        {/* Unified Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => handleTabChange("ALL")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "ALL"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Venues
            </button>
            <button
              onClick={() => handleTabChange("COMMON")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "COMMON"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-purple-700"
              }`}
            >
              <span>🏛 Common Venues</span>
            </button>
            <button
              onClick={() => handleTabChange("DEPARTMENT")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "DEPARTMENT"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              <span>🏢 Department Venues</span>
            </button>
          </div>

          {/* Master Admin Sub-actions */}
          {isMasterAdmin && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMasterDataView(masterDataView === "departments" ? "" : "departments")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Manage Departments
              </button>
              <button
                type="button"
                onClick={() => setMasterDataView(masterDataView === "venueTypes" ? "" : "venueTypes")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Manage Venue Types
              </button>
              <button
                type="button"
                onClick={() => setMasterDataView(masterDataView === "facilities" ? "" : "facilities")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Manage Facilities
              </button>
            </div>
          )}
        </div>

        {/* Master Data Managers if toggled */}
        {masterDataView === "departments" && (
          <MasterDataManager
            title="Departments"
            loadItems={getAdminDepartments}
            createItem={createDepartment}
            updateItem={updateDepartment}
            deleteItem={deleteDepartment}
            getId={(item) => item.DeptID}
            getName={(item) => item.DeptName}
            isActive={(item) => Boolean(item.IsActive)}
          />
        )}
        {masterDataView === "venueTypes" && (
          <MasterDataManager
            title="Venue Types"
            loadItems={getAdminVenueTypes}
            createItem={createVenueType}
            updateItem={updateVenueType}
            deleteItem={deleteVenueType}
            getId={(item) => item.id}
            getName={(item) => item.name}
            isActive={(item) => Boolean(item.IsActive)}
          />
        )}
        {masterDataView === "facilities" && (
          <MasterDataManager
            title="Venue Facilities"
            loadItems={getAdminVenueFacilities}
            createItem={createVenueFacility}
            updateItem={updateVenueFacility}
            deleteItem={deleteVenueFacility}
            getId={(item) => item.id}
            getName={(item) => item.name}
            isActive={(item) => Boolean(item.IsActive)}
          />
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search venue name, location, type..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter (Only for Master Admin when showing Department or All venues) */}
            {isMasterAdmin && activeTab !== "COMMON" && (
              <select
                value={selectedDeptFilter}
                onChange={(e) => {
                  setSelectedDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.DeptID || d.id} value={d.DeptID || d.id}>
                    {d.DeptName || d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setStatusFilter("active");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === "active"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => {
                  setStatusFilter("inactive");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === "inactive"
                    ? "bg-white text-rose-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactive
              </button>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === "all"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Loading venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Building2 size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-base font-semibold text-slate-600">No venues found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === "COMMON"
                  ? "No Common Venues found. Click 'Add New Venue' to create a college auditorium or seminar hall."
                  : activeTab === "DEPARTMENT"
                  ? "No Department Venues found matching your current filter criteria."
                  : "No venues match the selected filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Venue Name</th>
                    <th className="py-3 px-4">Ownership</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Facilities</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredVenues.map((venue) => {
                    const isCommon = venue.ownershipType === "COMMON";
                    const canEdit = isMasterAdmin || !isCommon;

                    return (
                      <tr key={venue.hallId} className="hover:bg-slate-50/70 transition">
                        {/* Name */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <Building2 size={16} className={isCommon ? "text-purple-600" : "text-blue-600"} />
                            <span>{venue.hallName}</span>
                          </div>
                        </td>

                        {/* Ownership Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isCommon
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {isCommon ? "🏛 COMMON" : "🏢 DEPARTMENT"}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {isCommon ? (
                            <span className="text-slate-400 font-medium">Campus-wide Resource</span>
                          ) : (
                            venue.department || "N/A"
                          )}
                        </td>

                        {/* Venue Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                            {venue.venueType}
                          </span>
                        </td>

                        {/* Capacity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Users size={14} className="text-slate-400" />
                            <span>{venue.capacity} seats</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {venue.location}
                        </td>

                        {/* Facilities */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {(venue.facilities || []).slice(0, 3).map((f, i) => (
                              <span key={i} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                                {typeof f === "string" ? f : f.name}
                              </span>
                            ))}
                            {(venue.facilities || []).length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{(venue.facilities || []).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {venue.activeStatus ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Access Rules (For Common Venues & Master Admin) */}
                            {isMasterAdmin && isCommon && (
                              <button
                                onClick={() => openAccessModal(venue)}
                                title="Department Access Rules"
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                              >
                                <Shield size={16} />
                              </button>
                            )}

                            {/* History */}
                            <button
                              onClick={() => openHistoryModal(venue)}
                              title="Feedback & Complaint History"
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            >
                              <History size={16} />
                            </button>

                            {/* Edit / View */}
                            {canEdit ? (
                              <button
                                onClick={() => {
                                  setSelectedVenue(venue);
                                  setShowEditModal(true);
                                }}
                                title="Edit Venue"
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                              >
                                <Pencil size={16} />
                              </button>
                            ) : (
                              <span
                                title="Common Venues are managed by Master Admin"
                                className="text-[10px] text-slate-400 px-1 py-0.5 rounded bg-slate-50 border border-slate-200"
                              >
                                Read-only
                              </span>
                            )}

                            {/* Delete (Permitted roles only) */}
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteVenue(venue)}
                                title="Delete Venue"
                                className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* MODAL: ADD VENUE (DEPARTMENT) */}
        <AddVenueModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadVenues}
        />

        {/* MODAL: ADD COMMON VENUE (COLLEGE-WIDE) */}
        <AddCommonVenueModal
          isOpen={showAddCommonModal}
          onClose={() => setShowAddCommonModal(false)}
          onSuccess={loadVenues}
        />

        {/* MODAL: EDIT VENUE */}
        {showEditModal && selectedVenue && (
          <EditVenueModal
            isOpen={showEditModal}
            venue={selectedVenue}
            onClose={() => setShowEditModal(false)}
            onSuccess={loadVenues}
          />
        )}

        {/* MODAL: COMMON VENUE ACCESS RULES (Master Admin) */}
        {showAccessModal && accessVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    Access Permission Matrix
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {accessVenue.hallName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Configure which academic departments have booking access to this Common Venue.
              </p>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl mb-4">
                {accessList.map((rule) => (
                  <div
                    key={rule.department_id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">
                        {rule.department_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Code: {rule.department_code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAccess(rule.department_id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        rule.is_allowed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {rule.is_allowed ? <Check size={13} /> : <X size={13} />}
                      {rule.is_allowed ? "Allowed" : "Restricted"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={accessSaving}
                  onClick={handleSaveAccessRules}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {accessSaving ? "Saving..." : "Save Access Rules"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VENUE FEEDBACK HISTORY */}
        {showHistoryModal && historyVenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Facility Maintenance History
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {historyVenue.hallName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading feedback history...
                </div>
              ) : !venueHistoryData?.complaints?.length ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No issues or complaints logged for this venue.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
                  {venueHistoryData.complaints.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{c.subject}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{c.description}</p>
                      {c.resolution && (
                        <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                          <strong>Resolution:</strong> {c.resolution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
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

export default VenueManagement;
