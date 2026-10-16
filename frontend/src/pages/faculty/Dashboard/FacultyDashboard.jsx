import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarCheck2,
  CircleX,
  Clock3,
  Eye,
  CalendarDays,
  MapPin,
  ChevronRight,
  GraduationCap,
  Clock,
} from "lucide-react";

import FacultyLayout from "../../../layouts/FacultyLayout";
import DashboardCard from "../../../components/faculty/DashboardCard";
import RecentBookingTable from "../../../components/faculty/RecentBookingTable";
import PageHeader from "../../../components/faculty/PageHeader";
import DetailModal from "../../../components/faculty/DetailModal";

import { getFacultyDashboard } from "../../../api/facultyDashboardApi";

const FacultyDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBooking, setSelectedBooking] =
    useState(null);

  /*
   * =========================================================
   * FETCH FACULTY DASHBOARD
   * =========================================================
   */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const dashboardData =
          await getFacultyDashboard();

        setData(dashboardData);

      } catch (err) {
        console.error(
          "Faculty dashboard error:",
          err
        );

        setError(
          err.message ||
          "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  /*
   * =========================================================
   * DASHBOARD STATISTICS
   * =========================================================
   */
  const stats = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        title: t("dashboard.totalBookings"),
        count: data.totalBookings,
        icon: BookOpen,
        accent:
          "bg-blue-100 text-blue-700",
      },

      {
        title: t("status.pending"),
        count: data.pendingBookings,
        icon: Clock3,
        accent:
          "bg-amber-100 text-amber-700",
      },

      {
        title: t("status.approved"),
        count: data.approvedBookings,
        icon: CalendarCheck2,
        accent: "bg-emerald-100 text-emerald-700",
      },

      {
        title: "Semester Allocations",
        count: data.semesterAllocations || 0,
        icon: CalendarDays,
        accent: "bg-indigo-100 text-indigo-700",
      },

      {
        title: "Pending Allocations",
        count: data.pendingAllocations || 0,
        icon: Clock3,
        accent: "bg-purple-100 text-purple-700",
      },
    ];
  }, [data, t]);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <FacultyLayout>
        <div className="space-y-6">

          <div className="h-10 w-64 animate-pulse rounded-full bg-slate-200" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-slate-200"
                />
              )
            )}
          </div>

          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />

        </div>
      </FacultyLayout>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */
  if (error) {
    return (
      <FacultyLayout>
        <div className="rounded-xl bg-red-50 p-6 text-red-700">
          <h2 className="font-semibold">
            {t("common.error")}
          </h2>

          <p className="mt-2">
            {error}
          </p>
        </div>
      </FacultyLayout>
    );
  }

  /*
   * =========================================================
   * MAIN DASHBOARD
   * =========================================================
   */
  return (
    <FacultyLayout>

      <div className="space-y-6">

        <PageHeader
          title={`${t("nav.dashboard")} - ${t("facultyPortal")}`}
          description="Overview of your venue bookings and status updates."
          action={
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              <Eye size={16} />
              {t("dashboard.viewAll")}
            </button>
          }
        />

        {/* STATISTICS */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <DashboardCard
              key={stat.title}
              {...stat}
            />
          ))}
        </div>

        {/* TODAY'S ACADEMIC TEACHING SCHEDULE */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  Semester Schedule
                </span>
                <span className="text-xs text-blue-200">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1">Today's Academic Classes</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Automatically populated from your active semester venue allocations.
              </p>
            </div>

            <Link
              to="/faculty/academic-calendar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-900 text-xs font-bold rounded-xl shadow-xs hover:bg-blue-50 transition self-start sm:self-auto"
            >
              <CalendarDays size={16} />
              Open Academic Calendar
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data?.todayClasses || []).length === 0 ? (
              <div className="col-span-3 bg-white/10 rounded-xl p-4 text-center text-xs text-blue-200">
                No classes scheduled for today under your semester allocation.
              </div>
            ) : (
              (data.todayClasses || []).map((cls, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{cls.subject_name}</span>
                    <span className="bg-blue-700/80 px-2 py-0.5 rounded text-[10px] font-extrabold text-blue-100">
                      Period {cls.period_id}
                    </span>
                  </div>

                  <div className="text-xs text-blue-200 flex items-center justify-between">
                    <span>{cls.year_of_study} - Sec {cls.section}</span>
                    <span>{cls.startTime} - {cls.endTime}</span>
                  </div>

                  <div className="text-xs text-blue-100 flex items-center gap-1 pt-1 border-t border-white/10">
                    <MapPin size={13} className="text-blue-300" />
                    <span className="font-semibold">{cls.venue_name}</span>
                  </div>

                  {cls.occurrence_status !== "SCHEDULED" && (
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-amber-950">
                      {cls.occurrence_status}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-semibold text-slate-800">
                {t("dashboard.recentBookings")}
              </h2>

              <p className="text-sm text-slate-500">
                Latest venue requests submitted by you.
              </p>

            </div>

          </div>

          <RecentBookingTable
            bookings={data?.recentBookings || []}
            onView={setSelectedBooking}
          />

        </div>

      </div>

      {/* DETAILS MODAL */}
      {selectedBooking && (
        <DetailModal
          title={t("bookVenue.confirmBooking")}
          subtitle={`BK${selectedBooking.id}`}
          rows={[
            {
              label: t("dashboard.venue"),
              value: selectedBooking.venue,
            },

            {
              label: t("dashboard.date"),
              value: String(
                selectedBooking.date || ""
              ).slice(0, 10),
            },

            {
              label: t("dashboard.time"),
              value: `${
                String(
                  selectedBooking.timeFrom || ""
                ).slice(0, 5)
              } - ${
                String(
                  selectedBooking.timeTo || ""
                ).slice(0, 5)
              }`,
            },

            {
              label: t("dashboard.status"),
              value: selectedBooking.status,
            },

            {
              label: t("dashboard.purpose"),
              value: selectedBooking.reason || "-",
            },
          ]}
          onClose={() =>
            setSelectedBooking(null)
          }
        />
      )}

    </FacultyLayout>
  );
};

export default FacultyDashboard;