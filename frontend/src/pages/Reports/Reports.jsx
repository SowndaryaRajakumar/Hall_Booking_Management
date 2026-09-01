import { useState, useEffect } from "react";
import {
  BarChart3,
  Building2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { getReportsData } from "../../api/reportsApi";
import Pagination from "../../components/Pagination";

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportsData({ page, limit: 10 });
        setReports(data);
        setPagination(data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
        if (page > 1 && page > (data?.pagination?.totalPages || 0)) setPage(1);
      } catch (err) {
        console.error("Error loading reports:", err);
        setError(err.message || "Failed to load reports data.");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [page]);

  const summary = reports?.summary || {};

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time breakdown of booking requests, venue statistics, and faculty usage.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
            <LoaderCircle size={24} className="mr-2 animate-spin text-blue-600" />
            Generating reports data from database...
          </div>
        ) : (
          <>
            {/* Metric Summary Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Bookings
                  </span>
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-800">
                  {summary.totalBookings ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Pending Bookings
                  </span>
                  <Clock className="text-amber-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-amber-900">
                  {summary.pendingBookings ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Approved Bookings
                  </span>
                  <CheckCircle className="text-emerald-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-emerald-900">
                  {summary.approvedBookings ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                    Rejected Bookings
                  </span>
                  <XCircle className="text-rose-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-rose-900">
                  {summary.rejectedBookings ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Cancelled Bookings
                  </span>
                  <Ban className="text-slate-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-800">
                  {summary.cancelledBookings ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Venues
                  </span>
                  <Building2 className="text-indigo-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-800">
                  {summary.totalVenues ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Active Venues
                  </span>
                  <Building2 className="text-teal-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-teal-900">
                  {summary.activeVenues ?? 0}
                </div>
              </div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Bookings by Venue */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Building2 className="text-blue-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">Bookings by Venue</h2>
                </div>
                {reports?.bookingsByVenue && reports.bookingsByVenue.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Venue Name</th>
                        <th className="px-4 py-2 font-semibold text-right">Total Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.bookingsByVenue.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{row.venueName}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-700">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center py-6 text-sm text-slate-400">No venue data recorded yet.</p>
                )}
              </div>

              {/* Bookings by Faculty */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Users className="text-green-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">Top Bookings by Faculty</h2>
                </div>
                {reports?.bookingsByFaculty && reports.bookingsByFaculty.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Faculty</th>
                        <th className="px-4 py-2 font-semibold text-right">Bookings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.bookingsByFaculty.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-700">{row.facultyName}</div>
                            <div className="text-xs text-slate-400">{row.email}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center py-6 text-sm text-slate-400">No faculty booking data recorded yet.</p>
                )}
              </div>
            </div>

            {/* Bookings by Date */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                <Calendar className="text-purple-600" size={20} />
                <h2 className="text-lg font-bold text-slate-800">Bookings by Date (Recent 30 Days)</h2>
              </div>
              {reports?.bookingsByDate && reports.bookingsByDate.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-4 py-2 font-semibold text-right">Booking Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.bookingsByDate.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{row.bookingDate}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-purple-700">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-6 text-sm text-slate-400">No date-wise booking data recorded yet.</p>
              )}
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Reports;
