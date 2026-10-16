import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import AIChatbot from "../components/chatbot/AIChatbot";
import { syncUserSession } from "../utils/authSync";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    syncUserSession();
  }, []);

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
    <div className="app-shell flex min-h-screen w-full bg-gray-100 relative overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
        {/* Topbar */}
        <Topbar toggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Floating AI Chatbot */}
      <AIChatbot />
    </div>
  );
};

export default AdminLayout;
