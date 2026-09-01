import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/faculty/dashboard",
  },
  {
    title: "Book Venue",
    icon: CalendarDays,
    path: "/faculty/book-venue",
  },
  {
    title: "My Bookings",
    icon: ClipboardList,
    path: "/faculty/my-bookings",
  },
  {
    title: "Profile",
    icon: User,
    path: "/faculty/profile",
  },
];

const MIN_WIDTH = 220;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 288;

const FacultySidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
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

  const startResize = (e) => {
    // Resize only on desktop
    if (window.innerWidth < 1024) return;

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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          bg-blue-900 text-white shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:flex-shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          width: `${width}px`,
        }}
      >
        {/* Header */}
        <div className="border-b border-blue-800 p-6">
          <h1 className="whitespace-nowrap text-xl font-bold">
            NEC Venue Portal
          </h1>

          <p className="mt-1 whitespace-nowrap text-sm text-blue-200">
            Faculty Portal
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
                  `flex items-center gap-3 rounded-xl p-3 whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-white text-blue-900 shadow-md"
                      : "text-blue-50 hover:bg-blue-800 hover:text-white"
                  }`
                }
              >
                <Icon
                  size={18}
                  className="flex-shrink-0"
                />

                <span className="font-medium">
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-blue-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-blue-50 transition hover:bg-red-700"
          >
            <LogOut
              size={18}
              className="flex-shrink-0"
            />

            <span>Logout</span>
          </button>
        </div>

        {/* Resize handle - desktop only */}
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
      </aside>
    </>
  );
};

export default FacultySidebar;