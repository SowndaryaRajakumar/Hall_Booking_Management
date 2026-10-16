import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  FileText,
  FileSpreadsheet,
  FileDown,
  Download,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminLayout from "../../layouts/AdminLayout";
import { getReportsData, exportReportFile } from "../../api/reportsApi";
import { getAllHalls } from "../../api/hallApi";
import { getDepartments } from "../../api/departmentApi";
import { getAllStaff } from "../../api/staffApi";
import Pagination from "../../components/Pagination";
import BookingStatusBadge from "../../components/faculty/BookingStatusBadge";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

const Reports = () => {
  const { t } = useTranslation();

  // Report state
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [venueId, setVenueId] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [facultyId, setFacultyId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Dropdown options
  const [venues, setVenues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Pagination for the detailed filtered bookings table
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Export loading state: 'filtered-pdf' | 'filtered-excel' | 'all-pdf' | 'all-excel' | null
  const [exporting, setExporting] = useState(null);

  // Load dropdown master data on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [hallsRes, deptsRes, staffRes] = await Promise.allSettled([
          getAllHalls({ limit: 100 }),
          getDepartments({ limit: 100 }),
          token ? getAllStaff(token, { limit: 100 }) : Promise.resolve({ data: [] }),
        ]);

        if (hallsRes.status === "fulfilled" && Array.isArray(hallsRes.value?.data)) {
          setVenues(hallsRes.value.data);
        }
        if (deptsRes.status === "fulfilled" && Array.isArray(deptsRes.value)) {
          setDepartments(deptsRes.value);
        } else if (deptsRes.status === "fulfilled" && Array.isArray(deptsRes.value?.data)) {
          setDepartments(deptsRes.value.data);
        }
        if (staffRes.status === "fulfilled" && Array.isArray(staffRes.value?.data)) {
          setStaffList(staffRes.value.data);
        }
      } catch (err) {
        console.error("Error loading filter dropdown data:", err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch report data whenever filters or page changes
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReportsData({
        page,
        limit: 10,
        fromDate,
        toDate,
        venueId,
        departmentId,
        facultyId,
        status: statusFilter,
        search: searchTerm,
      });

      setReports(data);
      const nextPagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
      setPagination(nextPagination);

      if (page > 1 && page > (nextPagination.totalPages || 0)) {
        setPage(1);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
      setError(err.message || t("reports.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, venueId, departmentId, facultyId, statusFilter, searchTerm, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setVenueId("all");
    setDepartmentId("all");
    setFacultyId("all");
    setStatusFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    fromDate ||
    toDate ||
    venueId !== "all" ||
    departmentId !== "all" ||
    facultyId !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim()
  );

  // Handle Export (Filtered or All, PDF or Excel)
  const handleExport = async (type, exportAll = false) => {
    const actionKey = `${exportAll ? "all" : "filtered"}-${type}`;
    try {
      setExporting(actionKey);

      const filters = {
        fromDate,
        toDate,
        venueId,
        departmentId,
        facultyId,
        status: statusFilter,
        search: searchTerm,
      };

      const result = await exportReportFile({
        type,
        filters,
        exportAll,
      });

      if (result.success) {
        toast.success(t("reports.exportSuccess", "Report exported successfully."));
      }
    } catch (err) {
      console.error("Export error:", err);
      const msg = err.message || "";
      if (
        msg.includes("No records found") ||
        msg.includes("zero records") ||
        msg.includes("No booking records")
      ) {
        toast.info(msg);
      } else {
        toast.error(err.message || t("reports.exportFailed", "Failed to generate report. Please try again."));
      }
    } finally {
      setExporting(null);
    }
  };

  const summary = reports?.summary || {};
  const records = reports?.records || [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Toast Notifications */}
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{t("reports.heading", "Analytics & Reports")}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t("reports.description", "Real-time breakdown of booking requests, venue statistics, and faculty usage.")}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. FILTER SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Filter size={16} className="text-blue-600" />
              <span>Report Filters</span>
              {hasActiveFilters && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Active
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Faculty, Venue, Purpose..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st.toLowerCase()}>
                    {st === "All" ? "All Statuses" : st}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Venue</label>
              <select
                value={venueId}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="all">All Venues</option>
                {venues.map((v) => (
                  <option key={v.id || v.HallID} value={v.id || v.HallID}>
                    {v.name || v.HallName}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.DeptID || d.id} value={d.DeptID || d.id}>
                    {d.DeptName || d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => {
                  setFacultyId(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="all">All Faculty</option>
                {staffList.map((s) => (
                  <option key={s.staff_id || s.id} value={s.staff_id || s.id}>
                    {s.full_name || s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. EXPORT REPORTS SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Download size={18} className="text-blue-600" />
                <span>Export Reports</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate and download structured official PDF documents and Excel spreadsheets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              {/* Export Filtered PDF */}
              <button
                type="button"
                id="btn-export-filtered-pdf"
                disabled={exporting !== null}
                onClick={() => handleExport("pdf", false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export matching records with active filters to PDF"
              >
                {exporting === "filtered-pdf" ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <FileText size={15} />
                )}
                <span>{exporting === "filtered-pdf" ? "Generating PDF..." : "Export Filtered PDF"}</span>
              </button>

              {/* Export Filtered Excel */}
              <button
                type="button"
                id="btn-export-filtered-excel"
                disabled={exporting !== null}
                onClick={() => handleExport("excel", false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export matching records with active filters to Excel"
              >
                {exporting === "filtered-excel" ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={15} />
                )}
                <span>{exporting === "filtered-excel" ? "Generating Excel..." : "Export Filtered Excel"}</span>
              </button>

              {/* Export All PDF */}
              <button
                type="button"
                id="btn-export-all-pdf"
                disabled={exporting !== null}
                onClick={() => handleExport("pdf", true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export all database records without filters to PDF"
              >
                {exporting === "all-pdf" ? (
                  <LoaderCircle size={15} className="animate-spin text-rose-600" />
                ) : (
                  <FileDown size={15} className="text-rose-600" />
                )}
                <span>{exporting === "all-pdf" ? "Generating PDF..." : "Export All PDF"}</span>
              </button>

              {/* Export All Excel */}
              <button
                type="button"
                id="btn-export-all-excel"
                disabled={exporting !== null}
                onClick={() => handleExport("excel", true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export all database records without filters to Excel"
              >
                {exporting === "all-excel" ? (
                  <LoaderCircle size={15} className="animate-spin text-emerald-600" />
                ) : (
                  <Download size={15} className="text-emerald-600" />
                )}
                <span>{exporting === "all-excel" ? "Generating Excel..." : "Export All Excel"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. METRIC SUMMARY CARDS */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
            <LoaderCircle size={24} className="mr-2 animate-spin text-blue-600" />
            {t("reports.loading", "Generating reports data from database...")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("reports.totalBookings", "Total Bookings")}
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
                    {t("reports.pendingBookings", "Pending Bookings")}
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
                    {t("reports.approvedBookings", "Approved Bookings")}
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
                    {t("reports.rejectedBookings", "Rejected Bookings")}
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
                    {t("reports.cancelledBookings", "Cancelled Bookings")}
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
                    {t("reports.totalVenues", "Total Venues")}
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
                    {t("reports.activeVenues", "Active Venues")}
                  </span>
                  <Building2 className="text-teal-600" size={24} />
                </div>
                <div className="mt-4 text-3xl font-bold text-teal-900">
                  {summary.activeVenues ?? 0}
                </div>
              </div>
            </div>

            {/* 4. FILTERED REPORT BOOKINGS TABLE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-blue-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">
                    {hasActiveFilters ? "Filtered Report Records" : "All Report Records"}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {pagination.total} total
                  </span>
                </div>
              </div>

              {records && records.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">ID</th>
                        <th className="px-3.5 py-2.5 font-semibold">Faculty</th>
                        <th className="px-3.5 py-2.5 font-semibold">Department</th>
                        <th className="px-3.5 py-2.5 font-semibold">Venue</th>
                        <th className="px-3.5 py-2.5 font-semibold">Date & Time</th>
                        <th className="px-3.5 py-2.5 font-semibold">Purpose</th>
                        <th className="px-3.5 py-2.5 font-semibold text-center">Status</th>
                        <th className="px-3.5 py-2.5 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3.5 py-3 font-semibold text-slate-700">#{row.id}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-800">{row.staff_name || "-"}</div>
                            <div className="text-xs text-slate-400">{row.staff_email || ""}</div>
                          </td>
                          <td className="px-3.5 py-3 text-slate-600">{row.department || "-"}</td>
                          <td className="px-3.5 py-3 font-medium text-slate-700">{row.hall_name || "-"}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-800">{row.formatted_date || row.booking_date}</div>
                            <div className="text-xs text-slate-400">{row.formatted_time || "-"}</div>
                          </td>
                          <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate" title={row.display_purpose}>
                            {row.display_purpose || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <BookingStatusBadge status={row.status} />
                          </td>
                          <td className="px-3.5 py-3 text-xs text-slate-500 max-w-xs truncate" title={row.display_remarks}>
                            {row.display_remarks || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No records found for the selected filters.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try adjusting or clearing your filters to view report records.
                  </p>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
              )}
            </div>

            {/* 5. DETAILED CHARTS / BREAKDOWNS (Preserving existing layout) */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Bookings by Venue */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Building2 className="text-blue-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">{t("reports.byVenue", "Bookings by Venue")}</h2>
                </div>
                {reports?.bookingsByVenue && reports.bookingsByVenue.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">{t("reports.venueName", "Venue Name")}</th>
                        <th className="px-4 py-2 font-semibold text-right">{t("reports.totalBookings", "Total Bookings")}</th>
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
                  <p className="text-center py-6 text-sm text-slate-400">{t("reports.noVenueData", "No venue data recorded yet.")}</p>
                )}
              </div>

              {/* Bookings by Faculty */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Users className="text-green-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-800">{t("reports.byFaculty", "Top Bookings by Faculty")}</h2>
                </div>
                {reports?.bookingsByFaculty && reports.bookingsByFaculty.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">{t("dashboard.faculty", "Faculty")}</th>
                        <th className="px-4 py-2 font-semibold text-right">{t("reports.bookings", "Bookings")}</th>
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
                  <p className="text-center py-6 text-sm text-slate-400">{t("reports.noFacultyData", "No faculty booking data recorded yet.")}</p>
                )}
              </div>
            </div>

            {/* Bookings by Date */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                <Calendar className="text-purple-600" size={20} />
                <h2 className="text-lg font-bold text-slate-800">{t("reports.byDate", "Bookings by Date (Recent 30 Days)")}</h2>
              </div>
              {reports?.bookingsByDate && reports.bookingsByDate.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-semibold">{t("dashboard.date", "Date")}</th>
                        <th className="px-4 py-2 font-semibold text-right">{t("reports.bookingCount", "Booking Count")}</th>
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
                <p className="text-center py-6 text-sm text-slate-400">{t("reports.noDateData", "No date-wise booking data recorded yet.")}</p>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Reports;
