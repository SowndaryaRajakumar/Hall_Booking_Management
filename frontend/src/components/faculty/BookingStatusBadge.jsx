import { useTranslation } from "react-i18next";

const statusStyles = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Cancelled: "bg-slate-100 text-slate-700",
  Completed: "bg-blue-100 text-blue-700",
};

const BookingStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const rawStatus = String(status || "Pending").trim();
  const translationKey = `status.${rawStatus.toLowerCase()}`;
  const displayLabel = t(translationKey, rawStatus);

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[rawStatus] || "bg-slate-100 text-slate-700"}`}>
      {displayLabel}
    </span>
  );
};

export default BookingStatusBadge;
