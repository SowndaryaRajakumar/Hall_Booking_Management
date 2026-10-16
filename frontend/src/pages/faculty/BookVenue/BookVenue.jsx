import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
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
  Sparkles,
  Star,
  Check,
  Repeat,
  Layers,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FacultyLayout from "../../../layouts/FacultyLayout";
import {
  checkBookingAvailability,
  createBooking,
  getHallPeriodAvailability,
  getRecommendedVenues,
  createRecurringBookingApi,
} from "../../../api/bookingApi";
import { getAllHalls } from "../../../api/hallApi";
import { getVenueTypes, getVenueFacilities } from "../../../api/masterDataApi";

const initialForm = {
  venue: "",
  dateFrom: "",
  dateTo: "",
  startTime: "",
  endTime: "",
  purpose: "",
  remarks: "",
};

const PERIOD_OPTIONS = [
  { period: 1, label: "P1 - 09:15 AM to 10:05 AM" },
  { period: 2, label: "P2 - 10:05 AM to 10:50 AM" },
  { period: 3, label: "P3 - 11:10 AM to 12:00 PM" },
  { period: 4, label: "P4 - 12:00 PM to 12:50 PM" },
  { period: 5, label: "P5 - 01:50 PM to 02:40 PM" },
  { period: 6, label: "P6 - 02:40 PM to 03:30 PM" },
  { period: 7, label: "P7 - 03:45 PM to 04:30 PM" },
  { period: 8, label: "P8 - 04:30 PM to 05:15 PM" },
];

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

const formatDateLabel = (dateString, language = "en") => {
  const date = new Date(`${dateString}T00:00:00`);

  const locale = { en: "en-IN", ta: "ta-IN", hi: "hi-IN" }[language?.split("-")[0]] || "en-IN";

  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPeriodStatus = (period) =>
  String(period?.status || "").toLowerCase();

const BookVenue = ({ Layout = FacultyLayout, isAdmin = false }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [dailyAvailability, setDailyAvailability] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [selectedPeriodsByDate, setSelectedPeriodsByDate] = useState({});
  const [showVenueDetails, setShowVenueDetails] = useState(false);

  // Feature 5: Recurring Booking State
  const [bookingMode, setBookingMode] = useState("single"); // "single" | "recurring"
  const [recurringDays, setRecurringDays] = useState([1, 3]); // Mon (1) & Wed (3) by default
  const [recurringPeriod, setRecurringPeriod] = useState(1); // Default P1
  const [recurringConflictModal, setRecurringConflictModal] = useState(null);

  // Feature 2: Smart Conflict Detection & Alternative Venues
  const [conflictData, setConflictData] = useState(null);

  // Auto-prefill if redirected from Chatbot or Recommendation
  useEffect(() => {
    if (location.state?.prefillVenueId) {
      const { prefillVenueId, prefillDate, prefillPeriod } = location.state;
      setForm((prev) => ({
        ...prev,
        venue: String(prefillVenueId),
        dateFrom: prefillDate || getLocalDateString(),
        dateTo: prefillDate || getLocalDateString(),
      }));

      if (prefillDate && prefillPeriod) {
        setSelectedPeriodsByDate({
          [prefillDate]: [Number(prefillPeriod)],
        });
      }

      toast.info("Venue details prefilled from recommendation!");
      setTimeout(() => {
        const el = document.getElementById("booking-submission-form");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  const handleUseAlternativeVenue = (alt) => {
    setForm((prev) => ({
      ...prev,
      venue: String(alt.venueId),
    }));
    setConflictData(null);
    toast.success(`Switched venue to ${alt.venueName}. Live availability loaded!`);
    const el = document.getElementById("booking-submission-form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleRecurringDay = (dayNum) => {
    setRecurringDays((prev) =>
      prev.includes(dayNum)
        ? prev.filter((d) => d !== dayNum)
        : [...prev, dayNum].sort((a, b) => a - b)
    );
  };

  // Smart Venue Recommendation State
  const [recDate, setRecDate] = useState(getLocalDateString());
  const [recPeriod, setRecPeriod] = useState(4);
  const [recVenueType, setRecVenueType] = useState("");
  const [recFacilities, setRecFacilities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recSearched, setRecSearched] = useState(false);
  const [venueTypeList, setVenueTypeList] = useState([]);
  const [facilityList, setFacilityList] = useState([]);

  // Load venue types and facilities for recommendation filters
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [typesRes, facsRes] = await Promise.allSettled([
          getVenueTypes(),
          getVenueFacilities(),
        ]);
        if (typesRes.status === "fulfilled" && Array.isArray(typesRes.value?.data)) {
          setVenueTypeList(typesRes.value.data.filter((vt) => vt.IsActive !== 0));
        }
        if (facsRes.status === "fulfilled" && Array.isArray(facsRes.value?.data)) {
          setFacilityList(facsRes.value.data.filter((f) => f.IsActive !== 0));
        }
      } catch (error) {
        console.warn("Could not load master data for recommendations:", error);
      }
    };
    loadMasterData();
  }, []);

  const toggleRecFacility = (facilityName) => {
    setRecFacilities((prev) =>
      prev.includes(facilityName)
        ? prev.filter((name) => name !== facilityName)
        : [...prev, facilityName]
    );
  };

  const handleFindRecommendations = async (e) => {
    if (e) e.preventDefault();
    if (!recDate || !recPeriod) {
      toast.error("Please select a date and period.");
      return;
    }

    setRecLoading(true);
    setRecSearched(true);
    try {
      const res = await getRecommendedVenues({
        date: recDate,
        period: recPeriod,
        venueType: recVenueType,
        facilities: recFacilities,
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      setRecommendations(list);
    } catch (error) {
      toast.error(error.message || "Failed to find recommended venues.");
      setRecommendations([]);
    } finally {
      setRecLoading(false);
    }
  };

  const handleSelectRecommendedVenue = (recVenue) => {
    // 1. Populate venue & date in existing form
    setForm((previous) => ({
      ...previous,
      venue: String(recVenue.venueId),
      dateFrom: recDate,
      dateTo: recDate,
    }));

    // 2. Pre-select this period on that date
    setSelectedPeriodsByDate({
      [recDate]: [Number(recVenue.period)],
    });

    // 3. Clear errors
    setErrors((previous) => ({
      ...previous,
      venue: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      period: undefined,
    }));

    toast.success(`Selected ${recVenue.venueName} for P${recVenue.period} on ${recDate}`);

    // 4. Smooth scroll to review booking details below
    const el = document.getElementById("booking-submission-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
            ownershipType: hall.ownershipType ?? hall.ownership_type ?? "DEPARTMENT",
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
        toast.error(error.message || t("bookVenue.loadVenuesFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadVenues();
  }, [t]);

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
        toast.error(error.message || t("bookVenue.loadAvailabilityFailed"));
        setDailyAvailability([]);
      } finally {
        setPeriodsLoading(false);
      }
    };

    fetchAvailability();
  }, [form.venue, form.dateFrom, form.dateTo, selectedDates, t]);

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
        t("bookVenue.periodBooked", { period: number, date: formatDateLabel(date, i18n.language) })
      );
      return;
    }

    if (!isPeriodAvailable(date, number)) {
      toast.error(
        t("bookVenue.periodUnavailable", { period: number, date: formatDateLabel(date, i18n.language) })
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
        return `${formatDateLabel(date, i18n.language)}: ${periods
          .map((period) => `P${period}`)
          .join(", ")}`;
      })
      .join("  •  ");
  }, [selectedPeriodsByDate, selectedSlotCount, i18n.language]);

  const validate = () => {
    const nextErrors = {};

    if (!form.venue) {
      nextErrors.venue = t("bookVenue.selectVenueError");
    }

    if (!form.dateFrom) {
      nextErrors.dateFrom = t("bookVenue.selectStartDate");
    }

    if (!form.dateTo) {
      nextErrors.dateTo = t("bookVenue.selectEndDate");
    }

    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
      nextErrors.dateTo = t("bookVenue.endDateAfterStart");
    }

    const today = getLocalDateString();

    if (form.dateFrom && form.dateFrom < today) {
      nextErrors.dateFrom = t("bookVenue.futureDate");
    }

    if (form.dateTo && form.dateTo < today) {
      nextErrors.dateTo = t("bookVenue.futureDate");
    }

    if (bookingMode !== "recurring" && selectedSlotCount === 0) {
      nextErrors.period = t("bookVenue.selectPeriod");
    }

    if (bookingMode === "recurring") {
      if (recurringDays.length === 0) {
        nextErrors.recurringDays = "Please select at least one weekday for recurrence.";
      }
      if (!recurringPeriod) {
        nextErrors.recurringPeriod = "Please select a period.";
      }
    }

    if (!form.purpose.trim()) {
      nextErrors.purpose = t("bookVenue.purposeRequired");
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmPartialRecurring = async () => {
    if (!recurringConflictModal?.payload) return;
    setSubmitting(true);
    try {
      const res = await createRecurringBookingApi({
        ...recurringConflictModal.payload,
        forceAvailableOnly: true,
      });
      toast.success(res?.message || `${res?.createdCount || 0} recurring bookings created successfully!`);
      setRecurringConflictModal(null);
      setSubmitted(true);
      setErrors({});
      setSelectedPeriodsByDate({});
      setForm(initialForm);
      setDailyAvailability([]);
      setConflictData(null);
      setTimeout(() => setSubmitted(false), 2200);
    } catch (err) {
      toast.error(err.message || "Failed to create partial recurring bookings.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (bookingMode === "recurring") {
        const recurringPayload = {
          hallId: Number(form.venue),
          reason: form.purpose,
          startDate: form.dateFrom,
          endDate: form.dateTo,
          weekdays: recurringDays,
          periodSlot: Number(recurringPeriod),
          remarks: form.remarks,
          forceAvailableOnly: false,
        };

        try {
          const res = await createRecurringBookingApi(recurringPayload);
          toast.success(res?.message || `${res?.createdCount || 0} recurring bookings created successfully!`);
          setSubmitted(true);
          setErrors({});
          setSelectedPeriodsByDate({});
          setForm(initialForm);
          setDailyAvailability([]);
          setConflictData(null);
          setTimeout(() => setSubmitted(false), 2200);
          return;
        } catch (recErr) {
          if (recErr.status === 409 && (recErr.conflict || recErr.data?.conflict)) {
            setRecurringConflictModal({
              data: recErr.data || recErr,
              payload: recurringPayload,
            });
            return;
          }
          throw recErr;
        }
      }

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
        if (availability?.conflict) {
          setConflictData({
            message: availability.message || "Booking conflict detected.",
            conflictDetails: availability.conflictDetails,
            alternatives: availability.alternatives || [],
          });
          toast.warning(availability.message || "Venue is already booked for this slot. Alternatives suggested below.");
          setSubmitting(false);
          return;
        }
        toast.error(
          availability?.message ||
            t("bookVenue.alreadyBookedSelected")
        );
        setSubmitting(false);
        return;
      }

      const result = await createBooking(payload);
      toast.success(
        result?.message || t(isAdmin ? "bookVenue.bookingApproved" : "bookVenue.bookingSubmitted")
      );

      setSubmitted(true);
      setErrors({});
      setSelectedPeriodsByDate({});
      setForm(initialForm);
      setDailyAvailability([]);

      setTimeout(() => setSubmitted(false), 2200);
    } catch (error) {
      if (error.status === 409 || error.conflict) {
        setConflictData({
          message: error.message || "Booking conflict detected.",
          conflictDetails: error.conflictDetails || error.data?.conflictDetails,
          alternatives: error.alternatives || error.data?.alternatives || [],
        });
        toast.warning(error.message || "Booking conflict detected. See alternative suggestions below.");
      } else {
        toast.error(
          error.message || t("bookVenue.submitFailed")
        );
      }

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
            {t("bookVenue.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("bookVenue.subtitle")}
          </p>
        </div>

        {/* SMART VENUE RECOMMENDATION SECTION */}
        <section aria-labelledby="smart-recommendation-heading" className="mx-auto mb-6 w-full max-w-7xl rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 via-white to-white p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="flex flex-col gap-2 border-b border-blue-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 id="smart-recommendation-heading" className="text-lg font-bold text-slate-800 sm:text-xl">
                  {t("bookVenue.recommendTitle")}
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm">
                  {t("bookVenue.recommendSubtitle")}
                </p>
              </div>
            </div>
          </div>

          {/* FILTER FORM */}
          <form onSubmit={handleFindRecommendations} className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Step 1: Date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {t("bookVenue.recommendDate")}
                </label>
                <input
                  type="date"
                  value={recDate}
                  min={getLocalDateString()}
                  onChange={(e) => setRecDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Step 2: Period */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {t("bookVenue.recommendPeriod")}
                </label>
                <select
                  value={recPeriod}
                  onChange={(e) => setRecPeriod(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  required
                >
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p.period} value={p.period}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Venue Type */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {t("bookVenue.recommendVenueType")} <span className="font-normal text-slate-400">({t("common.optional", "Optional")})</span>
                </label>
                <select
                  value={recVenueType}
                  onChange={(e) => setRecVenueType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">{t("bookVenue.allVenueTypes")}</option>
                  {venueTypeList.map((type) => (
                    <option key={type.id || type.name} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 4: Required Facilities */}
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                {t("bookVenue.requiredFacilities")} <span className="font-normal text-slate-400">({t("common.optional", "Optional")})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {facilityList.length > 0 ? (
                  facilityList.map((facility) => {
                    const isChecked = recFacilities.includes(facility.name);
                    return (
                      <button
                        key={facility.id || facility.name}
                        type="button"
                        onClick={() => toggleRecFacility(facility.name)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          isChecked
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs ring-1 ring-blue-500"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isChecked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </span>
                        {facility.name}
                      </button>
                    );
                  })
                ) : (
                  ["Projector", "Air Conditioner", "Smart Board", "WiFi", "Speaker System", "Podium"].map((name) => {
                    const isChecked = recFacilities.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleRecFacility(name)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          isChecked
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-xs ring-1 ring-blue-500"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isChecked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </span>
                        {name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 5: Action Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={recLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400 cursor-pointer"
              >
                {recLoading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    {t("bookVenue.findingVenues")}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t("bookVenue.findRecommendedVenues")}
                  </>
                )}
              </button>

              {recSearched && (
                <button
                  type="button"
                  onClick={() => {
                    setRecSearched(false);
                    setRecommendations([]);
                    setRecFacilities([]);
                    setRecVenueType("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                >
                  {t("bookVenue.reset", "Reset")}
                </button>
              )}
            </div>
          </form>

          {/* LOADING STATE */}
          {recLoading && (
            <div className="mt-6 flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white p-6 text-center text-slate-600">
              <LoaderCircle size={28} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">{t("bookVenue.findingVenues")}</p>
            </div>
          )}

          {/* RESULTS GRID */}
          {!recLoading && recSearched && recommendations.length > 0 && (
            <div className="mt-6 border-t border-blue-100 pt-5">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>{t("bookVenue.recommendedVenuesHeading")}</span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    {recommendations.length}
                  </span>
                </h3>
                <span className="text-xs font-medium text-slate-500">
                  {t("bookVenue.availableForPeriod", { period: `P${recPeriod}` })} • {recDate}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((venue, idx) => {
                  const isTop = idx === 0;
                  const isSelected = String(form.venue) === String(venue.venueId);

                  return (
                    <div
                      key={venue.venueId}
                      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-200"
                          : isTop
                            ? "border-blue-400 ring-2 ring-blue-100 shadow-xs"
                            : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div>
                        {/* Top Header Badge & Score */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          {isTop ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                              <Star size={11} fill="currentColor" /> {t("bookVenue.topRecommended")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                              <Star size={11} /> {t("bookVenue.recommendedBadge")}
                            </span>
                          )}

                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {t("bookVenue.scoreLabel")}: {venue.score}
                          </span>
                        </div>

                        {/* Venue Name & Badges */}
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-lg font-bold text-slate-900 truncate">
                            {venue.venueName}
                          </h4>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {venue.venueType}
                          </span>
                        </div>

                        {/* Dept & Location */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          {venue.department && <span>{venue.department}</span>}
                          {venue.location && <span>• {venue.location}</span>}
                          {venue.capacity ? <span>• {venue.capacity} seats</span> : null}
                        </div>

                        {/* Facilities */}
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(venue.facilities) && venue.facilities.length > 0 ? (
                              venue.facilities.map((fac) => (
                                <span
                                  key={fac}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200"
                                >
                                  <Check size={10} strokeWidth={3} />
                                  {fac}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {t("bookVenue.noFacilities")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Availability Status */}
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          {t("bookVenue.availableForPeriod", { period: `P${venue.period}` })}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleSelectRecommendedVenue(venue)}
                          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-blue-700 text-white hover:bg-blue-800"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CircleCheck size={14} />
                              {t("bookVenue.selected")}
                            </>
                          ) : (
                            t("bookVenue.selectVenueAction")
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NO RESULTS STATE */}
          {!recLoading && recSearched && recommendations.length === 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-slate-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-semibold text-amber-900">
                    {t("bookVenue.noSuitableVenue")}
                  </h4>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
                    {t("bookVenue.suggestions")}
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-amber-800 space-y-1">
                    <li>{t("bookVenue.removeFacilityFilters")}</li>
                    <li>{t("bookVenue.tryAnotherPeriod")}</li>
                    <li>{t("bookVenue.tryAnotherDate")}</li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setRecFacilities([]);
                          setRecVenueType("");
                          const el = document.getElementById("manual-venue-select");
                          if (el) {
                            el.focus();
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        className="font-semibold underline hover:text-amber-950 cursor-pointer"
                      >
                        {t("bookVenue.viewAllVenues")}
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        <form
          id="booking-submission-form"
          onSubmit={handleSubmit}
          className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7"
        >
          {/* FEATURE 2: SMART CONFLICT DETECTION & ALTERNATIVE VENUE SUGGESTIONS */}
          {conflictData && (
            <div className="mb-6 p-4 md:p-5 bg-amber-50/95 border-2 border-amber-300 rounded-2xl shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-200/70 rounded-xl text-amber-900 shrink-0">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-950 text-base">
                      {t("conflict.title", "Booking Conflict Detected")}
                    </h4>
                    <p className="text-xs md:text-sm text-amber-900 mt-1 whitespace-pre-line leading-relaxed">
                      {conflictData.message}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictData(null)}
                  className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                  title="Dismiss"
                >
                  <X size={18} />
                </button>
              </div>

              {conflictData.alternatives && conflictData.alternatives.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200/80">
                  <p className="font-semibold text-xs text-amber-950 mb-2 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>{t("conflict.availableAlternatives", "Available Alternatives (Ranked by type, facilities & capacity):")}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {conflictData.alternatives.map((alt) => (
                      <div
                        key={alt.venueId}
                        className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">{alt.venueName}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full">
                              {t("common.available", "Available")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {alt.venueType} • Cap: {alt.capacity}
                          </p>
                          {alt.facilities && alt.facilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {alt.facilities.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUseAlternativeVenue(alt)}
                          className="mt-3 w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>{t("conflict.useThisVenue", "Use this venue")}</span>
                          <Check size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FEATURE 5: BOOKING TYPE SELECTOR */}
          <div className="mb-6 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                {t("recurring.bookingType", "Booking Type")}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {bookingMode === "single"
                  ? t("recurring.singleDescription", "Book specific periods on single or consecutive dates.")
                  : t("recurring.recurringDescription", "Repeat booking on selected weekdays across a date range with automatic conflict verification.")}
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setBookingMode("single")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  bookingMode === "single"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("recurring.oneTime", "One-Time Booking")}
              </button>
              <button
                type="button"
                onClick={() => setBookingMode("recurring")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  bookingMode === "recurring"
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Repeat size={13} />
                <span>{t("recurring.recurring", "Recurring Booking")}</span>
              </button>
            </div>
          </div>

          {/* RECURRING OPTIONS CONFIGURATION */}
          {bookingMode === "recurring" && (
            <div className="mb-6 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-950 mb-2 flex items-center gap-1.5">
                <Repeat size={14} className="text-indigo-600" />
                <span>{t("recurring.optionsTitle", "Recurring Schedule Configuration")}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t("recurring.selectWeekdays", "Select Repeating Weekdays:")}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { num: 1, label: "Mon" },
                      { num: 2, label: "Tue" },
                      { num: 3, label: "Wed" },
                      { num: 4, label: "Thu" },
                      { num: 5, label: "Fri" },
                      { num: 6, label: "Sat" },
                    ].map((day) => {
                      const isChecked = recurringDays.includes(day.num);
                      return (
                        <button
                          key={day.num}
                          type="button"
                          onClick={() => handleToggleRecurringDay(day.num)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.recurringDays && (
                    <p className="mt-1 text-xs text-rose-600">{errors.recurringDays}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t("recurring.selectPeriodSlot", "Repeating Period Slot:")}
                  </label>
                  <select
                    value={recurringPeriod}
                    onChange={(e) => setRecurringPeriod(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.period} value={p.period}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-indigo-700 mt-2.5">
                ℹ️ {t("recurring.validationNote", "The system checks every occurrence between Start Date and End Date. If conflicts exist, you can choose all-or-nothing or book available dates.")}
              </p>
            </div>
          )}
          {/* TOP FORM */}
          <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2">
            {/* Venue */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  {t("bookVenue.venue")}
                </label>

                {selectedVenue && (
                  <button
                    type="button"
                    onClick={() => setShowVenueDetails(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer"
                    title={t("bookVenue.viewVenueDetails")}
                  >
                    <Info size={15} />
                    {t("bookVenue.viewVenueDetails")}
                  </button>
                )}
              </div>

              <select
                id="manual-venue-select"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value="">{t("bookVenue.selectVenuePrompt")}</option>

                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} {venue.ownershipType === "COMMON" ? "(🏛 Common Venue)" : `(🏢 ${venue.department || "Dept"})`}
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
                {t("bookVenue.department")}
              </label>

              <input
                value={selectedVenue?.department || ""}
                readOnly
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm"
                placeholder={t("bookVenue.department")}
              />
            </div>

            {/* Date From */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("bookVenue.dateFrom")}
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
                {t("bookVenue.dateTo")}
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
                  {t("bookVenue.timetable")}
                </h3>

                <p className="text-xs text-slate-500">
                  {t("bookVenue.timetableHelp")}
                </p>
              </div>

              {/* LEGEND */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 sm:gap-4 sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                  {t("bookVenue.available")}
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  {t("bookVenue.selected")}
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-gray-400" />
                  {t("bookVenue.alreadyBooked")}
                </span>
              </div>
            </div>

            {!form.venue ||
            !form.dateFrom ||
            !form.dateTo ? (
              <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">
                {t("bookVenue.timetablePrompt")}
              </div>
            ) : periodsLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                {t("bookVenue.loadingAvailability")}
              </div>
            ) : dailyAvailability.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center py-8 text-sm text-slate-500">
                {t("bookVenue.noTimetable")}
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
                      {formatDateLabel(day.date, i18n.language)}
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
                                    {t("bookVenue.alreadyBooked")}
                                  </div>
                                  <div className="mt-0.5 truncate">
                                    {period.bookedBy ||
                                      t("bookVenue.unavailable")}
                                  </div>
                                </>
                              ) : isSelected ? (
                                <span className="font-semibold">
                                  {t("bookVenue.selected")}
                                </span>
                              ) : (
                                <span>{t("bookVenue.available")}</span>
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
                  {t("bookVenue.selectedPeriods")}
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {selectedPeriodLabel ||
                    t("bookVenue.noPeriods")}
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                {selectedSlotCount}{" "}
                {selectedSlotCount === 1
                  ? t("bookVenue.period")
                  : t("bookVenue.periods")}{" "}
                {t("bookVenue.selected")}
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div className="mx-auto mt-5 grid w-full max-w-6xl gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("bookVenue.purpose")}
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
                placeholder={t("bookVenue.purposePlaceholder")}
              />

              {errors.purpose && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {errors.purpose}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("bookVenue.remarks")}
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
                placeholder={t("bookVenue.remarksPlaceholder")}
              />
            </div>
          </div>

          {submitted && (
            <div className="mx-auto mt-5 flex w-full max-w-6xl items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <AlertCircle size={16} />
              {t("bookVenue.bookingSubmitted")}
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
              {t(isAdmin ? "bookVenue.createApproved" : "bookVenue.submit")}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              {t("bookVenue.reset")}
            </button>
          </div>

          {/* RECURRING CONFLICT RESOLUTION MODAL */}
          {recurringConflictModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {t("recurring.conflictTitle", "Recurring Booking Conflicts Detected")}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {recurringConflictModal.data?.message ||
                        `${recurringConflictModal.data?.unavailableOccurrences?.length || 0} of ${
                          recurringConflictModal.data?.totalOccurrences || 0
                        } requested occurrences are unavailable.`}
                    </p>
                  </div>
                </div>

                {recurringConflictModal.data?.unavailableOccurrences && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-rose-800 mb-1">
                      {t("recurring.conflictingDates", "Unavailable Conflicting Dates:")}
                    </p>
                    <ul className="text-xs text-rose-700 space-y-1 list-disc pl-4">
                      {recurringConflictModal.data.unavailableOccurrences.map((occ, idx) => (
                        <li key={idx}>
                          {occ.date} ({occ.timeFrom} - {occ.timeTo}) — {occ.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <span>{t("recurring.availableDatesCount", "Available Occurrences to book:")} </span>
                  <strong>{recurringConflictModal.data?.availableOccurrences?.length || 0} dates</strong>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRecurringConflictModal(null)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {t("recurring.cancelEntire", "Cancel entire recurring booking")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPartialRecurring}
                    disabled={submitting || (recurringConflictModal.data?.availableOccurrences?.length || 0) === 0}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>
                      {t("recurring.bookAvailableOnly", "Book only available dates ({{count}})", {
                        count: recurringConflictModal.data?.availableOccurrences?.length || 0,
                      })}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    {t("bookVenue.venueDetails")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVenueDetails(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label={t("bookVenue.closeVenueDetails")}
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
                      {t("bookVenue.department")}
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.department || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      {t("bookVenue.venueType")}
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.venueType || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      {t("bookVenue.location")}
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.location || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      {t("bookVenue.capacity")}
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {selectedVenue.capacity || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500">
                    {t("bookVenue.facilities")}
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
                        {t("bookVenue.noFacilities")}
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
