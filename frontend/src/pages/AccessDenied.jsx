import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

const AccessDenied = ({ permission }) => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "";

  const getDashboardPath = () => {
    if (role === "MASTER_ADMIN" || role === "admin") return "/admin/dashboard";
    if (role === "DEPARTMENT_ADMIN") return "/admin/dashboard";
    return "/faculty/dashboard";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert size={36} />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-6">
          You do not have permission to access this module.
          {permission && (
            <span className="block mt-2 font-mono text-xs text-red-600 bg-red-50 py-1 px-2 rounded-md">
              Required Permission: {permission}
            </span>
          )}
        </p>

        <p className="text-xs text-slate-400 mb-6">
          If you believe you should have access to this feature, please contact your College Master Administrator to grant the appropriate permissions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition cursor-pointer"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          <Link
            to={getDashboardPath()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition shadow-sm cursor-pointer"
          >
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
