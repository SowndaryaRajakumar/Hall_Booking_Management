import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, History, User, Clock, ArrowRight, LoaderCircle, Shield, FileText } from "lucide-react";
import { getBookingAuditLogs } from "../../api/bookingApi";

const getActionBadgeColor = (action = "") => {
  switch (action) {
    case "BOOKING_CREATED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "BOOKING_APPROVED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "BOOKING_REJECTED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "BOOKING_CANCELLED":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

const formatAuditTimestamp = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const BookingAuditModal = ({ booking, onClose }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!booking?.id) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getBookingAuditLogs(booking.id);
        if (res?.success) {
          setLogs(Array.isArray(res.logs) ? res.logs : []);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error("Error fetching booking audit logs:", err);
        setError(err.message || "Failed to load audit history.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [booking?.id]);

  if (!booking) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {t("audit.title", "Booking Audit Trail")} — #{booking.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {booking.venue || "Venue"} • {booking.date}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body / Timeline */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-500">
              <LoaderCircle size={22} className="animate-spin text-purple-600 mb-2" />
              <span>{t("common.loading", "Loading audit records...")}</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl p-4">
              <History size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">{t("audit.noLogs", "No audit logs recorded for this booking.")}</p>
              <p className="text-slate-400 mt-0.5">{t("audit.noLogsDesc", "Audit events are automatically tracked upon creation, approval, rejection, or cancellation.")}</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logs.map((log, index) => {
                const badgeClass = getActionBadgeColor(log.action);
                return (
                  <div key={log.id || index} className="relative">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-purple-600 shadow-xs" />

                    <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatAuditTimestamp(log.created_at)}
                        </span>
                      </div>

                      {/* Status Transition */}
                      {(log.old_status || log.new_status) && (
                        <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                          <span className="text-slate-500">{log.old_status || "Initial State"}</span>
                          <ArrowRight size={13} className="text-slate-400" />
                          <span className="font-bold text-slate-900">{log.new_status}</span>
                        </div>
                      )}

                      {/* Performed by user */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <User size={13} className="text-slate-400" />
                        <span>
                          {log.user_name || log.user_email || "System"}
                          {log.user_role ? (
                            <span className="ml-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.2">
                              {log.user_role}
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {/* Details JSON snippet if present */}
                      {log.details && (
                        <div className="mt-1 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                          {log.details.reason && (
                            <div>
                              <strong>Purpose:</strong> {log.details.reason}
                            </div>
                          )}
                          {log.details.remarks && (
                            <div>
                              <strong>Remarks:</strong> {log.details.remarks}
                            </div>
                          )}
                          {log.details.timeFrom && log.details.timeTo && (
                            <div>
                              <strong>Slot:</strong> {log.details.timeFrom} - {log.details.timeTo}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingAuditModal;
