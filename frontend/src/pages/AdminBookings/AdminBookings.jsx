import { useEffect, useState } from "react";
import { Eye, Search, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "../../layouts/AdminLayout";
import BookingStatusBadge from "../../components/faculty/BookingStatusBadge";
import { getAllBookings, updateBookingStatus, cancelBooking } from "../../api/bookingApi";
import Pagination from "../../components/Pagination";

const statuses = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const status = statusFilter === "All" ? "" : statusFilter.toLowerCase();
      const response = await getAllBookings({ status, page: currentPage, limit: 10, search });
      const data = Array.isArray(response?.data) ? response.data : [];
      const nextPagination = response?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

      setPagination(nextPagination);
      if (currentPage > 1 && currentPage > nextPagination.totalPages) {
        setCurrentPage(1);
        return;
      }
      setBookings(data.map((booking) => ({
        id: booking.id,
        faculty: booking.staff_name || booking.staffName,
        email: booking.staff_email || booking.staffEmail,
        phone: booking.staff_phone || booking.staffPhone,
        venue: booking.hall_name || booking.hallName,
        date: booking.date,
        time: `${booking.time_from || booking.timeFrom || ""}${booking.time_to || booking.timeTo ? ` - ${booking.time_to || booking.timeTo}` : ""}`,
        purpose: booking.reason || booking.purpose,
        remarks: booking.remarks,
        status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Pending",
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
  }, [statusFilter, currentPage, search]);

  const handleStatusChange = async (id, status) => {
    try {
      setProcessingId(id);
      await updateBookingStatus(id, status);
      toast.success(`Booking ${status.toLowerCase() === "approved" ? "approved" : "rejected"} successfully.`);
      await fetchBookings();
    } catch (error) {
      toast.error(error.message || "Failed to update booking status");
    } finally {
      setProcessingId(null);
    }
  };
  const handleCancelBooking = async (id) => {
  const confirmCancel = window.confirm(
    "Are you sure you want to cancel this booking?"
  );

  if (!confirmCancel) return;

  try {
    setProcessingId(id);

    await cancelBooking(id);

    toast.success("Booking cancelled successfully.");

    await fetchBookings();
  } catch (error) {
    toast.error(error.message || "Failed to cancel booking");
  } finally {
    setProcessingId(null);
  }
};

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-800">Booking Management</h1>
          <p className="text-sm text-slate-500">Review, approve, reject, and track all venue requests.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search bookings" className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button key={status} type="button" onClick={() => { setStatusFilter(status); setCurrentPage(1); }} className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${statusFilter === status ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 p-10 text-sm text-slate-500">
                <LoaderCircle size={18} className="mr-2 animate-spin" /> Loading bookings...
              </div>
             ) : bookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No bookings found.</div>
            ) : (
              <table className="responsive-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Faculty</th>
                    <th className="px-4 py-3 font-semibold">Venue</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Purpose</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{booking.faculty}</div>
                        <div className="text-xs text-slate-500">{booking.email}</div>
                      </td>
                      <td className="px-4 py-3">{booking.venue}</td>
                      <td className="px-4 py-3">{booking.date}</td>
                      <td className="px-4 py-3">{booking.time}</td>
                      <td className="px-4 py-3">{booking.purpose}</td>
                      <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelectedBooking(booking)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50">
                            <span className="flex items-center gap-1"><Eye size={14} /> View</span>
                          </button>
                          {booking.status === "Pending" && (
                            <>
                              <button type="button" disabled={processingId === booking.id} onClick={() => handleStatusChange(booking.id, "Approved")} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60">
                                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Approve</span>
                              </button>
                              <button type="button" disabled={processingId === booking.id} onClick={() => handleStatusChange(booking.id, "Rejected")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">
                                <span className="flex items-center gap-1"><XCircle size={14} /> Reject</span>
                              </button>
                            </>
                          )}
                          {["Pending", "Approved"].includes(booking.status) && (
  <button
    type="button"
    disabled={processingId === booking.id}
    onClick={() => handleCancelBooking(booking.id)}
    className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
  >
    <span className="flex items-center gap-1">
      <XCircle size={14} />
      {processingId === booking.id ? "Cancelling..." : "Cancel"}
    </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Booking Details</h3>
                <p className="text-sm text-slate-500">{selectedBooking.faculty}</p>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
              <div><span className="font-semibold text-slate-700">Faculty Name</span><div>{selectedBooking.faculty}</div></div>
              <div><span className="font-semibold text-slate-700">Email</span><div>{selectedBooking.email}</div></div>
              <div><span className="font-semibold text-slate-700">Phone</span><div>{selectedBooking.phone || "-"}</div></div>
              <div><span className="font-semibold text-slate-700">Venue</span><div>{selectedBooking.venue}</div></div>
              <div><span className="font-semibold text-slate-700">Date</span><div>{selectedBooking.date}</div></div>
              <div><span className="font-semibold text-slate-700">Time</span><div>{selectedBooking.time}</div></div>
              <div><span className="font-semibold text-slate-700">Purpose</span><div>{selectedBooking.purpose}</div></div>
              <div><span className="font-semibold text-slate-700">Remarks</span><div>{selectedBooking.remarks || "-"}</div></div>
              <div><span className="font-semibold text-slate-700">Status</span><div><BookingStatusBadge status={selectedBooking.status} /></div></div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </AdminLayout>
  );
};

export default AdminBookings;
