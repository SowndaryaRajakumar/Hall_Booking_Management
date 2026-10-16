import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  CalendarCheck,
  CheckCircle,
  BookOpen,
  ClipboardList,
  UserPlus,
  PlusCircle,
  ShieldCheck,
  KeyRound,
  FileText,
  School,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  MessageSquareWarning,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminDashboard } from "../../api/dashboardApi";
import { getMasterDashboard } from "../../api/masterAdminApi";
import { getDepartmentDashboard } from "../../api/departmentAdminApi";
import { normalizeRole } from "../../routes/PermissionRoute";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rawRole = localStorage.getItem("role") || "";
  const role = normalizeRole(rawRole);
  const isMasterAdmin = role === "MASTER_ADMIN";

  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    storedUser = {};
  }
  const userName = storedUser.full_name || storedUser.name || "Admin";
  const userDept = storedUser.department || "";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isMasterAdmin) {
          const resp = await getMasterDashboard();
          setData(resp);
        } else if (role === "DEPARTMENT_ADMIN") {
          try {
            const resp = await getDepartmentDashboard();
            setData(resp);
          } catch (deptErr) {
            // Fallback to legacy dashboard endpoint if needed
            const legacy = await getAdminDashboard();
            setData(legacy);
          }
        } else {
          const resp = await getAdminDashboard();
          setData(resp);
        }
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isMasterAdmin, role]);

  const renderStatCard = (Icon, label, value, colorClass = "text-blue-600 bg-blue-50") => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={24} />
        </div>
        <span className="text-2xl font-bold text-gray-800">{loading ? "..." : (value ?? 0)}</span>
      </div>
      <p className="text-gray-500 text-sm font-medium mt-3">{label}</p>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isMasterAdmin ? "bg-amber-400 text-blue-950 font-bold" : "bg-blue-700 text-white"
              }`}>
                {isMasterAdmin ? "★ MASTER ADMIN" : `${userDept || "Department"} Admin`}
              </span>
              <span className="text-blue-200 text-xs">• {today}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {userName} 👋
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {isMasterAdmin
                ? "Full college-wide management of departments, venues, and administrative permissions."
                : `Managing venue allocations and faculty requests for ${userDept || "your department"}.`}
            </p>
          </div>

          {isMasterAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                to="/admin/department-admins"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl text-xs font-semibold transition border border-white/20"
              >
                Manage Admins
              </Link>
              <Link
                to="/admin/audit-logs"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-blue-950 rounded-xl text-xs font-bold transition shadow-sm"
              >
                View Audit Trail
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Master Admin Statistics */}
        {isMasterAdmin && data && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              College-wide Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {renderStatCard(School, "Active Departments", data.totalDepartments, "text-indigo-600 bg-indigo-50")}
              {renderStatCard(Users, "Department Admins", data.totalDepartmentAdmins, "text-blue-600 bg-blue-50")}
              {renderStatCard(Users, "Total Faculty", data.totalFaculty, "text-emerald-600 bg-emerald-50")}
              {renderStatCard(Building2, "Total Venues", data.totalVenues, "text-purple-600 bg-purple-50")}
              {renderStatCard(Building2, "Common Venues", data.commonVenues, "text-cyan-600 bg-cyan-50")}
              {renderStatCard(Building2, "Dept Venues", data.departmentVenues, "text-indigo-600 bg-indigo-50")}
              {renderStatCard(CalendarCheck, "Today's Bookings", data.todaysBookings, "text-amber-600 bg-amber-50")}
              {renderStatCard(ClipboardList, "Pending Requests", data.pendingRequests, "text-rose-600 bg-rose-50")}
              {renderStatCard(CheckCircle, "Approved Bookings", data.approvedBookings, "text-emerald-600 bg-emerald-50")}
              {renderStatCard(Calendar, "Academic Allocations", data.totalAcademicAllocations, "text-blue-600 bg-blue-50")}
              {renderStatCard(ClipboardList, "Pending Allocations", data.pendingAcademicAllocations, "text-amber-600 bg-amber-50")}
              {renderStatCard(MessageSquareWarning, "Open Venue Issues", data.openVenueComplaints, "text-rose-600 bg-rose-50")}
              {renderStatCard(AlertTriangle, "High Priority Issues", data.highPriorityIssues, "text-red-600 bg-red-50")}
            </div>
          </div>
        )}

        {/* Department Admin Statistics */}
        {!isMasterAdmin && data && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Department Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {renderStatCard(Users, "Department Faculty", data.totalFaculty, "text-blue-600 bg-blue-50")}
              {renderStatCard(Building2, "Department Venues", data.totalVenues, "text-purple-600 bg-purple-50")}
              {renderStatCard(CheckCircle, "Active Venues", data.activeVenues, "text-emerald-600 bg-emerald-50")}
              {renderStatCard(ClipboardList, "Pending Requests", data.pendingBookings, "text-amber-600 bg-amber-50")}
              {renderStatCard(CheckCircle, "Approved Bookings", data.approvedBookings, "text-teal-600 bg-teal-50")}
              {renderStatCard(Calendar, "Semester Allocations", data.academicAllocations, "text-indigo-600 bg-indigo-50")}
              {renderStatCard(ClipboardList, "Pending Allocations", data.pendingAcademicAllocations, "text-rose-600 bg-rose-50")}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Quick Operations</h2>

          {isMasterAdmin ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                to="/admin/department-admins"
                className="group p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl hover:shadow-md transition text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Department Admins</h3>
                <p className="text-xs text-gray-500 mt-1">Manage & create admins</p>
              </Link>

              <Link
                to="/admin/permissions"
                className="group p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl hover:shadow-md transition text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <KeyRound size={26} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Permission Matrix</h3>
                <p className="text-xs text-gray-500 mt-1">Dynamic feature toggles</p>
              </Link>

              <Link
                to="/venue-management?type=COMMON"
                className="group p-5 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 rounded-xl hover:shadow-md transition text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <Building2 size={26} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Common Venues</h3>
                <p className="text-xs text-gray-500 mt-1">College-wide resources</p>
              </Link>

              <Link
                to="/admin/audit-logs"
                className="group p-5 bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-xl hover:shadow-md transition text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <FileText size={26} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">System Audit Trail</h3>
                <p className="text-xs text-gray-500 mt-1">Security & activity logs</p>
              </Link>

              <Link
                to="/venue-management"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <BookOpen size={22} className="mx-auto text-blue-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">All Venues</span>
              </Link>

              <Link
                to="/admin/bookings"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <ClipboardList size={22} className="mx-auto text-purple-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">All Bookings</span>
              </Link>

              <Link
                to="/faculty-management"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <UserPlus size={22} className="mx-auto text-green-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">Faculty Directory</span>
              </Link>

              <Link
                to="/admin/academic-allocations"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <Calendar size={22} className="mx-auto text-indigo-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">Semester Allocations</span>
              </Link>

              <Link
                to="/admin/venue-feedback"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <MessageSquareWarning size={22} className="mx-auto text-rose-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">Venue Feedback</span>
              </Link>

              <Link
                to="/admin/reports"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-center border border-gray-200"
              >
                <PlusCircle size={22} className="mx-auto text-orange-600 mb-2" />
                <span className="font-medium text-xs text-gray-700 block">College Reports</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Link
                to="/venue-management"
                className="bg-blue-50 hover:bg-blue-100 rounded-xl p-5 text-center transition border border-blue-100"
              >
                <BookOpen size={32} className="mx-auto text-blue-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Dept Venues</p>
                <span className="text-xs text-gray-500">Manage labs</span>
              </Link>

              <Link
                to="/admin/bookings"
                className="bg-purple-50 hover:bg-purple-100 rounded-xl p-5 text-center transition border border-purple-100"
              >
                <ClipboardList size={32} className="mx-auto text-purple-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Bookings</p>
                <span className="text-xs text-gray-500">Approve</span>
              </Link>

              <Link
                to="/admin/academic-allocations"
                className="bg-indigo-50 hover:bg-indigo-100 rounded-xl p-5 text-center transition border border-indigo-100"
              >
                <Calendar size={32} className="mx-auto text-indigo-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Allocations</p>
                <span className="text-xs text-gray-500">Semester</span>
              </Link>

              <Link
                to="/admin/academic-calendar"
                className="bg-cyan-50 hover:bg-cyan-100 rounded-xl p-5 text-center transition border border-cyan-100"
              >
                <Clock size={32} className="mx-auto text-cyan-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Academic Cal</p>
                <span className="text-xs text-gray-500">Timetable</span>
              </Link>

              <Link
                to="/faculty-management"
                className="bg-green-50 hover:bg-green-100 rounded-xl p-5 text-center transition border border-green-100"
              >
                <UserPlus size={32} className="mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Faculty</p>
                <span className="text-xs text-gray-500">Staff</span>
              </Link>

              <Link
                to="/admin/reports"
                className="bg-orange-50 hover:bg-orange-100 rounded-xl p-5 text-center transition border border-orange-100"
              >
                <PlusCircle size={32} className="mx-auto text-orange-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Reports</p>
                <span className="text-xs text-gray-500">Stats</span>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Recent Booking Requests</h2>
            <Link
              to="/admin/bookings"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {loading && (
            <p className="text-center text-gray-400 py-10">Loading recent bookings...</p>
          )}

          {data && data.recentBookings && data.recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-slate-700 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold text-xs">Faculty</th>
                    <th className="px-4 py-3 font-semibold text-xs">Venue</th>
                    {isMasterAdmin && (
                      <th className="px-4 py-3 font-semibold text-xs">Dept / Type</th>
                    )}
                    <th className="px-4 py-3 font-semibold text-xs">Date</th>
                    <th className="px-4 py-3 font-semibold text-xs">Time</th>
                    <th className="px-4 py-3 font-semibold text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-xs">
                          {b.facultyName || b.staff_name}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {b.facultyEmail || b.staff_email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                        {b.venueName || b.hall_name}
                      </td>
                      {isMasterAdmin && (
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            b.ownership_type === "COMMON"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {b.ownership_type || "DEPT"} • {b.department || "General"}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {String(b.date || "").slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {(b.timeFrom || b.time_from || "").slice(0, 5)} - {(b.timeTo || b.time_to || "").slice(0, 5)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                            b.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : b.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && (
              <div className="text-center text-gray-400 py-10 text-sm">
                No recent booking requests recorded.
              </div>
            )
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;