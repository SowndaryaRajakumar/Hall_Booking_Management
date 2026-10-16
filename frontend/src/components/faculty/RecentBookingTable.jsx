import { useTranslation } from "react-i18next";
import BookingStatusBadge from "./BookingStatusBadge";

const RecentBookingTable = ({ bookings, onView }) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-800">{t("dashboard.recentBookings")}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">{t("dashboard.venue")}</th>
              <th className="px-5 py-3 font-semibold">{t("dashboard.date")}</th>
              <th className="px-5 py-3 font-semibold">{t("dashboard.time")}</th>
              <th className="px-5 py-3 font-semibold">{t("dashboard.status")}</th>
              <th className="px-5 py-3 font-semibold">{t("dashboard.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                  {t("dashboard.noBookingsFound")}
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{booking.venue}</td>
                  <td className="px-5 py-3 text-slate-600">{booking.date}</td>
                  <td className="px-5 py-3 text-slate-600">{booking.time}</td>
                  <td className="px-5 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onView(booking)}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 cursor-pointer"
                    >
                      {t("dashboard.viewAll")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentBookingTable;
