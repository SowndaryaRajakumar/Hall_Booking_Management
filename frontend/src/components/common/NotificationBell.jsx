import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../api/notificationApi";

const formatTimeAgo = (dateValue, t) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("notifications.justNow", "Just now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("notifications.minutesAgo", { count: minutes, defaultValue: `${minutes}m ago` });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.hoursAgo", { count: hours, defaultValue: `${hours}h ago` });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("notifications.daysAgo", { count: days, defaultValue: `${days}d ago` });

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case "booking_approved":
      return <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />;
    case "booking_rejected":
      return <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />;
    case "booking_cancelled":
      return <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />;
    case "booking_reminder":
      return <Clock size={16} className="text-indigo-600 shrink-0 mt-0.5" />;
    case "booking_request":
    default:
      return <Calendar size={16} className="text-blue-600 shrink-0 mt-0.5" />;
  }
};

const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef(null);

  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";
  const viewAllPath = isAdmin ? "/admin/notifications" : "/faculty/notifications";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      if (res?.success) {
        setUnreadCount(Number(res.unreadCount || 0));
      }
    } catch {
      // Silently fail in background polling
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ page: 1, limit: 8 });
      if (res?.success) {
        setNotifications(res.data || []);
        if (typeof res.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);

    const handleRefresh = () => {
      fetchUnreadCount();
      if (isOpen) {
        fetchRecentNotifications();
      }
    };
    window.addEventListener("notifications-refresh", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-refresh", handleRefresh);
    };
  }, [fetchUnreadCount, fetchRecentNotifications, isOpen]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen, fetchRecentNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent("notifications-refresh"));
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    setIsOpen(false);

    // Navigate to relevant section if applicable
    if (isAdmin) {
      navigate("/admin/bookings");
    } else {
      navigate("/faculty/my-bookings");
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate(viewAllPath);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
        aria-label="Notifications"
        title={t("notifications.title", "Notifications")}
      >
        <Bell size={20} className={unreadCount > 0 ? "text-blue-700" : ""} />

        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {t("notifications.title", "Notifications")}
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {unreadCount} {t("notifications.unread", "Unread")}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition disabled:opacity-50 cursor-pointer"
                title={t("notifications.markAllRead", "Mark all as read")}
              >
                <CheckCheck size={14} />
                <span>{t("notifications.markAllRead", "Mark all as read")}</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 size={24} className="animate-spin mb-2 text-blue-600" />
                <p className="text-xs">{t("notifications.loading", "Loading notifications...")}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Bell size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {t("notifications.noNotifications", "No notifications yet")}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  {t("notifications.noNotificationsDesc", "Booking requests and updates will appear here.")}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left px-4 py-3 transition flex items-start gap-3 hover:bg-slate-50 cursor-pointer ${
                      isUnread ? "bg-blue-50/50" : "bg-white"
                    }`}
                  >
                    {/* Icon */}
                    {getNotificationIcon(item.type)}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(item.createdAt, t)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"
                        title="Unread"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 text-center">
            <button
              type="button"
              onClick={handleViewAll}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition py-1 px-3 rounded-lg hover:bg-blue-50 cursor-pointer"
            >
              <span>{t("notifications.viewAll", "View all notifications")}</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
