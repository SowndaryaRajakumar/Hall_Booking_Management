import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Bell,
  LogOut,
  User,
  History,
  MessageSquare,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const menuItems = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/faculty/dashboard",
  },
  {
    key: "bookVenue",
    title: "Book Venue",
    icon: CalendarDays,
    path: "/faculty/book-venue",
  },
  {
    key: "academicCalendar",
    title: "Academic Calendar",
    icon: CalendarDays,
    path: "/faculty/academic-calendar",
  },
  {
    key: "myBookings",
    title: "My Bookings",
    icon: ClipboardList,
    path: "/faculty/my-bookings",
  },
  {
    key: "venueHistory",
    title: "Venue Usage History",
    icon: History,
    path: "/faculty/venue-history",
  },
  {
    key: "venueFeedback",
    title: "Venue Feedback",
    icon: MessageSquare,
    path: "/faculty/venue-feedback",
  },
  {
    key: "notifications",
    title: "Notifications",
    icon: Bell,
    path: "/faculty/notifications",
  },
  {
    key: "profile",
    title: "Profile",
    icon: User,
    path: "/faculty/profile",
  },
];

const MIN_WIDTH = 220;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 288;

const FacultySidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const resizing = useRef(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("staffId");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("facultyName");
    localStorage.removeItem("staffName");
    localStorage.removeItem("name");

    navigate("/");
  };

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  const startResize = (e) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;

    e.preventDefault();
    e.stopPropagation();

    resizing.current = true;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!resizing.current) return;

      const newWidth = Math.min(
        Math.max(e.clientX, MIN_WIDTH),
        MAX_WIDTH
      );

      setWidth(newWidth);
    };

    const stopResize = () => {
      if (!resizing.current) return;

      resizing.current = false;

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar
          fixed inset-y-0 left-0 z-40 flex flex-col overflow-x-hidden
          bg-blue-900 text-white shadow-2xl
          transition-[margin-left,transform,opacity] duration-300 ease-in-out
          lg:static lg:min-h-screen lg:flex-shrink-0
          ${isOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none lg:translate-x-0"}
        `}
        style={{
          width: `${width}px`,
          marginLeft: isDesktop ? (isOpen ? 0 : `-${width}px`) : 0,
        }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="border-b border-blue-800 p-6 min-w-0">
          <h1 className="text-xl font-bold break-words min-w-0">
            {t("appName")}
          </h1>

          <p className="mt-1 text-sm text-blue-200 break-words min-w-0">
            {t("facultyPortal")}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl p-3 min-w-0 transition-all duration-200 ${
                    isActive
                      ? "bg-white text-blue-900 shadow-md font-semibold"
                      : "text-blue-50 hover:bg-blue-800 hover:text-white"
                  }`
                }
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                />

                <span className="flex-1 min-w-0 break-words text-sm font-medium leading-snug text-left">
                  {t(`nav.${item.key}`, item.title)}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-blue-800 p-3.5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-blue-50 transition hover:bg-red-700 font-medium min-w-0"
          >
            <LogOut
              size={18}
              className="flex-shrink-0"
            />

            <span className="flex-1 min-w-0 break-words text-sm">{t("nav.logout")}</span>
          </button>
        </div>

        {/* Resize handle - desktop only */}
        {isOpen && (
          <div
            onPointerDown={startResize}
            className="
              absolute right-0 top-0 z-50 hidden h-full w-2
              cursor-col-resize
              lg:block
            "
            title="Drag to resize sidebar"
          >
            <div className="h-full w-1 bg-transparent transition-colors hover:bg-blue-400" />
          </div>
        )}
      </aside>
    </>
  );
};

export default FacultySidebar;
