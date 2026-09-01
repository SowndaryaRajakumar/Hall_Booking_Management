import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarCheck2,
  CircleX,
  Clock3,
  Eye,
} from "lucide-react";

import FacultyLayout from "../../../layouts/FacultyLayout";
import DashboardCard from "../../../components/faculty/DashboardCard";
import RecentBookingTable from "../../../components/faculty/RecentBookingTable";
import PageHeader from "../../../components/faculty/PageHeader";
import DetailModal from "../../../components/faculty/DetailModal";

import { getFacultyDashboard } from "../../../api/facultyDashboardApi";

const FacultyDashboard = () => {
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
        title: "Total Bookings",
        count: data.totalBookings,
        icon: BookOpen,
        accent:
          "bg-blue-100 text-blue-700",
      },

      {
        title: "Pending",
        count: data.pendingBookings,
        icon: Clock3,
        accent:
          "bg-amber-100 text-amber-700",
      },

      {
        title: "Approved",
        count: data.approvedBookings,
        icon: CalendarCheck2,
        accent:
          "bg-emerald-100 text-emerald-700",
      },

      {
        title: "Cancelled",
        count: data.cancelledBookings,
        icon: CircleX,
        accent:
          "bg-rose-100 text-rose-700",
      },
    ];
  }, [data]);

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
            Failed to load dashboard
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
          title="Faculty Dashboard"
          description="Overview of your venue bookings and status updates."
          action={
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              <Eye size={16} />
              View All
            </button>
          }
        />

        {/* =================================================
            STATISTICS
        ================================================== */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((stat) => (
            <DashboardCard
              key={stat.title}
              {...stat}
            />
          ))}

        </div>

        {/* =================================================
            RECENT ACTIVITY
        ================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-semibold text-slate-800">
                Recent Activity
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

      {/* =================================================
          DETAILS MODAL
      ================================================== */}

      {selectedBooking && (
        <DetailModal
          title="Booking Details"
          subtitle={`BK${selectedBooking.id}`}
          rows={[
            {
              label: "Venue",
              value: selectedBooking.venue,
            },

            {
              label: "Date",
              value: String(
                selectedBooking.date || ""
              ).slice(0, 10),
            },

            {
              label: "Time",
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
              label: "Status",
              value: selectedBooking.status,
            },

            {
              label: "Purpose",
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