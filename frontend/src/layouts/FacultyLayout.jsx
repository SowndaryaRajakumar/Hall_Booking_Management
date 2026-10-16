import { useState, useEffect } from "react";
import FacultySidebar from "../components/faculty/FacultySidebar";
import FacultyTopbar from "../components/faculty/FacultyTopbar";
import AIChatbot from "../components/chatbot/AIChatbot";

const FacultyLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    let prevWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // If crossing from mobile to desktop, default to open
      if (prevWidth < 1024 && currentWidth >= 1024) {
        setSidebarOpen(true);
      }
      // If crossing from desktop to mobile, default to closed
      else if (prevWidth >= 1024 && currentWidth < 1024) {
        setSidebarOpen(false);
      }
      prevWidth = currentWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="app-shell flex min-h-screen w-full bg-slate-100 text-slate-800 relative overflow-x-hidden">
      {/* Sidebar */}
      <FacultySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
        <FacultyTopbar toggleSidebar={toggleSidebar} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default FacultyLayout;
