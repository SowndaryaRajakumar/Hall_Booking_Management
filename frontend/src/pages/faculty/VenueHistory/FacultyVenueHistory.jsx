import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  History,
  Calendar,
  Building,
  Filter,
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Layers,
  Sparkles,
  X,
  Send,
} from "lucide-react";
import FacultyLayout from "../../../layouts/FacultyLayout";
import { getFacultyVenueHistory } from "../../../api/academicApi";
import { createVenueFeedback } from "../../../api/venueFeedbackApi";

const COMPLAINT_TYPES = [
  { value: "COMPLAINT", label: "Complaint" },
  { value: "FEEDBACK", label: "General Feedback" },
  { value: "MAINTENANCE", label: "Maintenance Request" },
  { value: "FACILITY_ISSUE", label: "Facility Issue" },
  { value: "EQUIPMENT_ISSUE", label: "Equipment / Audio-Visual Issue" },
  { value: "CLEANLINESS", label: "Cleanliness & Hygiene" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low Priority" },
  { value: "MEDIUM", label: "Medium Priority" },
  { value: "HIGH", label: "High Priority" },
  { value: "CRITICAL", label: "Critical Priority" },
];

const FacultyVenueHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Filter States
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [venueFilter, setVenueFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Data States
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [venueOptions, setVenueOptions] = useState([]);

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [toast, setToast] = useState(null);

  const [feedbackForm, setFeedbackForm] = useState({
    venueId: "",
    venueName: "",
    ownershipType: "DEPARTMENT",
    date: "",
    relatedBookingId: "",
    type: "FEEDBACK",
    priority: "MEDIUM",
    subject: "",
    description: "",
  });

  const showToastMsg = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load History Data
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (venueFilter !== "all") params.venueId = venueFilter;
      if (bookingTypeFilter !== "all") params.bookingType = bookingTypeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await getFacultyVenueHistory(params);
      const data = res.data || [];
      setHistoryList(data);

      // Extract unique venues for filter dropdown
      const vMap = new Map();
      data.forEach((item) => {
        if (item.venue_id && item.venue_name) {
          vMap.set(String(item.venue_id), item.venue_name);
        }
      });
      setVenueOptions(Array.from(vMap.entries()).map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error("Error loading venue usage history:", err);
      setError("Unable to load venue usage history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, venueFilter, bookingTypeFilter, statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Filtered by Search Term
  const filteredList = historyList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.venue_name || "").toLowerCase().includes(term) ||
      (item.subject_or_purpose || "").toLowerCase().includes(term) ||
      (item.period_label || "").toLowerCase().includes(term) ||
      (item.department_name || "").toLowerCase().includes(term)
    );
  });

  // Open Feedback Modal with Prefilled Data
  const handleOpenFeedback = (item) => {
    setFeedbackForm({
      venueId: item.venue_id,
      venueName: item.venue_name,
      ownershipType: item.ownership_type || "DEPARTMENT",
      date: item.date,
      relatedBookingId: item.booking_id || item.allocation_id || "",
      type: "FEEDBACK",
      priority: "MEDIUM",
      subject: `Feedback for ${item.venue_name} (${item.date})`,
      description: "",
    });
    setShowFeedbackModal(true);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await createVenueFeedback({
        venueId: Number(feedbackForm.venueId),
        feedbackDate: feedbackForm.date,
        relatedBookingId: feedbackForm.relatedBookingId ? Number(feedbackForm.relatedBookingId) : null,
        type: feedbackForm.type,
        priority: feedbackForm.priority,
        subject: feedbackForm.subject.trim(),
        description: feedbackForm.description.trim(),
      });

      const recipientText =
        feedbackForm.ownershipType === "COMMON"
          ? "Master Admin (Central College Facility)"
          : "Department Admin";

      showToastMsg(`Feedback submitted successfully! Routed to ${recipientText}.`);
      setShowFeedbackModal(false);
    } catch (err) {
      showToastMsg(err.message || "Failed to submit feedback", "error");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setVenueFilter("all");
    setBookingTypeFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <FacultyLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Toast Notification */}
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

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                Academic & Facility Record
              </span>
              <span className="text-blue-300 text-sm">Faculty Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              My Venue Usage History
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-xl">
              Track your classrooms, seminar halls, and labs used for semester academic classes and one-time bookings. Submit quick feedback or maintenance complaints directly for any past session.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/faculty/venue-feedback")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-xs border border-white/20 transition active:scale-95"
            >
              <MessageSquare size={17} />
              View My Submitted Feedback
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Filter size={15} className="text-blue-600" />
              <span>Filters & Date Range</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Venue Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Venue</label>
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
              >
                <option value="all">All Venues</option>
                {venueOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Type</label>
              <select
                value={bookingTypeFilter}
                onChange={(e) => setBookingTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
              >
                <option value="all">All Types</option>
                <option value="ACADEMIC_ALLOCATION">Academic Allocation</option>
                <option value="BOOKING">One-Time Booking</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search Keywords</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Subject, venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Usage History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Loading venue usage history...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-600">
              <AlertCircle size={36} className="mx-auto mb-2 opacity-80" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={loadHistory}
                className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-base font-semibold text-slate-600">No venue usage records found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No past bookings or academic allocations match the selected date range and filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date & Day</th>
                    <th className="py-3 px-4">Venue & Type</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Period / Time</th>
                    <th className="py-3 px-4">Subject / Purpose</th>
                    <th className="py-3 px-4">Booking Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredList.map((item, idx) => {
                    const isCommon = item.ownership_type === "COMMON";
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        {/* Date & Day */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{item.date}</div>
                          <div className="text-[11px] text-slate-500">{item.day_name}</div>
                        </td>

                        {/* Venue */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building size={14} className="text-blue-600 shrink-0" />
                            <span>{item.venue_name}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isCommon
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isCommon ? "Common Venue" : "Dept Venue"}
                            </span>
                            {item.venue_type && (
                              <span className="text-[10px] text-slate-500">
                                • {item.venue_type}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {item.department_name || "Campus-wide"}
                        </td>

                        {/* Period */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{item.period_label}</span>
                          {item.start_time && item.end_time && (
                            <div className="text-[11px] text-slate-400">
                              {String(item.start_time).slice(0, 5)} - {String(item.end_time).slice(0, 5)}
                            </div>
                          )}
                        </td>

                        {/* Subject / Purpose */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-800 truncate">
                            {item.subject_or_purpose || "Regular Academic Session"}
                          </div>
                          {item.booking_type === "ACADEMIC_ALLOCATION" && item.section && (
                            <div className="text-[11px] text-slate-400">
                              Class: {item.year_of_study} {item.section}
                            </div>
                          )}
                        </td>

                        {/* Booking Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.booking_type === "ACADEMIC_ALLOCATION"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            <BookOpen size={11} />
                            {item.booking_type === "ACADEMIC_ALLOCATION"
                              ? "Academic Allocation"
                              : "One-Time Booking"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.status || "Completed"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleOpenFeedback(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold transition text-xs border border-blue-200 active:scale-95 shadow-2xs"
                          >
                            <MessageSquare size={13} />
                            Give Feedback
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FEEDBACK SUBMISSION MODAL */}
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Prefilled Venue Feedback
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Submit Venue Feedback</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Prefilled Context Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Selected Venue:</span>
                  <span className="font-bold text-slate-800">{feedbackForm.venueName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Usage Date:</span>
                  <span className="font-bold text-slate-800">{feedbackForm.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Venue Ownership:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      feedbackForm.ownershipType === "COMMON"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {feedbackForm.ownershipType === "COMMON" ? "College Common Venue" : "Department Venue"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Routing Target:</span>
                  <span className="font-bold text-slate-700">
                    {feedbackForm.ownershipType === "COMMON" ? "Master Admin" : "Department Admin"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Feedback Category *
                    </label>
                    <select
                      value={feedbackForm.type}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      {COMPLAINT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={feedbackForm.priority}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, priority: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject / Short Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDMI projector cable loose in Seminar Hall"
                    value={feedbackForm.subject}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details about the issue, equipment defect, air conditioning issue, cleanliness, or suggestions..."
                    value={feedbackForm.description}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    <Send size={13} />
                    {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyVenueHistory;
