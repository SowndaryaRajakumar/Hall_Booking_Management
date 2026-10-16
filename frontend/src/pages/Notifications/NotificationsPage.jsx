import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Trash2,
  Check,
  ArrowRight,
  Loader2,
  Filter,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import FacultyLayout from "../../layouts/FacultyLayout";
import Pagination from "../../components/Pagination";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../api/notificationApi";

const formatDateTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getNotificationBadge = (type, t) => {
  switch (type) {
    case "booking_approved":
      return {
        icon: <CheckCircle2 size={18} className="text-emerald-600" />,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: t("status.approved", "Approved"),
      };
    case "booking_rejected":
      return {
        icon: <XCircle size={18} className="text-rose-600" />,
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        label: t("status.rejected", "Rejected"),
      };
    case "booking_cancelled":
      return {
        icon: <AlertCircle size={18} className="text-amber-600" />,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: t("status.cancelled", "Cancelled"),
      };
    case "booking_reminder":
      return {
        icon: <Clock size={18} className="text-indigo-600" />,
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        label: t("notifications.bookingReminder", "Reminder"),
      };
    case "booking_request":
    default:
      return {
        icon: <Calendar size={18} className="text-blue-600" />,
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: t("status.pending", "Request"),
      };
  }
};

const NotificationsPage = ({ role: propRole }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const userRole = (propRole || localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const LayoutComponent = isAdmin ? AdminLayout : FacultyLayout;

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchPageNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications({
        page,
        limit: 10,
        status: filter === "all" ? "" : filter,
      });

      if (res?.success) {
        setNotifications(res.data || []);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        if (typeof res.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      toast.error(err.message || t("notifications.failedLoad", "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, [page, filter, t]);

  useEffect(() => {
    fetchPageNotifications();
  }, [fetchPageNotifications]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkAsRead = async (id) => {
    try {
      setProcessingId(id);
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    } catch (err) {
      toast.error(err.message || "Failed to mark as read");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
      toast.success(t("notifications.allMarkedRead", "All notifications marked as read."));
    } catch (err) {
      toast.error(err.message || "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("notifications.confirmDelete", "Are you sure you want to delete this notification?"))) {
      return;
    }

    try {
      setProcessingId(id);
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(t("notifications.deletedSuccess", "Notification deleted successfully."));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
      // Refresh to update pagination accurately
      fetchPageNotifications();
    } catch (err) {
      toast.error(err.message || "Failed to delete notification");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewBooking = () => {
    if (isAdmin) {
      navigate("/admin/bookings");
    } else {
      navigate("/faculty/my-bookings");
    }
  };

  return (
    <LayoutComponent>
      <div className="space-y-6 max-w-5xl mx-auto">
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">
                  {t("notifications.title", "Notifications")}
                </h1>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    {unreadCount} {t("notifications.unread", "Unread")}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {t("notifications.subtitle", "Track your booking updates, approval decisions, and reminders.")}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition disabled:opacity-50 cursor-pointer shrink-0"
            >
              <CheckCheck size={18} />
              <span>{t("notifications.markAllRead", "Mark all as read")}</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <div className="flex items-center gap-1.5">
              {[
                { key: "all", label: t("notifications.all", "All") },
                { key: "unread", label: t("notifications.unread", "Unread") },
                { key: "read", label: t("notifications.read", "Read") },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleFilterChange(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    filter === tab.key
                      ? "bg-blue-700 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {pagination.total} {pagination.total === 1 ? "notification" : "notifications"}
          </p>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">{t("notifications.loading", "Loading notifications...")}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-slate-100 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                <Bell size={32} />
              </div>
              <h3 className="text-base font-semibold text-slate-700">
                {filter === "unread"
                  ? t("notifications.noUnread", "No unread notifications")
                  : t("notifications.noNotifications", "No notifications yet")}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {filter === "unread"
                  ? t("notifications.noUnreadDesc", "You are all caught up!")
                  : t("notifications.noNotificationsDesc", "Booking requests, approval notices, and schedule reminders will appear here.")}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.isRead;
              const badge = getNotificationBadge(item.type, t);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition duration-150 ${
                    isUnread
                      ? "bg-blue-50/40 border-blue-200 shadow-sm"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-100 shadow-xs shrink-0">
                      {badge.icon}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm ${
                            isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                          }`}
                        >
                          {item.title}
                        </h4>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>

                        {isUnread && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            {t("notifications.unread", "Unread")}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed break-words">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-400">
                        <span>{formatDateTime(item.createdAt)}</span>
                        {item.relatedBookingId && (
                          <span>• Booking #{item.relatedBookingId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* View Booking Button */}
                    <button
                      type="button"
                      onClick={handleViewBooking}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition cursor-pointer"
                      title={t("notifications.viewBooking", "View Booking")}
                    >
                      <span>{t("notifications.viewBooking", "View")}</span>
                      <ArrowRight size={13} />
                    </button>

                    {/* Mark as read button */}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(item.id)}
                        disabled={processingId === item.id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                        title={t("notifications.markAsRead", "Mark as read")}
                      >
                        <Check size={14} className="text-emerald-600" />
                        <span className="hidden md:inline">{t("notifications.markAsRead", "Read")}</span>
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={processingId === item.id}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                      title={t("notifications.delete", "Delete")}
                      aria-label="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>
    </LayoutComponent>
  );
};

export default NotificationsPage;
