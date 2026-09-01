import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Info,
  X,
  RefreshCw,
  Send,
  LoaderCircle,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FacultyLayout from "../../../layouts/FacultyLayout";
import {
  checkBookingAvailability,
  createBooking,
  getHallPeriodAvailability,
} from "../../../api/bookingApi";
import { getAllHalls } from "../../../api/hallApi";

const initialForm = {
  venue: "",
  dateFrom: "",
  dateTo: "",
  startTime: "",
  endTime: "",
  purpose: "",
  remarks: "",
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (from, to) => {
  if (!from || !to || from > to) return [];

  const dates = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  while (current <= end) {
    dates.push(getLocalDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const formatDateLabel = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPeriodStatus = (period) =>
  String(period?.status || "").toLowerCase();

const BookVenue = ({ Layout = FacultyLayout, isAdmin = false }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [dailyAvailability, setDailyAvailability] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  /*
   * IMPORTANT:
   * Selection is stored DATE-WISE.
   *
   * Example:
   * {
   *   "2026-08-18": [1, 2],
   *   "2026-08-19": [3],
   *   "2026-08-20": [2, 4, 5]
   * }
   *
   * Therefore selecting P1 on one date will NEVER automatically
   * select P1 on another date.
   */
  const [selectedPeriodsByDate, setSelectedPeriodsByDate] = useState({});

  const [showVenueDetails, setShowVenueDetails] = useState(false);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const data = await getAllHalls({ page: 1, limit: 100, status: "active" });

        const hallList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

        // Faculty can book only active venues.
        const activeHalls = hallList.filter((hall) => {
          const status = hall.activeStatus;

          if (status === false || status === 0) return false;
          if (typeof status === "string" && status.toLowerCase() === "false") {
            return false;
          }

          return true;
        });

        setVenues(
          activeHalls.map((hall) => ({
            id: hall.hallId ?? hall.id,
            name: hall.hallName ?? hall.name,
            department: hall.department ?? hall.DeptName ?? "",
            venueType: hall.venueType ?? hall.VenueType ?? "",
            location: hall.location ?? hall.Location ?? "",
            capacity: hall.capacity ?? hall.Capacity ?? 0,
            facilities: [
              hall.hasProjector ? "Projector" : null,
              hall.hasAC ? "AC" : null,
              hall.hasWiFi ? "WiFi" : null,
              hall.hasSmartBoard ? "Smart Board" : null,
              hall.hasWhiteBoard ? "White Board" : null,
              hall.hasSpeaker ? "Speaker" : null,
            ].filter(Boolean),
            image:
              hall.image ||
              "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
            status: "Available",
          }))
        );
      } catch (error) {
        toast.error(error.message || "Failed to load venues");
      } finally {
        setLoading(false);
      }
    };

    loadVenues();
  }, []);

  const selectedVenue = useMemo(
    () =>
      venues.find((venue) => venue.id === Number(form.venue)) || null,
    [form.venue, venues]
  );

  const selectedDates = useMemo(
    () => getDateRange(form.dateFrom, form.dateTo),
    [form.dateFrom, form.dateTo]
  );

  /*
   * Fetch availability separately for EVERY date.
   */
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!form.venue || !form.dateFrom || !form.dateTo) {
        setDailyAvailability([]);
        setSelectedPeriodsByDate({});
        return;
      }

      if (form.dateFrom > form.dateTo) {
        setDailyAvailability([]);
        setSelectedPeriodsByDate({});
        return;
      }

      setPeriodsLoading(true);

      // A changed date range/venue starts a fresh selection.
      setSelectedPeriodsByDate({});

      try {
        const results = await Promise.all(
          selectedDates.map(async (date) => {
            const data = await getHallPeriodAvailability(
              Number(form.venue),
              date
            );

            return {
              date,
              periods: Array.isArray(data?.periods) ? data.periods : [],
            };
          })
        );

        setDailyAvailability(results);
      } catch (error) {
        toast.error(error.message || "Failed to load availability");
        setDailyAvailability([]);
      } finally {
        setPeriodsLoading(false);
      }
    };

    fetchAvailability();
  }, [form.venue, form.dateFrom, form.dateTo, selectedDates]);

  const isPeriodAvailable = (date, periodNumber) => {
    const day = dailyAvailability.find((item) => item.date === date);

    return Boolean(
      day?.periods?.some(
        (period) =>
          Number(period.period) === Number(periodNumber) &&
          getPeriodStatus(period) === "available"
      )
    );
  };

  const isPeriodBooked = (date, periodNumber) => {
    const day = dailyAvailability.find((item) => item.date === date);

    return Boolean(
      day?.periods?.some(
        (period) =>
          Number(period.period) === Number(periodNumber) &&
          getPeriodStatus(period) === "booked"
      )
    );
  };

  const isPeriodSelected = (date, periodNumber) =>
    (selectedPeriodsByDate[date] || []).includes(Number(periodNumber));

  /*
   * Toggle ONE period for ONE date.
   *
   * This is the key fix for:
   * Day 1 -> P1
   * Day 2 -> P3
   * Day 3 -> P2 + P4
   */
  const togglePeriod = (date, periodNumber) => {
    const number = Number(periodNumber);

    if (isPeriodBooked(date, number)) {
      toast.error(
        `Period ${number} is already booked on ${formatDateLabel(date)}.`
      );
      return;
    }

    if (!isPeriodAvailable(date, number)) {
      toast.error(
        `Period ${number} is not available on ${formatDateLabel(date)}.`
      );
      return;
    }

    setSelectedPeriodsByDate((previous) => {
      const current = previous[date] || [];

      const next = current.includes(number)
        ? current.filter((period) => period !== number)
        : [...current, number].sort((a, b) => a - b);

      const updated = { ...previous };

      if (next.length === 0) {
        delete updated[date];
      } else {
        updated[date] = next;
      }

      return updated;
    });
  };

  /*
   * Convert the date-wise selection into the exact format expected
   * by the backend.
   */
  const selectedSlots = useMemo(() => {
    const slots = [];

    Object.entries(selectedPeriodsByDate).forEach(
      ([date, periodNumbers]) => {
        const day = dailyAvailability.find((item) => item.date === date);

        if (!day) return;

        periodNumbers.forEach((periodNumber) => {
          const period = day.periods?.find(
            (item) => Number(item.period) === Number(periodNumber)
          );

          if (!period || getPeriodStatus(period) !== "available") return;

          slots.push({
            date,
            period: Number(periodNumber),
            timeFrom: period.start,
            timeTo: period.end,
            startDisplay: period.startDisplay,
            endDisplay: period.endDisplay,
          });
        });
      }
    );

    return slots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.period - b.period;
    });
  }, [selectedPeriodsByDate, dailyAvailability]);

  const selectedSlotCount = selectedSlots.length;

  /*
   * Keep legacy start/end fields populated for compatibility with
   * existing API code. The real booking information is selectedSlots.
   */
  useEffect(() => {
    if (selectedSlots.length === 0) {
      setForm((previous) => ({
        ...previous,
        startTime: "",
        endTime: "",
      }));
      return;
    }

    const first = selectedSlots[0];

    setForm((previous) => ({
      ...previous,
      startTime: first.timeFrom || "",
      endTime: first.timeTo || "",
    }));
  }, [selectedSlots]);

  const selectedPeriodLabel = useMemo(() => {
    if (selectedSlotCount === 0) return "";

    return Object.entries(selectedPeriodsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, periods]) => {
        return `${formatDateLabel(date)}: ${periods
          .map((period) => `P${period}`)
          .join(", ")}`;
      })
      .join("  •  ");
  }, [selectedPeriodsByDate, selectedSlotCount]);

  const validate = () => {
    const nextErrors = {};

    if (!form.venue) {
      nextErrors.venue = "Please select a venue.";
    }

    if (!form.dateFrom) {
      nextErrors.dateFrom = "Please choose a start date.";
    }

    if (!form.dateTo) {
      nextErrors.dateTo = "Please choose an end date.";
    }

    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
      nextErrors.dateTo = "End date must be on or after the start date.";
    }

    const today = getLocalDateString();

    if (form.dateFrom && form.dateFrom < today) {
      nextErrors.dateFrom = "Please select today or a future date.";
    }

    if (form.dateTo && form.dateTo < today) {
      nextErrors.dateTo = "Please select today or a future date.";
    }

    if (selectedSlotCount === 0) {
      nextErrors.period = "Please select at least one available period.";
    }

    if (!form.purpose.trim()) {
      nextErrors.purpose = "Purpose is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const firstSlot = selectedSlots[0];

      const payload = {
        hallId: Number(form.venue),
        reason: form.purpose,

        // Backward-compatible fields.
        date: firstSlot?.date || form.dateFrom,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        timeFrom: firstSlot?.timeFrom || "",
        timeTo: firstSlot?.timeTo || "",

        // IMPORTANT: complete date-wise selection.
        selectedSlots,

        remarks: form.remarks,
      };

      /*
       * Keep the existing availability check for compatibility.
       * The backend createBooking() validates EVERY selected slot
       * before inserting anything.
       */
      const availability =
        await checkBookingAvailability(payload);

      if (!availability?.available) {
        toast.error(
          availability?.message ||
            "This venue is already booked for the selected period."
        );
        setSubmitting(false);
        return;
      }

      const result = await createBooking(payload);

      toast.success(
        result?.message || (isAdmin ? "Booking approved successfully." : "Booking submitted successfully.")
      );

      setSubmitted(true);
      setErrors({});
      setSelectedPeriodsByDate({});
      setForm(initialForm);
      setDailyAvailability([]);

      setTimeout(() => setSubmitted(false), 2200);
    } catch (error) {
      toast.error(
        error.message || "Failed to submit booking"
      );

      /*
       * Refresh availability after a conflict so newly booked
       * periods immediately become red.
       */
      if (form.venue && form.dateFrom && form.dateTo) {
        try {
          const results = await Promise.all(
            selectedDates.map(async (date) => {
              const data = await getHallPeriodAvailability(
                Number(form.venue),
                date
              );

              return {
                date,
                periods: Array.isArray(data?.periods)
                  ? data.periods
                  : [],
              };
            })
          );

          setDailyAvailability(results);

          /*
           * Remove any selection that is no longer available.
           */
          setSelectedPeriodsByDate((previous) => {
            const updated = {};

            results.forEach((day) => {
              const selected = previous[day.date] || [];

              const stillAvailable = selected.filter((periodNumber) =>
                day.periods?.some(
                  (period) =>
                    Number(period.period) ===
                      Number(periodNumber) &&
                    getPeriodStatus(period) === "available"
                )
              );

              if (stillAvailable.length > 0) {
                updated[day.date] = stillAvailable;
              }
            });

            return updated;
          });
        } catch {
          // Keep the original error toast.
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
    setSelectedPeriodsByDate({});
    setDailyAvailability([]);
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1500px] px-3 pb-8 sm:px-5 lg:px-8">
        {/* PAGE HEADER */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Book Venue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Create an approved venue booking for one or multiple days."
              : "Reserve a venue for one or multiple days."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7"
        >
          {/* TOP FORM */}
          <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2">
            {/* Venue */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Venue
                </label>

                {selectedVenue && (
                  <button
                    type="button"
                    onClick={() => setShowVenueDetails(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900"
                    title="View venue details"
                  >
                    <Info size={15} />
                    View venue details
                  </button>
                )}
              </div>

              <select
                value={form.venue}
                onChange={(e) => {
                  setForm((previous) => ({
                    ...previous,
                    venue: e.target.value,
                  }));
                  setShowVenueDetails(false);
                  setErrors((previous) => ({
                    ...previous,
                    venue: undefined,
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select venue</option>

                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>

              {errors.venue && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.venue}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Department
              </label>

              <input
                value={selectedVenue?.department || ""}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm"
                placeholder="Department"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date From
              </label>

              <input
                type="date"
                value={form.dateFrom}
                min={getLocalDateString()}
                onChange={(e) => {
                  const dateFrom = e.target.value;

                  setForm((previous) => ({
                    ...previous,
                    dateFrom,
                    dateTo:
                      !previous.dateTo ||
                      previous.dateTo < dateFrom
                        ? dateFrom
                        : previous.dateTo,
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {errors.dateFrom && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.dateFrom}
                </p>
              )}
            </div>

            {/* Date To */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date To
              </label>

              <input
                type="date"
                value={form.dateTo}
                min={form.dateFrom || getLocalDateString()}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    dateTo: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {errors.dateTo && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.dateTo}
                </p>
              )}
            </div>
          </div>

          {/* TIMETABLE */}
          <div className="mx-auto mt-5 w-full max-w-7xl rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Venue Timetable
                </h3>

                <p className="text-xs text-slate-500">
                  Select periods independently for each date. Multiple
                  periods can be selected on the same day.
                </p>
              </div>

              {/* LEGEND */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 sm:gap-4 sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                  Available
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Selected
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-gray-400" />
                  Already Booked
                </span>
              </div>
            </div>

            {!form.venue ||
            !form.dateFrom ||
            !form.dateTo ? (
              <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">
                Select a venue and Date From / Date To to view the timetable.
              </div>
            ) : periodsLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Loading availability...
              </div>
            ) : dailyAvailability.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center py-8 text-sm text-slate-500">
                No timetable data available.
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                {dailyAvailability.map((day) => (
                  <section key={day.date}>
                    {/* DATE HEADER */}
                    <div className="mb-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
                      <CalendarDays
                        size={15}
                        className="text-blue-700"
                      />
                      {formatDateLabel(day.date)}
                    </div>

                    {/*
                     * Desktop: 8 periods in ONE horizontal row.
                     * Tablet: 4 + 4.
                     * Mobile: 2 + 2 + 2 + 2.
                     *
                     * No fixed min-width, so the timetable will not
                     * overflow the page.
                     */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 lg:gap-2.5">
                      {day.periods.map((period) => {
                        const periodNumber = Number(period.period);
                        const status = getPeriodStatus(period);

                        const isBooked = status === "booked";
                        const isSelected = isPeriodSelected(
                          day.date,
                          periodNumber
                        );

                        const canSelect =
                          !isBooked &&
                          isPeriodAvailable(
                            day.date,
                            periodNumber
                          );

                        return (
                          <button
                            key={`${day.date}-${periodNumber}`}
                            type="button"
                            disabled={isBooked}
                            onClick={() =>
                              togglePeriod(
                                day.date,
                                periodNumber
                              )
                            }
                            className={`group relative min-h-[112px] rounded-xl border p-2.5 text-left transition-all duration-150 sm:min-h-[118px] sm:p-3 ${
                              isBooked
                                ? "cursor-not-allowed border-gray-400 bg-gray-400 text-white"
                                : isSelected
                                  ? "border-emerald-600 bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200"
                                  : canSelect
                                    ? "border-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-sm"
                                    : "cursor-not-allowed border-slate-200 bg-white text-slate-400"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span
                                className={`text-[11px] font-bold sm:text-xs ${
                                  isBooked || isSelected
                                    ? "text-white"
                                    : "text-slate-800"
                                }`}
                              >
                                P{periodNumber}
                              </span>

                              {isBooked ? (
                                <CircleX
                                  size={14}
                                  className="shrink-0 text-white"
                                />
                              ) : isSelected ? (
                                <CircleCheck
                                  size={14}
                                  className="shrink-0 text-white"
                                />
                              ) : (
                                <CircleCheck
                                  size={14}
                                  className="shrink-0 text-emerald-600"
                                />
                              )}
                            </div>

                            <div
                              className={`mt-2.5 flex items-center gap-1 text-[10px] font-medium sm:text-[11px] ${
                                isBooked || isSelected
                                  ? "text-white"
                                  : "text-slate-700"
                              }`}
                            >
                              <span className="truncate">
                                {period.startDisplay ||
                                  period.start}
                              </span>
                              <span>-</span>
                              <span className="truncate">
                                {period.endDisplay ||
                                  period.end}
                              </span>
                            </div>

                            <div
                              className={`mt-3 text-[10px] sm:text-[11px] ${
                                isBooked || isSelected
                                  ? "text-white"
                                  : "text-slate-500"
                              }`}
                            >
                              {isBooked ? (
                                <>
                                  <div className="font-semibold">
                                    Already Booked
                                  </div>
                                  <div className="mt-0.5 truncate">
                                    {period.bookedBy ||
                                      "Unavailable"}
                                  </div>
                                </>
                              ) : isSelected ? (
                                <span className="font-semibold">
                                  Selected
                                </span>
                              ) : (
                                <span>Available</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {errors.period && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle size={14} />
                {errors.period}
              </p>
            )}
          </div>

          {/* SELECTION SUMMARY */}
          <div className="mx-auto mt-5 w-full max-w-7xl rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Selected periods
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {selectedPeriodLabel ||
                    "No periods selected yet."}
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                {selectedSlotCount}{" "}
                {selectedSlotCount === 1
                  ? "period"
                  : "periods"}{" "}
                selected
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div className="mx-auto mt-5 grid w-full max-w-6xl gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Purpose
              </label>

              <input
                value={form.purpose}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    purpose: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Workshop, class, meeting..."
              />

              {errors.purpose && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.purpose}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Remarks
              </label>

              <textarea
                rows="3"
                value={form.remarks}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    remarks: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Additional requirements or instructions"
              />
            </div>
          </div>

          {submitted && (
            <div className="mx-auto mt-5 flex w-full max-w-6xl items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <AlertCircle size={16} />
              Booking submitted successfully.
            </div>
          )}

          {/* ACTIONS */}
          <div className="mx-auto mt-5 flex w-full max-w-6xl flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                periodsLoading
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {submitting ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Send size={16} />
              )}
              {isAdmin ? "Create Approved Booking" : "Submit Booking"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </form>

        {/* VENUE DETAILS MODAL */}
        {showVenueDetails && selectedVenue && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setShowVenueDetails(false)}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {selectedVenue.name}
                  </h2>

                  <p className="text-sm text-slate-500">
                    Venue details
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVenueDetails(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close venue details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                {selectedVenue.image && (
                  <img
                    src={selectedVenue.image}
                    alt={selectedVenue.name}
                    className="mb-4 h-40 w-full rounded-xl object-cover"
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Department
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.department || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Venue Type
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.venueType || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.location || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Capacity
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.capacity || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500">
                    Facilities
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedVenue.facilities.length > 0 ? (
                      selectedVenue.facilities.map(
                        (facility) => (
                          <span
                            key={facility}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                          >
                            {facility}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-sm text-slate-500">
                        No facilities listed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
      />
    </Layout>
  );
};

export default BookVenue;
