import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-100">

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <Topbar toggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;
