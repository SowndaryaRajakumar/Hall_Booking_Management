import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Check,
  Ban,
  Layers,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import AdminLayout from "../../../layouts/AdminLayout";
import { getVenueUtilizationAnalytics, getAvailabilityHeatmap } from "../../../api/analyticsApi";

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const VenueAnalytics = () => {
  const { t, i18n } = useTranslation();

  // Analytics API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Heatmap state & filters
  const [heatmapDate, setHeatmapDate] = useState(getLocalDateString());
  const [heatmapDept, setHeatmapDept] = useState("all");
  const [heatmapType, setHeatmapType] = useState("all");
  const [heatmapSearch, setHeatmapSearch] = useState("");
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Active hover tooltip slot
  const [activeSlot, setActiveSlot] = useState(null);

  // Fetch utilization statistics
  const fetchAnalytics = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await getVenueUtilizationAnalytics();
      if (res?.success) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error(err.message || "Failed to load venue analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch heatmap data on filter change
  const fetchHeatmap = async () => {
    try {
      setHeatmapLoading(true);
      const res = await getAvailabilityHeatmap({
        date: heatmapDate,
        deptId: heatmapDept !== "all" ? heatmapDept : undefined,
        venueType: heatmapType !== "all" ? heatmapType : undefined,
      });

      if (res?.success) {
        setHeatmapData(res.data);
      }
    } catch (err) {
      console.error("Failed to load availability heatmap:", err);
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchHeatmap();
  }, [heatmapDate, heatmapDept, heatmapType]);

  const summary = analyticsData?.summary || {};
  const venueUtilization = analyticsData?.venueUtilization || [];
  const monthlyTrends = analyticsData?.monthlyTrends || [];
  const departmentUsage = analyticsData?.departmentUsage || [];
  const facilityDemand = analyticsData?.facilityDemand || [];

  // Filtered heatmap venues for in-table search
  const filteredHeatmapVenues = useMemo(() => {
    if (!heatmapData?.venues) return [];
    if (!heatmapSearch.trim()) return heatmapData.venues;
    const term = heatmapSearch.toLowerCase().trim();
    return heatmapData.venues.filter((v) => {
      const name = (v.venueName ?? v.name ?? "").toLowerCase();
      const dept = (v.department ?? "").toLowerCase();
      const type = (v.venueType ?? "").toLowerCase();
      return name.includes(term) || dept.includes(term) || type.includes(term);
    });
  }, [heatmapData, heatmapSearch]);

  // Unique departments and venue types for heatmap dropdowns
  const availableDepts = useMemo(() => {
    const set = new Set();
    venueUtilization.forEach((v) => {
      if (v.department) set.add(v.department);
    });
    return Array.from(set);
  }, [venueUtilization]);

  const availableTypes = useMemo(() => {
    const set = new Set();
    venueUtilization.forEach((v) => {
      if (v.venueType) set.add(v.venueType);
    });
    return Array.from(set);
  }, [venueUtilization]);

  // Max value calculations for dynamic bar widths
  const maxApprovedCount = useMemo(() => {
    if (venueUtilization.length === 0) return 1;
    return Math.max(...venueUtilization.map((v) => v.approvedBookings || 0), 1);
  }, [venueUtilization]);

  const maxDeptCount = useMemo(() => {
    if (departmentUsage.length === 0) return 1;
    return Math.max(...departmentUsage.map((d) => d.count || 0), 1);
  }, [departmentUsage]);

  const maxFacilityCount = useMemo(() => {
    if (facilityDemand.length === 0) return 1;
    return Math.max(...facilityDemand.map((f) => f.demandCount || 0), 1);
  }, [facilityDemand]);

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-700 text-white rounded-xl shadow-md">
                <TrendingUp size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {t("analytics.heading", "Venue Utilization & Analytics")}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  {t("analytics.description", "Intelligent venue utilization statistics, booking trends, and live period heatmap")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                fetchAnalytics(true);
                fetchHeatmap();
              }}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-blue-700" : ""} />
              <span>{t("common.refresh", "Refresh Data")}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <RefreshCw size={32} className="animate-spin text-blue-700 mb-3" />
            <p className="text-sm font-semibold text-slate-600">{t("common.loading", "Calculating live venue analytics...")}</p>
          </div>
        ) : (
          <>
            {/* 1. TOP KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {/* Card 1: Active Venues */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("analytics.venuesCount", "Active Venues")}
                  </span>
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{summary.activeVenues || 0}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {summary.totalVenues || 0} Total</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {Math.round(((summary.activeVenues || 0) / Math.max(summary.totalVenues || 1, 1)) * 100)}% Operational
                  </span>
                </div>
              </div>

              {/* Card 2: Total Bookings Breakdown */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("analytics.totalBookings", "Total Bookings")}
                  </span>
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{summary.totalBookings || 0}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                  <span className="text-emerald-700 font-semibold">{summary.approvedBookings || 0} Approved</span>
                  <span>•</span>
                  <span className="text-amber-700 font-semibold">{summary.pendingBookings || 0} Pending</span>
                </div>
              </div>

              {/* Card 3: Utilization Rate */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("analytics.utilizationRate", "Overall Utilization")}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {summary.overallUtilizationRate || 0}%
                  </span>
                  <span className="text-xs text-slate-500">slot occupancy</span>
                </div>
                <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(summary.overallUtilizationRate || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card 4: Peak Booking Period */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("analytics.peakPeriod", "Peak Period & Dept")}
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="mt-3 truncate">
                  <span className="text-base font-bold text-slate-900 block truncate">
                    {summary.peakBookingPeriod || "P2 (10:05 - 10:50)"}
                  </span>
                  <span className="text-xs text-slate-500 block truncate mt-1">
                    Top Dept: <strong className="text-slate-700">{summary.mostActiveDepartment || "CSE"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. VENUE UTILIZATION SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-700" />
                    <span>{t("analytics.venueUtilizationTitle", "Venue Utilization Breakdown")}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("analytics.utilizationSubtitle", "Occupancy percentage based on approved bookings across timetable period slots")}
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Most Booked: <strong className="text-blue-900">{summary.mostBookedVenue || "N/A"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {venueUtilization.map((venue) => {
                  const pct = venue.utilizationPercentage || 0;
                  const barColor =
                    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-blue-600" : "bg-amber-500";
                  const badgeColor =
                    pct >= 70
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : pct >= 40
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-amber-50 text-amber-800 border-amber-200";

                  return (
                    <div
                      key={venue.venueId}
                      className="p-4 bg-slate-50/70 border border-slate-200/90 rounded-xl hover:border-blue-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-slate-900">{venue.venueName}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({venue.venueType} • Cap: {venue.capacity})
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="mt-3 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{venue.department || "General"}</span>
                        <span>{venue.approvedBookings || 0} Approved Bookings</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. FEATURE 4: VENUE AVAILABILITY HEATMAP */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-700" />
                    <span>{t("heatmap.title", "Live Venue Availability Heatmap")}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("heatmap.subtitle", "Period-by-period venue availability matrix (P1 to P8) from real database bookings")}
                  </p>
                </div>

                {/* Heatmap Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar size={14} className="text-slate-500" />
                    <input
                      type="date"
                      value={heatmapDate}
                      onChange={(e) => setHeatmapDate(e.target.value)}
                      className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
                    />
                  </div>

                  {/* Dept Filter */}
                  <select
                    value={heatmapDept}
                    onChange={(e) => setHeatmapDept(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {availableDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  {/* Type Filter */}
                  <select
                    value={heatmapType}
                    onChange={(e) => setHeatmapType(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Venue Types</option>
                    {availableTypes.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>

                  {/* Search in Heatmap */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter venue..."
                      value={heatmapSearch}
                      onChange={(e) => setHeatmapSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs" />
                    <span className="text-slate-700 font-medium">Available (🟢)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500 shadow-xs" />
                    <span className="text-slate-700 font-medium">Booked / Approved (🔴)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-amber-500 shadow-xs" />
                    <span className="text-slate-700 font-medium">Pending Request (🟡)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-purple-500 shadow-xs" />
                    <span className="text-slate-700 font-medium">Academic Class (🟣)</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Showing date: <strong>{heatmapDate}</strong> • Total venues: {filteredHeatmapVenues.length}
                </div>
              </div>

              {/* Heatmap Grid Matrix */}
              {heatmapLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <RefreshCw size={20} className="animate-spin text-blue-700 inline-block mr-2" />
                  Loading heatmap matrix...
                </div>
              ) : filteredHeatmapVenues.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No venues match the selected filters for {heatmapDate}.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                        <th className="py-3 px-4 font-bold sticky left-0 bg-slate-100/95 z-10 w-44">
                          Venue
                        </th>
                        {heatmapData?.periods?.map((p) => (
                          <th key={p.period} className="py-3 px-2 text-center font-bold min-w-[70px]">
                            <div>{p.label}</div>
                            <div className="text-[9px] font-normal text-slate-500">{p.start}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHeatmapVenues.map((v) => {
                        const vId = v.hallId ?? v.id ?? v.venueId;
                        const vName = v.venueName ?? v.name ?? "Venue";

                        return (
                          <tr key={vId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-slate-100">
                              <span className="font-bold text-slate-900 block">{vName}</span>
                              <span className="text-[10px] text-slate-500 block">
                                {v.venueType} {v.capacity ? `• Cap: ${v.capacity}` : ""}
                              </span>
                            </td>

                            {v.periods.map((slot) => {
                              const isAvail = slot.isAvailable ?? (slot.status === "AVAILABLE" || slot.status === "available");
                              const isPending = slot.status === "PENDING";
                              const isAcademic = slot.status === "ACADEMIC_ALLOCATION";

                              let badgeClass = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300";
                              let icon = "🟢";
                              if (!isAvail) {
                                if (isPending) {
                                  badgeClass = "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300";
                                  icon = "🟡";
                                } else if (isAcademic) {
                                  badgeClass = "bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300";
                                  icon = "🟣";
                                } else {
                                  badgeClass = "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300";
                                  icon = "🔴";
                                }
                              }

                              return (
                                <td
                                  key={slot.period}
                                  className="py-2.5 px-2 text-center relative group"
                                  onMouseEnter={() =>
                                    setActiveSlot({
                                      venueName: vName,
                                      period: slot.label || `P${slot.period}`,
                                      time: slot.time || `${slot.start} - ${slot.end}`,
                                      isAvailable: isAvail,
                                      displayStatus: slot.displayStatus,
                                      bookedBy: slot.bookedBy,
                                      bookingStatus: slot.bookingStatus,
                                      purpose: slot.purpose,
                                    })
                                  }
                                  onMouseLeave={() => setActiveSlot(null)}
                                >
                                  <div
                                    className={`inline-flex items-center justify-center h-8 w-8 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs ${badgeClass}`}
                                    title={`${vName} • ${slot.label || `P${slot.period}`}: ${slot.displayStatus || (isAvail ? "Available" : "Occupied")}`}
                                  >
                                    {icon}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tooltip detail bar */}
              {activeSlot && (
                <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between animate-fade-in shadow-md">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-amber-300">{activeSlot.venueName}</span>
                    <span>•</span>
                    <span>{activeSlot.period} ({activeSlot.time})</span>
                    <span>•</span>
                    <span
                      className={`font-semibold ${
                        activeSlot.isAvailable
                          ? "text-emerald-400"
                          : activeSlot.displayStatus?.includes("Pending")
                          ? "text-amber-400"
                          : activeSlot.displayStatus?.includes("Academic")
                          ? "text-purple-400"
                          : "text-rose-400"
                      }`}
                    >
                      {activeSlot.displayStatus || (activeSlot.isAvailable ? "Available for booking" : "Occupied")}
                    </span>
                    {activeSlot.purpose && (
                      <>
                        <span>•</span>
                        <span className="text-slate-300 italic">{activeSlot.purpose}</span>
                      </>
                    )}
                  </div>
                  {activeSlot.bookedBy && (
                    <span className="text-slate-300">Handled by: <strong>{activeSlot.bookedBy}</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* 4. DEPARTMENT USAGE & FACILITY DEMAND */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Department Usage */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-700" />
                    <span>{t("analytics.departmentUsage", "Department Booking Activity")}</span>
                  </h3>
                  <span className="text-xs text-slate-400">{departmentUsage.length} departments</span>
                </div>

                <div className="space-y-3">
                  {departmentUsage.map((dept, i) => {
                    const widthPct = Math.round((dept.count / maxDeptCount) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-800">{dept.department}</span>
                          <span className="font-bold text-slate-900">{dept.count} bookings</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(widthPct, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Facility Demand */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    <span>{t("analytics.facilityDemand", "Most Requested Facilities")}</span>
                  </h3>
                  <span className="text-xs text-slate-400">Amenities demand</span>
                </div>

                <div className="space-y-3">
                  {facilityDemand.map((fac, i) => {
                    const widthPct = Math.round((fac.demandCount / maxFacilityCount) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-800">{fac.facility}</span>
                          <span className="font-bold text-indigo-900">{fac.demandCount} requests</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(widthPct, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. MONTHLY BOOKING TRENDS */}
            {monthlyTrends.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-700" />
                    <span>{t("analytics.monthlyTrends", "Monthly Booking Progression (Last 12 Months)")}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span className="text-slate-600">Total Bookings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Approved</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {monthlyTrends.map((m, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-center flex flex-col justify-between"
                    >
                      <span className="text-xs font-bold text-slate-700">{m.month}</span>
                      <div className="my-2">
                        <span className="text-xl font-bold text-blue-900">{m.total}</span>
                        <span className="text-[10px] text-slate-400 block">bookings</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded py-0.5">
                        {m.approved} Approved
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default VenueAnalytics;
