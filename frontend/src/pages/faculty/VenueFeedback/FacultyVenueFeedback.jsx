import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Building,
  Calendar,
  Send,
  Filter,
  Search,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  User,
  Info,
} from "lucide-react";
import FacultyLayout from "../../../layouts/FacultyLayout";
import {
  getVenueFeedbackList,
  createVenueFeedback,
} from "../../../api/venueFeedbackApi";
import { getAllHalls } from "../../../api/hallApi";

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

const STATUS_BADGES = {
  OPEN: { bg: "bg-red-50 text-red-700 border-red-200", label: "Open" },
  IN_PROGRESS: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "In Progress" },
  ESCALATED: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Escalated to Master Admin" },
  RESOLVED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Resolved" },
  CLOSED: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Closed" },
};

const FacultyVenueFeedback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Modal / Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Available Venues for selection
  const [allVenues, setAllVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  // List of submitted tickets
  const [myFeedbackList, setMyFeedbackList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    venueId: "",
    type: "COMPLAINT",
    priority: "MEDIUM",
    subject: "",
    description: "",
    feedbackDate: new Date().toISOString().split("T")[0],
    relatedBookingId: "",
  });

  const showToastMsg = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Venues
  useEffect(() => {
    const fetchVenues = async () => {
      setLoadingVenues(true);
      try {
        const res = await getAllHalls({ limit: 100 });
        const list = (res.halls || res.data || []).map((h) => ({
          id: h.hallId ?? h.HallID ?? h.id,
          name: h.hallName ?? h.HallName ?? h.name ?? "",
          ownershipType: h.ownershipType ?? h.ownership_type ?? "DEPARTMENT",
          department: h.department ?? h.DeptName ?? "",
        }));
        setAllVenues(list);
        if (list.length && !form.venueId) {
          setForm((p) => ({ ...p, venueId: String(list[0].id) }));
        }
      } catch (err) {
        console.error("Failed to load venues:", err);
      } finally {
        setLoadingVenues(false);
      }
    };
    fetchVenues();
  }, []);

  // Handle URL location state for prefilling
  useEffect(() => {
    if (location.state) {
      const { venueId, venueName, date, bookingId } = location.state;
      setForm((p) => ({
        ...p,
        venueId: venueId ? String(venueId) : p.venueId,
        feedbackDate: date || p.feedbackDate,
        relatedBookingId: bookingId ? String(bookingId) : "",
        subject: venueName ? `Issue report for ${venueName}` : p.subject,
      }));
      setShowFormModal(true);
    }
  }, [location.state]);

  // Load My Feedback Submissions
  const loadMyFeedback = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await getVenueFeedbackList(params);
      setMyFeedbackList(res.data || []);
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadMyFeedback();
  }, [loadMyFeedback]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.venueId) {
      showToastMsg("Please select a venue", "error");
      return;
    }
    setSubmitting(true);
    try {
      const selectedVenueObj = allVenues.find((v) => String(v.id) === String(form.venueId));
      const isCommon = selectedVenueObj?.ownershipType === "COMMON";

      await createVenueFeedback({
        venueId: Number(form.venueId),
        type: form.type,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
        feedbackDate: form.feedbackDate,
        relatedBookingId: form.relatedBookingId ? Number(form.relatedBookingId) : null,
      });

      const routeDestination = isCommon
        ? "Master Admin (College-wide resource)"
        : "Department Admin";

      showToastMsg(`Feedback submitted successfully! Routed to ${routeDestination}.`);
      setShowFormModal(false);
      setForm((p) => ({
        ...p,
        subject: "",
        description: "",
        relatedBookingId: "",
      }));
      loadMyFeedback();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVenueDetail = allVenues.find((v) => String(v.id) === String(form.venueId));

  return (
    <FacultyLayout>
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                Facility Support
              </span>
              <span className="text-blue-300 text-sm">Faculty Feedback & Complaint Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Venue Feedback & Issues
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Report equipment failures, air conditioning defects, cleanliness issues, or suggestions. Department-owned venue feedback routes to your Department Admin; Common Venue feedback routes to Master Admin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/faculty/venue-history")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-xs border border-white/20 transition active:scale-95"
            >
              <Calendar size={16} />
              From Venue Usage History
            </button>
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition active:scale-95"
            >
              <Plus size={18} />
              Log New Issue
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-800">
            My Submitted Feedback & Status Tracking
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ESCALATED">Escalated to Master Admin</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loadingList ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Loading your feedback tickets...</p>
            </div>
          ) : myFeedbackList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-base font-semibold text-slate-600">No feedback tickets logged yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click "Log New Issue" or select a past class from "Venue Usage History" to submit feedback.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myFeedbackList.map((ticket) => {
                const badge = STATUS_BADGES[ticket.status] || STATUS_BADGES.OPEN;
                const isCommon = ticket.ownership_type === "COMMON";
                return (
                  <div key={ticket.id} className="p-5 hover:bg-slate-50/70 transition">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {ticket.type}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              ticket.priority === "CRITICAL"
                                ? "bg-rose-100 text-rose-800 font-bold"
                                : ticket.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {ticket.priority} Priority
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-2">{ticket.subject}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                          {ticket.description}
                        </p>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                          <Building size={14} className="text-blue-600" />
                          {ticket.venue_name}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isCommon ? "🏛 College Common Venue" : "🏢 Department Venue"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Logged on: {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Escalation notice */}
                    {ticket.status === "ESCALATED" && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-purple-950">
                          <ShieldAlert size={14} /> Escalated to Master Admin by Department Admin
                        </div>
                        {ticket.escalation_reason && (
                          <div><strong>Reason:</strong> {ticket.escalation_reason}</div>
                        )}
                      </div>
                    )}

                    {/* Resolution details */}
                    {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && ticket.resolution && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-emerald-950">
                          <CheckCircle size={14} /> Official Resolution Note
                        </div>
                        <p>{ticket.resolution}</p>
                        {ticket.resolver_name && (
                          <div className="text-[11px] text-emerald-700 mt-1">
                            Resolved by: {ticket.resolver_name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CREATE MODAL */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Log Venue Issue / Feedback</h3>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Venue *
                  </label>
                  {loadingVenues ? (
                    <div className="text-xs text-slate-400">Loading venues...</div>
                  ) : (
                    <select
                      required
                      value={form.venueId}
                      onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    >
                      {allVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.ownershipType === "COMMON" ? "Common Venue" : `Dept: ${v.department || "Private"}`})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedVenueDetail && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Routing: {selectedVenueDetail.ownershipType === "COMMON" ? "Will route directly to Master Admin" : "Will route to Department Admin"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                      Priority *
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Usage Date
                    </label>
                    <input
                      type="date"
                      value={form.feedbackDate}
                      onChange={(e) => setForm({ ...form, feedbackDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Booking / Allocation ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1024"
                      value={form.relatedBookingId}
                      onChange={(e) => setForm({ ...form, relatedBookingId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject / Summary *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Projector display flickers intermittently"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
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
                    placeholder="Describe what occurred, any error messages, or damaged facility details..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    <Send size={13} />
                    {submitting ? "Submitting..." : "Submit"}
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

export default FacultyVenueFeedback;
