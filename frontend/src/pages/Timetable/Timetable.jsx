import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { getAllHalls } from "../../api/hallApi";
import { getHallPeriodAvailability } from "../../api/bookingApi";

const defaultPeriods = [
  { period: 1, startDisplay: "09:15 AM", endDisplay: "10:05 AM" },
  { period: 2, startDisplay: "10:05 AM", endDisplay: "10:55 AM" },
  { period: 3, startDisplay: "11:10 AM", endDisplay: "12:00 PM" },
  { period: 4, startDisplay: "12:00 PM", endDisplay: "12:50 PM" },
  { period: 5, startDisplay: "01:50 PM", endDisplay: "02:40 PM" },
  { period: 6, startDisplay: "02:40 PM", endDisplay: "03:30 PM" },
  { period: 7, startDisplay: "03:45 PM", endDisplay: "04:30 PM" },
  { period: 8, startDisplay: "04:30 PM", endDisplay: "05:15 PM" },
];

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (value, amount) => {
  const d = new Date(`${value}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return localDate(d);
};

const getDateRange = (from, to) => {
  if (!from || !to || from > to) return [];
  const result = [];
  let current = from;
  while (current <= to) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
};

const formatDate = (value, language = "en") =>
  new Date(`${value}T00:00:00`).toLocaleDateString({ en: "en-IN", ta: "ta-IN", hi: "hi-IN" }[language?.split("-")[0]] || "en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const Timetable = () => {
  const { t, i18n } = useTranslation();
  const today = localDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [halls, setHalls] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState("");
  const [selectedHallName, setSelectedHallName] = useState("");
  const [dailyAvailability, setDailyAvailability] = useState([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState(null);
  const [datePage, setDatePage] = useState(0);

  const dates = useMemo(() => getDateRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const currentDay = dailyAvailability[datePage];

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingHalls(true);
        const res = await getAllHalls();
        const data = Array.isArray(res) ? res : res?.data || [];
        const active = data.filter(
          (h) =>
            h.activeStatus === true ||
            h.ActiveStatus === 1 ||
            h.ActiveStatus === "1"
        );
        setHalls(active);
        if (active.length) {
          const id = active[0].hallId ?? active[0].HallID ?? active[0].id;
          const name = active[0].hallName ?? active[0].HallName ?? active[0].name;
          setSelectedHallId(String(id));
          setSelectedHallName(name || "");
        }
      } catch (err) {
        setError(err.message || t("timetable.failedLoadVenues"));
      } finally {
        setLoadingHalls(false);
      }
    };
    load();
  }, [t]);

  useEffect(() => {
    if (!selectedHallId || !dates.length) {
      setDailyAvailability([]);
      setDatePage(0);
      return;
    }

    let cancelled = false;

    const loadRange = async () => {
      try {
        setLoadingAvailability(true);
        setError(null);

        const result = await Promise.all(
          dates.map(async (date) => {
            const res = await getHallPeriodAvailability(selectedHallId, date);
            return {
              date,
              periods:
                Array.isArray(res?.periods) && res.periods.length
                  ? res.periods
                  : defaultPeriods.map((p) => ({
                      ...p,
                      status: "available",
                      bookedBy: null,
                      bookingStatus: null,
                    })),
            };
          })
        );

        if (!cancelled) {
          setDailyAvailability(result);
          setDatePage(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t("timetable.failedLoad"));
          setDailyAvailability([]);
        }
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    };

    loadRange();
    return () => {
      cancelled = true;
    };
  }, [selectedHallId, dateFrom, dateTo, t]);

  const handleHallChange = (e) => {
    const id = e.target.value;
    setSelectedHallId(id);
    const hall = halls.find(
      (h) => String(h.hallId ?? h.HallID ?? h.id) === id
    );
    if (hall) {
      setSelectedHallName(hall.hallName ?? hall.HallName ?? hall.name ?? "");
    }
  };

  const handleFrom = (e) => {
    const value = e.target.value;
    setDateFrom(value);
    if (!dateTo || dateTo < value) setDateTo(value);
    setDatePage(0);
  };

  const handleTo = (e) => {
    const value = e.target.value;
    if (value >= dateFrom) {
      setDateTo(value);
      setDatePage(0);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 pb-8 sm:px-5 lg:px-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Venue Timetable
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View period-by-period booking schedules for a venue across a date range.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Select Venue
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                {loadingHalls ? (
                  <div className="rounded-xl border px-10 py-2.5 text-sm text-slate-400">
                    Loading venues...
                  </div>
                ) : (
                  <select
                    value={selectedHallId}
                    onChange={handleHallChange}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-medium outline-none focus:border-blue-500"
                  >
                    {halls.map((hall) => {
                      const id = hall.hallId ?? hall.HallID ?? hall.id;
                      const name = hall.hallName ?? hall.HallName ?? hall.name;
                      return <option key={id} value={id}>{name}</option>;
                    })}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                From Date
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                <input
                  type="date"
                  min={today}
                  value={dateFrom}
                  onChange={handleFrom}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                To Date
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                <input
                  type="date"
                  min={dateFrom || today}
                  value={dateTo}
                  onChange={handleTo}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {dateFrom > dateTo && (
            <p className="mt-3 text-sm font-medium text-rose-500">
              To Date must be on or after From Date.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected Venue
            </p>
            <p className="text-lg font-bold text-slate-800">
              {selectedHallName || "Select a venue"}
            </p>
            <p className="text-xs text-slate-500">
              {dates.length ? `${formatDate(dateFrom)} → ${formatDate(dateTo)}` : "Select a valid date range"}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-white" />
              Available
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-gray-400" />
              Booked
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
          {loadingAvailability ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              <LoaderCircle size={24} className="mr-2 animate-spin text-blue-600" />
              Loading timetable...
            </div>
          ) : !currentDay ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              Select a venue and valid From/To dates.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDatePage((p) => Math.max(0, p - 1))}
                  disabled={datePage === 0}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-800 sm:text-base">
                    <Calendar size={16} className="text-blue-600" />
                    {formatDate(currentDay.date)}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Date {datePage + 1} of {dailyAvailability.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDatePage((p) => Math.min(dailyAvailability.length - 1, p + 1))}
                  disabled={datePage >= dailyAvailability.length - 1}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>

              {/* Desktop: 8 periods in one row. Mobile: responsive movie-seat style grid. */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {currentDay.periods.map((period) => {
                  const booked = period.status === "booked";
                  return (
                    <div
                      key={`${currentDay.date}-${period.period}`}
                      className={`min-h-[135px] rounded-xl border p-3 ${
                        booked
                          ? "border-gray-400 bg-gray-400 text-white"
                          : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold">P{period.period}</span>
                        {booked ? (
                          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                            BOOKED
                          </span>
                        ) : (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        )}
                      </div>

                      <div className={`my-3 flex gap-1.5 border-t pt-3 text-xs font-semibold ${booked ? "border-white/20" : "border-slate-100"}`}>
                        <Clock size={14} className="mt-0.5 shrink-0" />
                        <span>{period.startDisplay}<br />{period.endDisplay}</span>
                      </div>

                      {booked ? (
                        <div className="space-y-1 text-[11px]">
                          <p className="font-semibold">{period.bookedBy || "Faculty"}</p>
                          <p className="opacity-90">{period.bookingStatus || "Booked"}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-slate-400">Available</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {dailyAvailability.length > 1 && (
                <div className="mt-5 flex justify-center gap-1.5">
                  {dailyAvailability.map((day, index) => (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`Go to ${formatDate(day.date)}`}
                      onClick={() => setDatePage(index)}
                      className={`h-2 rounded-full ${index === datePage ? "w-6 bg-blue-600" : "w-2 bg-slate-300"}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Timetable;
