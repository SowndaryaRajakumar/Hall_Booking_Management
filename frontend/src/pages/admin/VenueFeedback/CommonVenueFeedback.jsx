import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Search,
  Building,
  Check,
  X,
  AlertCircle,
  History,
  MessageSquare,
  Wrench,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  ArrowUpRight,
  Send,
  Mail,
  Smartphone,
  Bell,
  Eye,
} from "lucide-react";
import AdminLayout from "../../../layouts/AdminLayout";
import Pagination from "../../../components/Pagination";
import {
  getVenueFeedbackList,
  createVenueFeedback,
  updateVenueFeedbackStatus,
  getVenueFeedbackHistory,
  escalateVenueFeedback,
  notifySubmitter,
} from "../../../api/venueFeedbackApi";
import { getAllHalls } from "../../../api/hallApi";

const COMPLAINT_TYPES = [
  { value: "COMPLAINT", label: "Complaint", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "FEEDBACK", label: "General Feedback", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "FACILITY_ISSUE", label: "Facility Issue", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "CLEANLINESS", label: "Cleanliness", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "EQUIPMENT_ISSUE", label: "Equipment Issue", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "OTHER", label: "Other", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

const PRIORITIES = [
  { value: "CRITICAL", label: "Critical", badge: "bg-rose-600 text-white" },
  { value: "HIGH", label: "High", badge: "bg-orange-600 text-white" },
  { value: "MEDIUM", label: "Medium", badge: "bg-amber-500 text-white" },
  { value: "LOW", label: "Low", badge: "bg-blue-600 text-white" },
];

const STATUSES = [
  { value: "OPEN", label: "Open", color: "bg-red-100 text-red-800" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "ESCALATED", label: "Escalated", color: "bg-purple-100 text-purple-800" },
  { value: "RESOLVED", label: "Resolved", color: "bg-emerald-100 text-emerald-800" },
  { value: "CLOSED", label: "Closed", color: "bg-slate-100 text-slate-800" },
];

const CommonVenueFeedback = () => {
  // Role Detection
  const rawRole = localStorage.getItem("role") || "";
  const isMasterAdmin = ["MASTER_ADMIN", "superadmin", "ADMIN"].includes(rawRole);
  const userDept = localStorage.getItem("department") || "";

  const [feedbackList, setFeedbackList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [scopeFilter, setScopeFilter] = useState("all"); // 'all' | 'common' | 'department' | 'escalated'
  const [venueFilter, setVenueFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableVenues, setAvailableVenues] = useState([]);
  const [venueLoadError, setVenueLoadError] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [venueHistoryData, setVenueHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    venueId: "",
    type: "COMPLAINT",
    priority: "MEDIUM",
    subject: "",
    description: "",
    relatedBookingId: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const [statusForm, setStatusForm] = useState({
    status: "IN_PROGRESS",
    resolution: "",
    internalRemarks: "",
  });
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Escalation Form
  const [escalateForm, setEscalateForm] = useState({
    escalationReason: "",
    internalRemarks: "",
  });
  const [submittingEscalate, setSubmittingEscalate] = useState(false);

  // Submitter Notification Form
  const [notifyForm, setNotifyForm] = useState({
    channels: ["EMAIL", "WHATSAPP", "IN_APP"],
    customMessage: "",
  });
  const [sendingNotify, setSendingNotify] = useState(false);

  const showToastMsg = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Feedback List
  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
      };
      if (isMasterAdmin && scopeFilter !== "all") params.scope = scopeFilter;
      if (venueFilter !== "all") params.venueId = venueFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await getVenueFeedbackList(params);
      setFeedbackList(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, scopeFilter, venueFilter, typeFilter, priorityFilter, statusFilter, searchTerm, isMasterAdmin]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  // Load Available Venues
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setVenueLoadError(null);
        const res = await getAllHalls({ limit: 100 });
        const allHalls = (res.halls || res.data || []).map((h) => ({
          id: h.hallId ?? h.HallID ?? h.id,
          name: h.hallName ?? h.HallName ?? h.name ?? "",
          ownershipType: h.ownershipType ?? h.ownership_type ?? "DEPARTMENT",
          department: h.department ?? h.DeptName ?? "",
        }));

        if (!allHalls.length) {
          setVenueLoadError("Unable to load venues. Please try again.");
          return;
        }

        // For Master Admin on Common Feedback page, default to common venues or all venues
        // For Dept Admin, allHalls is already scoped by backend to their dept or permitted venues
        setAvailableVenues(allHalls);
        if (allHalls.length && !createForm.venueId) {
          setCreateForm((p) => ({ ...p, venueId: String(allHalls[0].id) }));
        }
      } catch (err) {
        console.error("Failed to load venues:", err);
        setVenueLoadError("Unable to load venues. Please try again.");
      }
    };
    fetchVenues();
  }, []);

  // Compute Metrics Summary
  const summaryMetrics = useMemo(() => {
    let total = pagination.total || feedbackList.length;
    let open = 0;
    let inProgress = 0;
    let escalated = 0;
    let resolved = 0;
    let critical = 0;

    feedbackList.forEach((item) => {
      if (item.status === "OPEN") open++;
      else if (item.status === "IN_PROGRESS") inProgress++;
      else if (item.status === "ESCALATED") escalated++;
      else if (item.status === "RESOLVED") resolved++;
      if (item.priority === "CRITICAL" || item.priority === "HIGH") critical++;
    });

    return { total, open, inProgress, escalated, resolved, critical };
  }, [feedbackList, pagination]);

  // Create Feedback Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.venueId) {
      showToastMsg("Please select a venue", "error");
      return;
    }
    setSubmittingCreate(true);
    try {
      await createVenueFeedback({
        venueId: Number(createForm.venueId),
        type: createForm.type,
        priority: createForm.priority,
        subject: createForm.subject.trim(),
        description: createForm.description.trim(),
        relatedBookingId: createForm.relatedBookingId ? Number(createForm.relatedBookingId) : null,
      });

      showToastMsg("Venue issue / feedback logged successfully!");
      setShowCreateModal(false);
      setCreateForm((p) => ({ ...p, subject: "", description: "", relatedBookingId: "" }));
      loadFeedback();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Status Update Modal
  const openStatusModal = (item) => {
    setSelectedItem(item);
    setStatusForm({
      status: item.status === "OPEN" ? "IN_PROGRESS" : item.status,
      resolution: item.resolution || "",
      internalRemarks: item.internal_remarks || "",
    });
    setShowStatusModal(true);
  };

  // Submit Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmittingStatus(true);
    try {
      await updateVenueFeedbackStatus(selectedItem.id, {
        status: statusForm.status,
        resolution: statusForm.resolution,
        internalRemarks: statusForm.internalRemarks,
      });

      showToastMsg(`Status updated to ${statusForm.status}!`);
      setShowStatusModal(false);
      loadFeedback();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Open Escalate Modal (Dept Admin -> Master Admin)
  const openEscalateModal = (item) => {
    setSelectedItem(item);
    setEscalateForm({
      escalationReason: "",
      internalRemarks: item.internal_remarks || "",
    });
    setShowEscalateModal(true);
  };

  // Submit Escalation
  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!escalateForm.escalationReason.trim()) {
      showToastMsg("Please provide an escalation reason", "error");
      return;
    }
    setSubmittingEscalate(true);
    try {
      await escalateVenueFeedback(selectedItem.id, {
        escalationReason: escalateForm.escalationReason.trim(),
        internalRemarks: escalateForm.internalRemarks.trim(),
      });

      showToastMsg("Issue escalated to Master Admin successfully!");
      setShowEscalateModal(false);
      loadFeedback();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSubmittingEscalate(false);
    }
  };

  // Open Submitter Notification Modal (Master Admin)
  const openNotifyModal = (item) => {
    setSelectedItem(item);
    setNotifyForm({
      channels: ["EMAIL", "WHATSAPP", "IN_APP"],
      customMessage: item.resolution
        ? `Your feedback for ${item.venue_name} has been resolved: ${item.resolution}`
        : `Update regarding your ticket for ${item.venue_name}. Status: ${item.status}.`,
    });
    setShowNotifyModal(true);
  };

  // Send Submitter Notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSendingNotify(true);
    try {
      await notifySubmitter(selectedItem.id, {
        channels: notifyForm.channels,
        customMessage: notifyForm.customMessage,
      });
      showToastMsg("Submitter update dispatched via existing Email / WhatsApp / In-App channels!");
      setShowNotifyModal(false);
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSendingNotify(false);
    }
  };

  // Open Venue History
  const openVenueHistory = async (venueId, venueName) => {
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const history = await getVenueFeedbackHistory(venueId);
      setVenueHistoryData({ ...history, venueName, venueId });
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                {isMasterAdmin ? "Master Admin Operations" : "Department Administration"}
              </span>
              <span className="text-blue-300 text-sm">
                {isMasterAdmin ? "Campus-wide Issue Tracking" : `${userDept || "Department"} Issue Desk`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              {isMasterAdmin ? "Venue Feedback & Complaints" : "Department Venue Feedback & Issues"}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {isMasterAdmin
                ? "Manage complaints, defect reports, and maintenance requests across common campus venues and departmental issues escalated by Department Admins."
                : `Manage maintenance issues, equipment requests, and faculty feedback for ${userDept ? userDept + " " : ""}department venues. Escalate major infrastructure issues to Master Admin.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              <Plus size={18} />
              Log Venue Issue
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Logged
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">{summaryMetrics.total}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Venues monitored</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs bg-rose-50/20">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
              Open Issues
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">{summaryMetrics.open}</div>
            <span className="text-[11px] text-rose-500 mt-0.5 block">Pending inspection</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs bg-purple-50/20">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
              Escalated
            </span>
            <div className="text-2xl font-black text-purple-600 mt-1">{summaryMetrics.escalated}</div>
            <span className="text-[11px] text-purple-500 mt-0.5 block">{isMasterAdmin ? "Awaiting Central Review" : "Forwarded for Central Review"}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs bg-amber-50/20">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{summaryMetrics.inProgress}</div>
            <span className="text-[11px] text-amber-500 mt-0.5 block">Under repair</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs bg-emerald-50/20">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Resolved
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summaryMetrics.resolved}</div>
            <span className="text-[11px] text-emerald-500 mt-0.5 block">Ready for usage</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, description, venue, submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Master Admin Scope Tabs */}
              {isMasterAdmin && (
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-purple-50 text-purple-900"
                >
                  <option value="all">Scope: All Issues</option>
                  <option value="common">Common Venues Only</option>
                  <option value="escalated">Escalated from Depts</option>
                  <option value="department">Department Venues</option>
                </select>
              )}

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
              >
                <option value="all">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Category Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
              >
                <option value="all">All Categories</option>
                {COMPLAINT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Loading venue feedback records...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle size={40} className="mx-auto mb-2 opacity-40 text-emerald-500" />
              <p className="text-base font-semibold text-slate-700">No issues or complaints found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No active complaints match your current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Ticket & Subject</th>
                    <th className="py-3 px-4">Venue & Ownership</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitter</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {feedbackList.map((item) => {
                    const isCommon = item.ownership_type === "COMMON";
                    const isEscalated = item.status === "ESCALATED";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        {/* Subject */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{item.subject}</div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                          {isEscalated && (
                            <div className="text-[10px] text-purple-700 font-bold mt-1 flex items-center gap-1">
                              <ShieldAlert size={11} /> Escalated: {item.escalation_reason || "Escalated to Master Admin"}
                            </div>
                          )}
                        </td>

                        {/* Venue */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{item.venue_name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isCommon ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isCommon ? "🏛 Common" : "🏢 Dept"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.department_name || item.venue_location}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.type}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.priority === "CRITICAL"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : item.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "OPEN"
                                ? "bg-rose-100 text-rose-800"
                                : item.status === "IN_PROGRESS"
                                ? "bg-amber-100 text-amber-800"
                                : item.status === "ESCALATED"
                                ? "bg-purple-100 text-purple-800"
                                : item.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Submitter */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{item.submitter_name}</div>
                          <div className="text-[10px] text-slate-400">{item.submitter_role}</div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Update Status / Resolution */}
                            <button
                              onClick={() => openStatusModal(item)}
                              title="Update Status / Resolution"
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition border border-blue-200"
                            >
                              Update Status
                            </button>

                            {/* Escalate to Master Admin (For Dept Admin on open issues) */}
                            {!isMasterAdmin && (item.status === "OPEN" || item.status === "IN_PROGRESS") && (
                              <button
                                onClick={() => openEscalateModal(item)}
                                title="Escalate to Master Admin"
                                className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg transition border border-purple-200 flex items-center gap-1"
                              >
                                <ArrowUpRight size={13} />
                                Escalate
                              </button>
                            )}

                            {/* Send Submitter Update (Master Admin) */}
                            {isMasterAdmin && (
                              <button
                                onClick={() => openNotifyModal(item)}
                                title="Notify Submitter (Email / WhatsApp / In-App)"
                                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                              >
                                <Send size={15} className="text-emerald-600" />
                              </button>
                            )}

                            {/* Venue History */}
                            <button
                              onClick={() => openVenueHistory(item.venue_id, item.venue_name)}
                              title="Venue Feedback History"
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                            >
                              <History size={15} />
                            </button>
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

        {/* MODAL 1: CREATE VENUE ISSUE */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Log Venue Issue / Feedback</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {venueLoadError && (
                <div className="p-3 mb-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                  {venueLoadError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Venue *
                    </label>
                    <select
                      required
                      value={createForm.venueId}
                      onChange={(e) => setCreateForm({ ...createForm, venueId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      {availableVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.ownershipType === "COMMON" ? "Common Venue" : "Dept Venue"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {COMPLAINT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Related Booking ID (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1024"
                      value={createForm.relatedBookingId}
                      onChange={(e) => setCreateForm({ ...createForm, relatedBookingId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Projector audio feedback humming in Auditorium"
                    value={createForm.subject}
                    onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the defect, damaged equipment, or required maintenance work..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {submittingCreate ? "Submitting..." : "Submit Venue Issue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: UPDATE STATUS & RESOLUTION */}
        {showStatusModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Issue Resolution & Tracking
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedItem.subject}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3 space-y-1">
                <div><strong>Venue:</strong> {selectedItem.venue_name} ({selectedItem.ownership_type === "COMMON" ? "Common Venue" : "Dept Venue"})</div>
                <div><strong>Description:</strong> {selectedItem.description}</div>
                <div><strong>Submitted by:</strong> {selectedItem.submitter_name} ({selectedItem.submitter_email})</div>
                {selectedItem.status === "ESCALATED" && (
                  <div className="text-purple-800 font-bold">
                    Escalated: {selectedItem.escalation_reason}
                  </div>
                )}
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Progress Status *
                  </label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resolution Notes (Visible to submitter)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Technician repaired the HDMI audio connection and tested playback successfully."
                    value={statusForm.resolution}
                    onChange={(e) => setStatusForm({ ...statusForm, resolution: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Administrative Remarks (Private)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Work order #491 assigned to campus electrical team"
                    value={statusForm.internalRemarks}
                    onChange={(e) => setStatusForm({ ...statusForm, internalRemarks: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStatus}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {submittingStatus ? "Saving..." : "Save Status & Resolution"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: ESCALATE TO MASTER ADMIN (Dept Admin) */}
        {showEscalateModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    Department Admin Escalation
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Escalate to Master Admin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs mb-3 space-y-1">
                <div><strong>Venue:</strong> {selectedItem.venue_name}</div>
                <div><strong>Issue:</strong> {selectedItem.subject}</div>
                <div><strong>Submitter:</strong> {selectedItem.submitter_name} ({selectedItem.department_name})</div>
              </div>

              <form onSubmit={handleEscalateSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Escalation Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain why this requires central campus intervention (e.g. Major structural wiring defect, central procurement required)..."
                    value={escalateForm.escalationReason}
                    onChange={(e) => setEscalateForm({ ...escalateForm, escalationReason: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Remarks for Master Admin
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Department technician examined and confirmed replacement needed"
                    value={escalateForm.internalRemarks}
                    onChange={(e) => setEscalateForm({ ...escalateForm, internalRemarks: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEscalate}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    <ArrowUpRight size={14} />
                    {submittingEscalate ? "Escalating..." : "Forward to Master Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: NOTIFY SUBMITTER (Master Admin) */}
        {showNotifyModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Submitter Update Dispatch
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Send Submitter Update</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifyModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3 space-y-1">
                <div><strong>Recipient:</strong> {selectedItem.submitter_name} ({selectedItem.submitter_email})</div>
                <div><strong>Venue:</strong> {selectedItem.venue_name}</div>
                <div><strong>Current Status:</strong> {selectedItem.status}</div>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Notification Channels (Reusing Existing Notification Systems)
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyForm.channels.includes("EMAIL")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...notifyForm.channels, "EMAIL"]
                            : notifyForm.channels.filter((c) => c !== "EMAIL");
                          setNotifyForm({ ...notifyForm, channels: updated });
                        }}
                      />
                      <Mail size={14} className="text-blue-600" />
                      <span>Email Update</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyForm.channels.includes("WHATSAPP")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...notifyForm.channels, "WHATSAPP"]
                            : notifyForm.channels.filter((c) => c !== "WHATSAPP");
                          setNotifyForm({ ...notifyForm, channels: updated });
                        }}
                      />
                      <Smartphone size={14} className="text-emerald-600" />
                      <span>WhatsApp Update</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyForm.channels.includes("IN_APP")}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...notifyForm.channels, "IN_APP"]
                            : notifyForm.channels.filter((c) => c !== "IN_APP");
                          setNotifyForm({ ...notifyForm, channels: updated });
                        }}
                      />
                      <Bell size={14} className="text-purple-600" />
                      <span>In-App Notification</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Update Message *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={notifyForm.customMessage}
                    onChange={(e) => setNotifyForm({ ...notifyForm, customMessage: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNotifyModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingNotify || !notifyForm.channels.length}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingNotify ? "Dispatching..." : "Send Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: VENUE FEEDBACK HISTORY */}
        {showHistoryModal && venueHistoryData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Facility History Log
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{venueHistoryData.venueName}</h3>
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
                <div className="py-10 text-center text-xs text-slate-400">Loading history...</div>
              ) : !venueHistoryData?.complaints?.length ? (
                <div className="py-10 text-center text-xs text-slate-400">No issues recorded for this venue.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {venueHistoryData.complaints.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{c.subject}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{c.description}</p>
                      {c.resolution && (
                        <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded">
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

export default CommonVenueFeedback;
