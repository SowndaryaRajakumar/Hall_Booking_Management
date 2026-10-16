import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Bell,
  TrendingUp,
  BarChart3,
  User,
  LogOut,
  ShieldCheck,
  KeyRound,
  Building,
  FileText,
  Sliders,
  MessageSquare,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { normalizeRole } from "../../routes/PermissionRoute";
import { syncUserSession } from "../../utils/authSync";

const allMenuItems = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
    permission: "VIEW_DASHBOARD",
  },
  {
    key: "departmentAdmins",
    title: "Department Admins",
    icon: ShieldCheck,
    path: "/admin/department-admins",
    masterOnly: true,
  },
  {
    key: "accessControl",
    title: "Access & Permissions",
    icon: KeyRound,
    path: "/admin/permissions",
    masterOnly: true,
  },
  {
    key: "venueFeedback",
    title: "Venue Feedback & Issues",
    icon: MessageSquare,
    path: "/admin/venue-feedback",
    permission: ["MANAGE_VENUE_FEEDBACK", "SUBMIT_VENUE_FEEDBACK", "VIEW_DEPARTMENT_FEEDBACK"],
  },
  {
    key: "academicCalendar",
    title: "Academic Allocations",
    icon: CalendarDays,
    path: "/admin/academic-calendar",
    permission: "VIEW_ACADEMIC_CALENDAR",
  },
  {
    key: "notificationSettings",
    title: "Notification Settings",
    icon: Sliders,
    path: "/admin/notification-settings",
    masterOnly: true,
  },
  {
    key: "facultyManagement",
    title: "Faculty Management",
    icon: Users,
    path: "/faculty-management",
    permission: "MANAGE_FACULTY",
  },
  {
    key: "venueManagement",
    title: "Venue Management",
    icon: Building2,
    path: "/venue-management",
    permission: ["MANAGE_VENUES", "MANAGE_DEPARTMENT_VENUES"],
  },
  {
    key: "timetable",
    title: "Timetable",
    icon: CalendarDays,
    path: "/admin/timetable",
    permission: ["VIEW_TIMETABLE", "VIEW_BOOKINGS"],
  },
  {
    key: "bookVenue",
    title: "Book Venue",
    icon: CalendarPlus,
    path: "/admin/book-venue",
    permission: ["VIEW_BOOKINGS", "MANAGE_BOOKINGS"],
  },
  {
    key: "bookings",
    title: "Bookings",
    icon: ClipboardList,
    path: "/admin/bookings",
    permission: ["VIEW_BOOKINGS", "MANAGE_BOOKINGS"],
  },
  {
    key: "reports",
    title: "Reports",
    icon: BarChart3,
    path: "/admin/reports",
    permission: "VIEW_REPORTS",
  },
  {
    key: "auditLogs",
    title: "Audit Logs",
    icon: FileText,
    path: "/admin/audit-logs",
    masterOnly: true,
  },
  {
    key: "analytics",
    title: "Analytics",
    icon: TrendingUp,
    path: "/admin/analytics",
    permission: ["VIEW_ANALYTICS", "VIEW_REPORTS"],
  },
  {
    key: "notifications",
    title: "Notifications",
    icon: Bell,
    path: "/admin/notifications",
    permission: "VIEW_NOTIFICATIONS",
  },
  {
    key: "profile",
    title: "Profile",
    icon: User,
    path: "/admin/profile",
  },
];

const facultyMenuItems = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/faculty/dashboard",
  },
  {
    key: "bookVenue",
    title: "Book Venue",
    icon: CalendarPlus,
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
    icon: CalendarDays,
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
const DEFAULT_WIDTH = 270;

const Sidebar = ({ isOpen, onClose }) => {
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

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [currentRole, setCurrentRole] = useState(() => {
    const stored = localStorage.getItem("role");
    if (stored) return normalizeRole(stored);
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return normalizeRole(u?.role || "");
    } catch {
      return "";
    }
  });

  const [currentPermissions, setCurrentPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
      return [];
    }
  });

  const [department, setDepartment] = useState(() => {
    return localStorage.getItem("department") || "";
  });

  // Safe authenticated user role (handles initial load / undefined safely)
  const role = currentRole || normalizeRole(user?.role) || normalizeRole(localStorage.getItem("role") || "");

  // Reactive Permission Sync on Mount and Listeners
  useEffect(() => {
    syncUserSession();

    const handlePermissionsUpdated = (e) => {
      if (e.detail?.permissions) {
        setCurrentPermissions(e.detail.permissions);
      }
      if (e.detail?.role) {
        setCurrentRole(normalizeRole(e.detail.role));
      }
      if (e.detail?.user) {
        setUser(e.detail.user);
        if (e.detail.user.department) {
          setDepartment(e.detail.user.department);
        }
      }
    };

    const handleStorageChange = () => {
      const storedRole = localStorage.getItem("role") || "";
      setCurrentRole(normalizeRole(storedRole));
      const storedDept = localStorage.getItem("department") || "";
      setDepartment(storedDept);
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "{}"));
      } catch {
        setUser({});
      }
      try {
        setCurrentPermissions(JSON.parse(localStorage.getItem("permissions") || "[]"));
      } catch {
        setCurrentPermissions([]);
      }
    };

    window.addEventListener("permissions-updated", handlePermissionsUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("permissions-updated", handlePermissionsUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const hasPermission = (itemPerm) => {
    if (!itemPerm) return true;
    if (Array.isArray(itemPerm)) {
      return itemPerm.some((p) => currentPermissions.includes(p));
    }
    return currentPermissions.includes(itemPerm);
  };

  const visibleMenuItems = (() => {
    if (role === "FACULTY") {
      return facultyMenuItems;
    }
    if (role === "MASTER_ADMIN") {
      return allMenuItems;
    }
    // DEPARTMENT_ADMIN
    return allMenuItems.filter((item) => {
      if (item.masterOnly) return false;
      if (item.permission) {
        return hasPermission(item.permission);
      }
      return true;
    });
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    localStorage.removeItem("staffId");
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
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col overflow-x-hidden bg-blue-900 text-white shadow-2xl transition-[margin-left,transform,opacity] duration-300 ease-in-out lg:static lg:min-h-screen lg:flex-shrink-0 ${
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-full opacity-0 pointer-events-none lg:translate-x-0"
        }`}
        style={{
          width: `${width}px`,
          marginLeft: isDesktop ? (isOpen ? 0 : `-${width}px`) : 0,
        }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="border-b border-blue-700 p-6 min-w-0">
          <h1 className="text-xl font-bold break-words min-w-0">
            {t("appName")}
          </h1>

          <p className="mt-1 text-xs text-blue-200 break-words min-w-0">
            {t("appSubtitle")}
          </p>

          {/* Role & Department Badge */}
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                role === "MASTER_ADMIN"
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/30"
                  : role === "FACULTY"
                  ? "bg-emerald-800 text-emerald-100 border border-emerald-600/50"
                  : "bg-blue-800 text-blue-100 border border-blue-600/50"
              }`}
            >
              {role === "MASTER_ADMIN"
                ? "★ Master Admin"
                : role === "FACULTY"
                ? `${department ? department + " " : ""}Faculty`
                : `${department || "Dept"} Admin`}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg p-3 min-w-0 transition-all ${
                    isActive
                      ? "bg-white text-blue-900 font-semibold shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                  }`
                }
              >
                <Icon
                  size={20}
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
        <button
          type="button"
          onClick={handleLogout}
          className="m-3.5 flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-red-700 font-medium text-left min-w-0"
        >
          <LogOut
            size={20}
            className="flex-shrink-0"
          />

          <span className="flex-1 min-w-0 break-words text-sm">{t("nav.logout")}</span>
        </button>

        {/* Resize Handle - desktop only */}
        {isOpen && (
          <div
            onPointerDown={startResize}
            className="absolute right-0 top-0 z-50 hidden h-full w-2 cursor-col-resize lg:block"
            title="Drag to resize sidebar"
          >
            <div className="h-full w-px bg-transparent transition-colors hover:bg-blue-400" />
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
