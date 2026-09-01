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
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminDashboard } from "../../api/dashboardApi";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await getAdminDashboard();
        setData(resp);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderStatCard = (Icon, label, value) => (
    <div className="bg-white rounded-xl shadow p-6">
      <Icon className="text-blue-600 mb-3" size={32} />
      <h2 className="text-2xl font-bold">{loading ? "-" : value}</h2>
      <p className="text-gray-500">{label}</p>
    </div>
  );

  const stats = data && [
    { icon: Users, label: "Total Faculty", value: data.totalFaculty },
    { icon: Building2, label: "Total Venues", value: data.totalVenues },
    { icon: CalendarCheck, label: "Today's Bookings", value: data.todaysBookings },
    { icon: CheckCircle, label: "Available Venues Today", value: data.availableVenuesToday },
    { icon: Users, label: "Active Venues", value: data.activeVenues },
    { icon: Users, label: "Total Admins", value: data.totalAdmins },
    { icon: Users, label: "Pending Bookings", value: data.pendingBookings },
    { icon: Users, label: "Approved Bookings", value: data.approvedBookings },
    { icon: Users, label: "Rejected Bookings", value: data.rejectedBookings },
    { icon: Users, label: "Cancelled Bookings", value: data.cancelledBookings },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome, Admin 👋</h1>
          <p className="text-gray-500 mt-2">{today}</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {error && (
            <div className="col-span-full text-center text-red-600" role="alert">
              {error}
            </div>
          )}
          {stats && stats.map((s, idx) => (
            <React.Fragment key={idx}>
              {renderStatCard(s.icon, s.label, s.value)}
            </React.Fragment>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Link
              to="/venue-management"
              className="bg-blue-50 rounded-xl p-6 text-center hover:bg-blue-100 transition"
            >
              <BookOpen size={42} className="mx-auto text-blue-600 mb-3" />
              <p className="font-semibold">Venue Management</p>
            </Link>

            <Link
              to="/admin/bookings"
              className="bg-purple-50 rounded-xl p-6 text-center hover:bg-purple-100 transition"
            >
              <ClipboardList size={42} className="mx-auto text-purple-600 mb-3" />
              <p className="font-semibold">Booking Requests</p>
            </Link>

            <Link
              to="/faculty-management"
              className="bg-green-50 rounded-xl p-6 text-center hover:bg-green-100 transition"
            >
              <UserPlus size={42} className="mx-auto text-green-600 mb-3" />
              <p className="font-semibold">Faculty Management</p>
            </Link>

            <Link
              to="/admin/reports"
              className="bg-orange-50 rounded-xl p-6 text-center hover:bg-orange-100 transition"
            >
              <PlusCircle size={42} className="mx-auto text-orange-600 mb-3" />
              <p className="font-semibold">Reports</p>
            </Link>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Bookings</h2>
          {loading && <p className="text-center text-gray-500 py-10">Loading...</p>}
          {data && data.recentBookings && data.recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 text-slate-700">
                    <th className="px-4 py-2 font-semibold">Faculty</th>
                    <th className="px-4 py-2 font-semibold">Venue</th>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Time</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{b.facultyName || b.staff_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{b.venueName || b.hall_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{String(b.date || "").slice(0, 10)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{(b.timeFrom || b.time_from || "").slice(0, 5)} - {(b.timeTo || b.time_to || "").slice(0, 5)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                          b.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                          b.status === "Pending" ? "bg-amber-100 text-amber-800" :
                          b.status === "Rejected" ? "bg-rose-100 text-rose-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
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
              <div className="text-center text-gray-400 py-10">No recent bookings available.</div>
            )
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;