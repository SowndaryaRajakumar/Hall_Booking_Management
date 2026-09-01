import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  BarChart3,
  User,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    title: "Faculty Management",
    icon: Users,
    path: "/faculty-management",
  },
  {
    title: "Venue Management",
    icon: Building2,
    path: "/venue-management",
  },
  {
    title: "Timetable",
    icon: CalendarDays,
    path: "/admin/timetable",
  },
  {
    title: "Book Venue",
    icon: CalendarPlus,
    path: "/admin/book-venue",
  },
  {
    title: "Bookings",
    icon: ClipboardList,
    path: "/admin/bookings",
  },
  {
    title: "Reports",
    icon: BarChart3,
    path: "/admin/reports",
  },
  {
    title: "Profile",
    icon: User,
    path: "/admin/profile",
  },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const resizing = useRef(false);

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

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();

    resizing.current = true;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

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
      {isOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />}
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-blue-900 text-white shadow-2xl transition-transform duration-300 lg:static lg:min-h-screen lg:flex-shrink-0 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      style={{
        width: `${width}px`,
      }}
    >
      {/* Header */}
      <div className="border-b border-blue-700 p-6">
        <h1 className="whitespace-nowrap text-xl font-bold">
          NEC Venue Portal
        </h1>

        <p className="mt-1 whitespace-nowrap text-xs text-blue-200">
          Smart Classroom Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg p-3 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white text-blue-900"
                    : "hover:bg-blue-800"
                }`
              }
            >
              <Icon
                size={20}
                className="flex-shrink-0"
              />

              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="m-4 flex cursor-pointer items-center gap-3 rounded-lg p-3 whitespace-nowrap transition hover:bg-red-700"
      >
        <LogOut
          size={20}
          className="flex-shrink-0"
        />

        <span>Logout</span>
      </button>

      {/* Resize Handle */}
      <div
        onPointerDown={startResize}
        className="absolute right-0 top-0 z-50 h-full w-2 cursor-col-resize"
        title="Drag to resize sidebar"
      >
        <div className="h-full w-px bg-transparent transition-colors hover:bg-blue-400" />
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
