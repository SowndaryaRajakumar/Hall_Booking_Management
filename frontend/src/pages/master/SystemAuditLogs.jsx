import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  X,
  User,
  Clock,
  Layers,
  ArrowRight,
  Code,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { getSystemAuditLogs } from "../../api/masterAdminApi";

const ACTION_COLORS = {
  ADMIN_CREATED: "bg-blue-100 text-blue-800 border-blue-200",
  ADMIN_UPDATED: "bg-amber-100 text-amber-800 border-amber-200",
  ADMIN_STATUS_CHANGED: "bg-purple-100 text-purple-800 border-purple-200",
  PASSWORD_RESET: "bg-rose-100 text-rose-800 border-rose-200",
  PERMISSIONS_UPDATED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  VENUE_CREATED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VENUE_UPDATED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  VENUE_ACCESS_UPDATED: "bg-teal-100 text-teal-800 border-teal-200",
  BOOKING_APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BOOKING_REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  BOOKING_CANCELLED: "bg-slate-100 text-slate-800 border-slate-200",
  LOGIN: "bg-blue-100 text-blue-800 border-blue-200",
};

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "ADMIN_CREATED", label: "Admin Created" },
  { value: "ADMIN_UPDATED", label: "Admin Updated" },
  { value: "ADMIN_STATUS_CHANGED", label: "Admin Status Changed" },
  { value: "PASSWORD_RESET", label: "Password Reset" },
  { value: "PERMISSIONS_UPDATED", label: "Permissions Updated" },
  { value: "VENUE_CREATED", label: "Venue Created" },
  { value: "VENUE_UPDATED", label: "Venue Updated" },
  { value: "VENUE_ACCESS_UPDATED", label: "Venue Access Updated" },
  { value: "BOOKING_APPROVED", label: "Booking Approved" },
  { value: "BOOKING_REJECTED", label: "Booking Rejected" },
  { value: "BOOKING_CANCELLED", label: "Booking Cancelled" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entity Types" },
  { value: "STAFF", label: "Staff / Admin" },
  { value: "PERMISSIONS", label: "Permissions" },
  { value: "VENUE", label: "Venue" },
  { value: "VENUE_ACCESS", label: "Venue Access" },
  { value: "BOOKING", label: "Booking" },
];

const SystemAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: pagination.limit };
        if (search.trim()) params.search = search.trim();
        if (selectedAction) params.action = selectedAction;
        if (selectedEntity) params.entityType = selectedEntity;

        const res = await getSystemAuditLogs(params);
        setLogs(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [search, selectedAction, selectedEntity, pagination.limit]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [selectedAction, selectedEntity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const parseJsonValue = (val) => {
    if (!val) return null;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <FileText size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">System Audit Trail</h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Full immutable log of administrative actions, permission overrides, and security events.
            </p>
          </div>
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition self-start sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by actor, email, action, or entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 bg-white"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-700 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Target Entity</th>
                  <th className="px-4 py-3 text-left">IP Address</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                      Loading system audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No system audit events found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const badgeClass =
                      ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800 border-gray-200";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            {formatTimestamp(log.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md border ${badgeClass}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {(log.actor_name || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 text-xs">
                                {log.actor_name || "System"}
                              </div>
                              <div className="text-gray-400 text-[11px]">
                                {log.actor_email || `User #${log.user_id || "N/A"}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                          {log.ip_address || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition font-medium"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div>
              Showing {logs.length} of {pagination.total} audit entries
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="px-2 font-medium text-gray-700">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Audit Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                        ACTION_COLORS[selectedLog.action] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedLog.action}
                    </span>
                    <span className="text-gray-400 text-xs">• Log #{selectedLog.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mt-1">
                    Event Details & Audit Payload
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-semibold">Actor</span>
                    <div className="font-semibold text-gray-800 mt-0.5">
                      {selectedLog.actor_name || "Unknown"}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {selectedLog.actor_email} ({selectedLog.actor_role || "SYSTEM"})
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-semibold">Target Entity</span>
                    <div className="font-semibold text-gray-800 mt-0.5">
                      {selectedLog.entity_type} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ""}
                    </div>
                    <div className="text-gray-500 text-xs font-mono">IP: {selectedLog.ip_address || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-semibold">Date & Time</span>
                    <div className="font-medium text-gray-700 mt-0.5">
                      {formatTimestamp(selectedLog.created_at)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-semibold">User ID</span>
                    <div className="font-medium text-gray-700 mt-0.5">
                      {selectedLog.user_id || "System Action"}
                    </div>
                  </div>
                </div>

                {/* Values Diff */}
                <div className="space-y-4">
                  {selectedLog.old_value && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Code size={14} className="text-amber-500" />
                        Previous State (Old Value)
                      </div>
                      <pre className="p-3 bg-slate-900 text-amber-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(parseJsonValue(selectedLog.old_value), null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_value && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Code size={14} className="text-emerald-500" />
                        Applied State (New Value)
                      </div>
                      <pre className="p-3 bg-slate-900 text-emerald-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(parseJsonValue(selectedLog.new_value), null, 2)}
                      </pre>
                    </div>
                  )}

                  {!selectedLog.old_value && !selectedLog.new_value && (
                    <div className="p-4 bg-gray-50 text-gray-500 text-xs rounded-lg text-center">
                      No additional JSON payload recorded for this event.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
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

export default SystemAuditLogs;
