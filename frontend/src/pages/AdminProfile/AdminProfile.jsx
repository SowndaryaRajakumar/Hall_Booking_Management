import { useState, useEffect } from "react";
import { User, Mail, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: "System Administrator",
    email: "admin@nec.edu.in",
    role: "admin",
  });

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const storedEmail = localStorage.getItem("email") || storedUser.email;
      const storedRole = localStorage.getItem("role") || storedUser.role;
      setProfile({
        name: storedUser.full_name || storedUser.name || "System Administrator",
        email: storedEmail || "admin@nec.edu.in",
        role: storedRole || "admin",
      });
    } catch (e) {
      console.error("Error reading profile:", e);
    }
  }, []);

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

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Account details and administrative permissions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-bold text-2xl">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{profile.name}</h2>
              <p className="text-xs uppercase tracking-wider font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mt-1">
                {profile.role}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-slate-700">
              <User className="text-slate-400" size={18} />
              <span className="font-semibold w-28">Full Name:</span>
              <span>{profile.name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="text-slate-400" size={18} />
              <span className="font-semibold w-28">Email:</span>
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Shield className="text-slate-400" size={18} />
              <span className="font-semibold w-28">Role:</span>
              <span className="capitalize">{profile.role}</span>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <LogOut size={18} />
              Logout Administrator
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
