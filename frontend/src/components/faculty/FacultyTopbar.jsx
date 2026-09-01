import { Bell, Menu, UserCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFacultyBookings } from "../../api/bookingApi";

const FacultyTopbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  const facultyName =
    typeof window !== "undefined"
      ? localStorage.getItem("facultyName") ||
        localStorage.getItem("staffName") ||
        localStorage.getItem("name") ||
        "Faculty Member"
      : "Faculty Member";

  const facultyEmail =
    typeof window !== "undefined"
      ? localStorage.getItem("email") || ""
      : "";

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const getBookingId = (booking) =>
    booking?.id ??
    booking?.bookingId ??
    booking?.booking_id;

  const getBookingStatus = (booking) => {
    const status =
      booking?.status ??
      booking?.bookingStatus ??
      booking?.booking_status ??
      "Pending";

    return String(status).trim();
  };

  const getVenueName = (booking) =>
    booking?.venueName ||
    booking?.hallName ||
    booking?.venue ||
    booking?.hall ||
    "Venue";

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTimeText = (booking) => {
    const start =
      booking?.startTime ||
      booking?.start_time ||
      "";

    const end =
      booking?.endTime ||
      booking?.end_time ||
      "";

    if (start && end) {
      return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
    }

    return "";
  };

  const createNotification = (booking) => {
    const status = getBookingStatus(booking);
    const venue = getVenueName(booking);
    const bookingDate = formatDate(
      booking?.date ||
        booking?.bookingDate ||
        booking?.booking_date
    );
    const time = getTimeText(booking);
    const bookingId = getBookingId(booking);

    let title = "Booking Update";
    let message = `Your booking for ${venue}`;

    if (bookingDate) {
      message += ` on ${bookingDate}`;
    }

    if (time) {
      message += ` (${time})`;
    }

    if (status.toLowerCase() === "approved") {
      title = "Booking Approved";
      message += " has been approved.";
    } else if (status.toLowerCase() === "rejected") {
      title = "Booking Rejected";
      message += " has been rejected.";
    } else if (status.toLowerCase() === "cancelled") {
      title = "Booking Cancelled";
      message += " has been cancelled.";
    } else if (status.toLowerCase() === "pending") {
      title = "Booking Pending";
      message += " is waiting for approval.";
    } else {
      title = `Booking ${status}`;
      message += ` is now ${status.toLowerCase()}.`;
    }

    return {
      id: `${bookingId}-${status}-${Date.now()}`,
      bookingId,
      status,
      title,
      message,
      time: "Just now",
      read: false,
    };
  };

  // --------------------------------------------------
  // Load bookings and detect status changes
  // --------------------------------------------------

  const loadBookingNotifications = async () => {
    try {
      if (!facultyEmail) {
        return;
      }

      const response = await getFacultyBookings(facultyEmail);

      /*
       * API may return:
       *   []
       * or
       *   { bookings: [] }
       * or
       *   { data: [] }
       */

      let bookings = [];

      if (Array.isArray(response)) {
        bookings = response;
      } else if (Array.isArray(response?.bookings)) {
        bookings = response.bookings;
      } else if (Array.isArray(response?.data)) {
        bookings = response.data;
      }

      if (!bookings.length) {
        return;
      }

      const previousStatuses = JSON.parse(
        localStorage.getItem("facultyBookingStatuses") || "{}"
      );

      const currentStatuses = {};
      const changedNotifications = [];

      bookings.forEach((booking) => {
        const bookingId = getBookingId(booking);

        if (bookingId === undefined || bookingId === null) {
          return;
        }

        const status = getBookingStatus(booking);

        currentStatuses[String(bookingId)] = status;

        const previousStatus =
          previousStatuses[String(bookingId)];

        /*
         * First time we see a booking:
         * show its current status.
         *
         * Later:
         * show notification only when status changes.
         */
        if (!previousStatus) {
          changedNotifications.push(
            createNotification(booking)
          );
        } else if (
          String(previousStatus).toLowerCase() !==
          String(status).toLowerCase()
        ) {
          changedNotifications.push(
            createNotification(booking)
          );
        }
      });

      localStorage.setItem(
        "facultyBookingStatuses",
        JSON.stringify(currentStatuses)
      );

      if (changedNotifications.length > 0) {
        setNotifications((previous) => {
          const combined = [
            ...changedNotifications,
            ...previous,
          ];

          /*
           * Avoid duplicate notification for the same
           * booking + status.
           */
          const unique = [];
          const seen = new Set();

          combined.forEach((notification) => {
            const key = `${notification.bookingId}-${notification.status}`;

            if (!seen.has(key)) {
              seen.add(key);
              unique.push(notification);
            }
          });

          return unique.slice(0, 20);
        });
      }
    } catch (error) {
      console.error(
        "Failed to load faculty booking notifications:",
        error
      );
    }
  };

  // --------------------------------------------------
  // Initial load + automatic checking
  // --------------------------------------------------

  useEffect(() => {
    loadBookingNotifications();

    /*
     * Check every 10 seconds.
     *
     * So when admin approves/rejects a booking,
     * faculty does not have to manually refresh.
     */
    const interval = setInterval(() => {
      loadBookingNotifications();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [facultyEmail]);

  // --------------------------------------------------
  // Close dropdown when clicking outside
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // --------------------------------------------------
  // Notification click
  // --------------------------------------------------

  const handleNotificationClick = (notification) => {
    if (notification?.bookingId) {
      navigate("/faculty/my-bookings");
    }

    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id
          ? { ...item, read: true }
          : item
      )
    );
  };

  // --------------------------------------------------
  // Clear notifications
  // --------------------------------------------------

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-4">

        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 lg:hidden"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-800">
              Welcome, {facultyName}
            </h2>

            <p className="text-sm text-slate-500">
              {formattedDate}
            </p>
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* NOTIFICATIONS */}
          <div
            ref={notificationRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setShowNotifications(
                  (previous) => !previous
                )
              }
              className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
              aria-label="Notifications"
            >
              <Bell size={20} />

              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* DROPDOWN */}
            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Notifications
                    </h3>

                    <p className="text-xs text-slate-500">
                      Booking status updates
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowNotifications(false)
                    }
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* BODY */}
                <div className="max-h-[360px] overflow-y-auto">

                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">

                      <Bell
                        size={28}
                        className="mx-auto mb-2 text-slate-300"
                      />

                      <p className="text-sm font-medium text-slate-600">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Booking status updates will appear here.
                      </p>

                    </div>
                  ) : (
                    notifications.map(
                      (notification, index) => (
                        <button
                          key={
                            notification.id ??
                            `${notification.bookingId}-${index}`
                          }
                          type="button"
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                            notification.read
                              ? "bg-white"
                              : "bg-blue-50/50"
                          }`}
                        >
                          <div className="flex gap-3">

                            {/* STATUS DOT */}
                            <div
                              className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                notification.status?.toLowerCase() ===
                                "approved"
                                  ? "bg-emerald-500"
                                  : notification.status?.toLowerCase() ===
                                    "rejected"
                                    ? "bg-red-500"
                                    : notification.status?.toLowerCase() ===
                                      "cancelled"
                                      ? "bg-orange-500"
                                      : "bg-blue-500"
                              }`}
                            />

                            <div className="min-w-0 flex-1">

                              <p className="text-sm font-semibold text-slate-800">
                                {notification.title ||
                                  "Booking Update"}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {notification.message ||
                                  "Your booking has been updated."}
                              </p>

                              {notification.time && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {notification.time}
                                </p>
                              )}

                            </div>

                          </div>
                        </button>
                      )
                    )
                  )}

                </div>

                {/* FOOTER */}
                {notifications.length > 0 && (
                  <div className="border-t border-slate-200 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Clear notifications
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">

            <UserCircle2
              size={28}
              className="text-blue-700"
            />

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {facultyName}
              </p>

              <p className="text-xs text-slate-500">
                Faculty
              </p>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

export default FacultyTopbar;