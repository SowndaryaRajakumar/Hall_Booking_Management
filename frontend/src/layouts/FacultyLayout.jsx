import { useState } from "react";
import FacultySidebar from "../components/faculty/FacultySidebar";
import FacultyTopbar from "../components/faculty/FacultyTopbar";

const FacultyLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <FacultySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col">
          <FacultyTopbar toggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default FacultyLayout;
