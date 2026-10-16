import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Search, XCircle, History } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FacultyLayout from "../../../layouts/FacultyLayout";
import BookingStatusBadge from "../../../components/faculty/BookingStatusBadge";
import PageHeader from "../../../components/faculty/PageHeader";
import DetailModal from "../../../components/faculty/DetailModal";
import BookingAuditModal from "../../../components/bookings/BookingAuditModal";
import { cancelBooking, getFacultyBookings } from "../../../api/bookingApi";
import Pagination from "../../../components/Pagination";

const statuses = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

const MyBookings = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [auditBooking, setAuditBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem("email") || "";
      const rows = await getFacultyBookings({ email, page: currentPage, limit: 10, status: statusFilter === "All" ? "" : statusFilter, search });
      const data = rows?.data || [];
      setPagination(rows?.pagination || pagination);
      setBookings(data.map((booking) => ({
        id: booking.id,
        venue: booking.hall_name || booking.hallName || booking.venue,
        date: booking.date,
        time: `${booking.time_from || booking.timeFrom || ""}${booking.time_to || booking.timeTo ? ` - ${booking.time_to || booking.timeTo}` : ""}`,
        purpose: booking.reason || booking.purpose,
        status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Pending",
        remarks: booking.remarks,
        createdAt: booking.created_at || booking.createdAt,
      })));
    } catch (error) {
      toast.error(error.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentPage, search, statusFilter]);

  const handleCancel = async (booking) => {
    if (!window.confirm(t("myBookings.confirmCancel"))) return;
    try {
      setCancellingId(booking.id);
      await cancelBooking(booking.id);
      toast.success(t("myBookings.cancellationSuccess"));
      fetchBookings();
    } catch (error) {
      toast.error(error.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <FacultyLayout>
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-full bg-slate-200" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <PageHeader title={t("myBookings.title")} description={t("myBookings.subtitle")} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder={t("common.search")} className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 focus:border-blue-500 focus:outline-none text-xs" />
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const label = status === "All" ? t("myBookings.all") : t(`status.${status.toLowerCase()}`, status);
                return (
                  <button key={status} type="button" onClick={() => { setStatusFilter(status); setCurrentPage(1); }} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${statusFilter === status ? "bg-blue-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {bookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t("dashboard.noBookingsFound")}</div>
            ) : (
              <table className="responsive-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("myBookings.bookingId")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.venue")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.date")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.time")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.purpose")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.status")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">#{booking.id}</td>
                      <td className="px-4 py-3">{booking.venue}</td>
                      <td className="px-4 py-3">{booking.date}</td>
                      <td className="px-4 py-3">{booking.time}</td>
                      <td className="px-4 py-3">{booking.purpose}</td>
                      <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelectedBooking(booking)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 cursor-pointer">
                            <span className="flex items-center gap-1"><Eye size={14} /> {t("dashboard.viewAll")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuditBooking(booking)}
                            className="rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 cursor-pointer"
                            title={t("audit.history", "History")}
                          >
                            <span className="flex items-center gap-1"><History size={14} /> {t("audit.history", "History")}</span>
                          </button>
                          {["Pending", "Approved"].includes(booking.status) && (
                            <button type="button" disabled={cancellingId === booking.id} onClick={() => handleCancel(booking)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 cursor-pointer">
                              <span className="flex items-center gap-1"><XCircle size={14} /> {cancellingId === booking.id ? t("common.loading") : t("myBookings.cancelBooking")}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {selectedBooking && (
        <DetailModal title={t("bookVenue.confirmBooking")} subtitle={`BK${selectedBooking.id}`} rows={[{ label: t("dashboard.venue"), value: selectedBooking.venue }, { label: t("dashboard.date"), value: selectedBooking.date }, { label: t("dashboard.time"), value: selectedBooking.time }, { label: t("dashboard.purpose"), value: selectedBooking.purpose }, { label: t("dashboard.status"), value: selectedBooking.status }, { label: t("myBookings.reason"), value: selectedBooking.remarks || "-" }]} onClose={() => setSelectedBooking(null)} />
      )}
      {auditBooking && (
        <BookingAuditModal
          booking={auditBooking}
          onClose={() => setAuditBooking(null)}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </FacultyLayout>
  );
};

export default MyBookings;
