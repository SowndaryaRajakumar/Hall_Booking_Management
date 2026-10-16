import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  BookOpen,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Check,
  X,
  AlertCircle,
  Layers,
  Sparkles,
  CalendarDays,
  FileText,
  Pencil,
} from "lucide-react";
import FacultyLayout from "../../../layouts/FacultyLayout";
import {
  getAcademicCalendar,
  createAcademicAllocation,
  updateAcademicAllocation,
  getAcademicAllocationById,
  updateOccurrenceRemark,
} from "../../../api/academicApi";
import { getAllHalls } from "../../../api/hallApi";
import { getAllStaff } from "../../../api/staffApi";

import AcademicPeriodSelector, {
  INSTITUTIONAL_PERIODS,
  ALL_WEEKDAYS,
} from "../../../components/academic/AcademicPeriodSelector";

const PERIOD_LIST = INSTITUTIONAL_PERIODS;
const WEEKDAYS = ALL_WEEKDAYS;

const OCCURRENCE_STATUSES = [
  { value: "SCHEDULED", label: "Scheduled", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "ABSENT", label: "Faculty Absent", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "RESCHEDULED", label: "Rescheduled", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
];

const FacultyAcademicCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'list'
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [facultyMembers, setFacultyMembers] = useState([]);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [venueFilter, setVenueFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [conflictError, setConflictError] = useState(null);

  // Form State for creating Academic Allocation supporting Mode A and Mode B
  const [createForm, setCreateForm] = useState({
    subjectName: "",
    subjectCode: "",
    yearOfStudy: "III Year",
    section: "A",
    venueId: "",
    academicYear: "2026-2027",
    semester: "Semester 1",
    startDate: "2026-07-01",
    endDate: "2026-10-31",
    purpose: "Academic Curriculum Classes",
    selectedDays: [1, 2, 3, 4, 5], // Mon-Fri
    allocationMode: "different", // 'same' (Mode A) or 'different' (Mode B)
    samePeriods: [2, 3, 4],
    dayPeriods: {
      1: [2, 3, 4], // Monday: P2, P3, P4
      2: [1, 2],    // Tuesday: P1, P2
      3: [3, 4, 5], // Wednesday: P3, P4, P5
      4: [2, 3],    // Thursday: P2, P3
      5: [1, 5],    // Friday: P1, P5
      6: [],
    },
  });
  const [submitting, setSubmitting] = useState(false);

  // Occurrence Exception / Remark Form
  const [occurrenceForm, setOccurrenceForm] = useState({
    status: "SCHEDULED",
    remark: "",
    alternateFacultyId: "",
  });
  const [savingOccurrence, setSavingOccurrence] = useState(false);

  // Edit Allocation State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [updatingAllocation, setUpdatingAllocation] = useState(false);
  const [editForm, setEditForm] = useState({
    subjectName: "",
    subjectCode: "",
    yearOfStudy: "III Year",
    section: "A",
    venueId: "",
    academicYear: "2026-2027",
    semester: "Semester 1",
    startDate: "",
    endDate: "",
    purpose: "",
    selectedDays: [1, 2, 3, 4, 5],
    allocationMode: "different",
    samePeriods: [2, 3, 4],
    dayPeriods: {
      1: [2, 3, 4],
      2: [1, 2],
      3: [3, 4, 5],
      4: [2, 3],
      5: [1, 5],
      6: [],
    },
  });

  const showToastMsg = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Calculate Start and End range for current view
  const { dateRangeStart, dateRangeEnd } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const s = new Date(firstDay);
      s.setDate(s.getDate() - s.getDay()); // Sunday before

      const e = new Date(lastDay);
      e.setDate(e.getDate() + (6 - e.getDay())); // Saturday after

      return {
        dateRangeStart: s.toISOString().slice(0, 10),
        dateRangeEnd: e.toISOString().slice(0, 10),
      };
    } else if (viewMode === "week") {
      const curr = new Date(currentDate);
      const first = curr.getDate() - curr.getDay(); // Sunday
      const s = new Date(curr.setDate(first));
      const e = new Date(curr.setDate(first + 6)); // Saturday
      return {
        dateRangeStart: s.toISOString().slice(0, 10),
        dateRangeEnd: e.toISOString().slice(0, 10),
      };
    } else {
      // List view covers 3 months around current date
      const s = new Date(year, month - 1, 1);
      const e = new Date(year, month + 2, 0);
      return {
        dateRangeStart: s.toISOString().slice(0, 10),
        dateRangeEnd: e.toISOString().slice(0, 10),
      };
    }
  }, [currentDate, viewMode]);

  // Load occurrences from API
  const loadOccurrences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAcademicCalendar({
        startDate: dateRangeStart,
        endDate: dateRangeEnd,
      });
      setOccurrences(res.occurrences || []);
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    loadOccurrences();
  }, [loadOccurrences]);

  // Load venues and faculty for dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const token = localStorage.getItem("token");
        const [hallsRes, staffRes] = await Promise.allSettled([
          getAllHalls({ limit: 100, status: "active" }),
          getAllStaff(token, { limit: 100 }),
        ]);

        let hallList = [];
        if (hallsRes.status === "fulfilled") {
          const resVal = hallsRes.value;
          const raw = resVal?.data || resVal?.halls || (Array.isArray(resVal) ? resVal : []);
          hallList = raw.map((h) => ({
            id: h.hallId ?? h.HallID ?? h.id,
            name: h.hallName ?? h.HallName ?? h.name ?? "Venue",
            venueType: h.venueType ?? h.VenueType ?? "Classroom",
            ownershipType: h.ownershipType ?? h.ownership_type ?? "DEPARTMENT",
            department: h.department ?? h.DeptName ?? "",
          })).filter((h) => h.id);
        }
        setVenues(hallList);
        if (hallList.length > 0 && !createForm.venueId) {
          setCreateForm((prev) => ({ ...prev, venueId: String(hallList[0].id) }));
        }

        let staffList = [];
        if (staffRes.status === "fulfilled") {
          const resVal = staffRes.value;
          const raw = resVal?.data || resVal?.staff || (Array.isArray(resVal) ? resVal : []);
          staffList = raw
            .filter((s) => s.role === "FACULTY" || s.role === "staff")
            .map((s) => ({
              id: s.staff_id ?? s.id,
              name: s.full_name ?? s.name ?? "Faculty",
              department: s.department ?? "",
            }))
            .filter((s) => s.id);
        }
        setFacultyMembers(staffList);
      } catch (err) {
        console.error("Dropdown loading failed:", err);
      }
    };
    fetchDropdowns();
  }, []);

  // Filtered Occurrences
  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((occ) => {
      if (subjectFilter !== "all" && occ.subjectName !== subjectFilter) return false;
      if (venueFilter !== "all" && String(occ.venueId) !== venueFilter) return false;
      if (statusFilter !== "all" && occ.status !== statusFilter) return false;
      return true;
    });
  }, [occurrences, subjectFilter, venueFilter, statusFilter]);

  // Unique Subjects for filter
  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(occurrences.map((o) => o.subjectName))).filter(Boolean);
  }, [occurrences]);

  // Calendar Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() - 1);
    else if (viewMode === "week") next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() + 1);
    else if (viewMode === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Mode and Period Toggle Handlers
  const handleModeChange = (mode, isEdit = false) => {
    const setter = isEdit ? setEditForm : setCreateForm;
    setter((prev) => {
      const nextDayPeriods = { ...prev.dayPeriods };
      if (mode === "different") {
        prev.selectedDays.forEach((d) => {
          if (!nextDayPeriods[d] || !nextDayPeriods[d].length) {
            nextDayPeriods[d] = [...prev.samePeriods];
          }
        });
        return { ...prev, allocationMode: mode, dayPeriods: nextDayPeriods };
      } else {
        const firstActive = prev.selectedDays.find((d) => nextDayPeriods[d]?.length);
        const nextSame = firstActive && nextDayPeriods[firstActive]?.length
          ? [...nextDayPeriods[firstActive]]
          : (prev.samePeriods.length ? prev.samePeriods : [2, 3, 4]);
        return { ...prev, allocationMode: mode, samePeriods: nextSame };
      }
    });
  };

  const handleToggleSamePeriod = (periodNum, isEdit = false) => {
    const setter = isEdit ? setEditForm : setCreateForm;
    setter((prev) => {
      const exists = prev.samePeriods.includes(periodNum);
      const next = exists
        ? prev.samePeriods.filter((p) => p !== periodNum)
        : [...prev.samePeriods, periodNum].sort((a, b) => a - b);
      return { ...prev, samePeriods: next };
    });
  };

  const handleSetSamePeriods = (periods, isEdit = false) => {
    const setter = isEdit ? setEditForm : setCreateForm;
    setter((prev) => ({ ...prev, samePeriods: [...periods].sort((a, b) => a - b) }));
  };

  const handleToggleDayPeriod = (dayIndex, periodNum, isEdit = false) => {
    const setter = isEdit ? setEditForm : setCreateForm;
    setter((prev) => {
      const currentList = prev.dayPeriods[dayIndex] || [];
      const exists = currentList.includes(periodNum);
      const nextList = exists
        ? currentList.filter((p) => p !== periodNum)
        : [...currentList, periodNum].sort((a, b) => a - b);
      return {
        ...prev,
        dayPeriods: {
          ...prev.dayPeriods,
          [dayIndex]: nextList,
        },
      };
    });
  };

  const handleSetDayPeriods = (dayIndex, periods, isEdit = false) => {
    const setter = isEdit ? setEditForm : setCreateForm;
    setter((prev) => ({
      ...prev,
      dayPeriods: {
        ...prev.dayPeriods,
        [dayIndex]: [...periods].sort((a, b) => a - b),
      },
    }));
  };

  const buildRulesFromForm = (form) => {
    const rules = [];
    if (form.allocationMode === "same") {
      if (!form.samePeriods.length) {
        throw new Error("Please select at least one period for your selected weekdays.");
      }
      for (const dayIdx of form.selectedDays) {
        const dayObj = ALL_WEEKDAYS.find((w) => w.index === dayIdx);
        for (const pId of form.samePeriods) {
          const pObj = INSTITUTIONAL_PERIODS.find((p) => p.period === pId);
          rules.push({
            dayIndex: dayIdx,
            dayOfWeek: dayObj ? dayObj.name : "Monday",
            periodId: pId,
            startTime: pObj ? `${pObj.start}:00` : "09:15:00",
            endTime: pObj ? `${pObj.end}:00` : "10:05:00",
          });
        }
      }
    } else {
      // Mode B: Different periods per day
      for (const dayIdx of form.selectedDays) {
        const dayObj = ALL_WEEKDAYS.find((w) => w.index === dayIdx);
        const dayList = form.dayPeriods[dayIdx] || [];
        if (!dayList.length) {
          throw new Error(`Please select at least one period for ${dayObj ? dayObj.name : `Day ${dayIdx}`}.`);
        }
        for (const pId of dayList) {
          const pObj = INSTITUTIONAL_PERIODS.find((p) => p.period === pId);
          rules.push({
            dayIndex: dayIdx,
            dayOfWeek: dayObj ? dayObj.name : "Monday",
            periodId: pId,
            startTime: pObj ? `${pObj.start}:00` : "09:15:00",
            endTime: pObj ? `${pObj.end}:00` : "10:05:00",
          });
        }
      }
    }
    return rules;
  };

  // Day toggling in creation modal
  const handleToggleDay = (dayIdx) => {
    setCreateForm((prev) => {
      const exists = prev.selectedDays.includes(dayIdx);
      const nextDays = exists
        ? prev.selectedDays.filter((d) => d !== dayIdx)
        : [...prev.selectedDays, dayIdx].sort((a, b) => a - b);
      return { ...prev, selectedDays: nextDays };
    });
  };

  // Create Academic Allocation Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setConflictError(null);
    setSubmitting(true);

    try {
      if (!createForm.selectedDays.length) {
        throw new Error("Please select at least one weekday for this allocation.");
      }

      // Build schedule rules supporting multiple periods per weekday
      const rules = buildRulesFromForm(createForm);

      const payload = {
        venueId: Number(createForm.venueId),
        academicYear: createForm.academicYear,
        semester: createForm.semester,
        subjectName: createForm.subjectName.trim(),
        subjectCode: createForm.subjectCode.trim(),
        yearOfStudy: createForm.yearOfStudy,
        section: createForm.section,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        purpose: createForm.purpose,
        rules,
      };

      const result = await createAcademicAllocation(payload);
      showToastMsg(result.message || "Academic Allocation created successfully!");
      setShowCreateModal(false);
      loadOccurrences();
    } catch (err) {
      if (err.conflict) {
        setConflictError(err);
      } else {
        showToastMsg(err.message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Occurrence Details & Remark Modal
  const openOccurrenceDetails = (occ) => {
    setSelectedOccurrence(occ);
    setOccurrenceForm({
      status: occ.status || "SCHEDULED",
      remark: occ.remark || "",
      alternateFacultyId: occ.alternateFacultyId ? String(occ.alternateFacultyId) : "",
    });
    setShowDetailModal(true);
  };

  // Save Occurrence Remark / Status
  const handleSaveOccurrenceRemark = async (e) => {
    e.preventDefault();
    if (!selectedOccurrence) return;
    setSavingOccurrence(true);

    try {
      await updateOccurrenceRemark(
        selectedOccurrence.allocationId,
        selectedOccurrence.date,
        {
          periodId: selectedOccurrence.periodId,
          status: occurrenceForm.status,
          remark: occurrenceForm.remark,
          alternateFacultyId: occurrenceForm.alternateFacultyId || null,
        }
      );

      showToastMsg(`Occurrence on ${selectedOccurrence.date} updated successfully!`);
      setShowDetailModal(false);
      loadOccurrences();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setSavingOccurrence(false);
    }
  };

  // Open Edit Allocation Modal (fetches latest database record to eliminate stale state)
  const handleOpenEditAllocation = async (allocationId) => {
    if (!allocationId) return;
    setShowDetailModal(false);
    setEditingAllocationId(allocationId);
    setShowEditModal(true);
    setLoadingEditData(true);
    setConflictError(null);

    try {
      const data = await getAcademicAllocationById(allocationId);
      if (data) {
        const grouped = {};
        (data.rules || []).forEach((r) => {
          const d = Number(r.day_index || r.dayIndex);
          const p = Number(r.period_id || r.periodId);
          if (!grouped[d]) grouped[d] = [];
          if (!grouped[d].includes(p)) grouped[d].push(p);
          grouped[d].sort((a, b) => a - b);
        });

        const dayKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        const selDays = dayKeys.length > 0 ? dayKeys : [1, 2, 3, 4, 5];

        let isSame = true;
        let firstDayPeriodsStr = null;
        for (const d of selDays) {
          const pStr = (grouped[d] || []).join(",");
          if (firstDayPeriodsStr === null) {
            firstDayPeriodsStr = pStr;
          } else if (pStr !== firstDayPeriodsStr) {
            isSame = false;
            break;
          }
        }

        const defaultSame = grouped[selDays[0]] || [2, 3, 4];
        const initialDayPeriods = {
          1: grouped[1] || [...defaultSame],
          2: grouped[2] || [...defaultSame],
          3: grouped[3] || [...defaultSame],
          4: grouped[4] || [...defaultSame],
          5: grouped[5] || [...defaultSame],
          6: grouped[6] || [],
        };

        setEditForm({
          subjectName: data.subject_name || "",
          subjectCode: data.subject_code || "",
          yearOfStudy: data.year_of_study || "III Year",
          section: data.section || "A",
          venueId: String(data.venue_id || ""),
          academicYear: data.academic_year || "2026-2027",
          semester: data.semester || "Semester 1",
          startDate: data.start_date ? String(data.start_date).slice(0, 10) : "",
          endDate: data.end_date ? String(data.end_date).slice(0, 10) : "",
          purpose: data.purpose || "",
          selectedDays: selDays,
          allocationMode: isSame ? "same" : "different",
          samePeriods: defaultSame,
          dayPeriods: initialDayPeriods,
        });
      }
    } catch (err) {
      showToastMsg("Failed to load latest allocation record: " + err.message, "error");
    } finally {
      setLoadingEditData(false);
    }
  };

  // Day toggle in edit modal
  const handleToggleEditDay = (dayIdx) => {
    setEditForm((prev) => {
      const exists = prev.selectedDays.includes(dayIdx);
      const nextDays = exists
        ? prev.selectedDays.filter((d) => d !== dayIdx)
        : [...prev.selectedDays, dayIdx].sort((a, b) => a - b);
      return { ...prev, selectedDays: nextDays };
    });
  };

  // Submit Edited Allocation
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAllocationId || !editForm.venueId) return;
    setUpdatingAllocation(true);
    setConflictError(null);

    try {
      const rules = buildRulesFromForm(editForm);

      const res = await updateAcademicAllocation(editingAllocationId, {
        venueId: Number(editForm.venueId),
        subjectName: editForm.subjectName.trim(),
        subjectCode: editForm.subjectCode?.trim(),
        yearOfStudy: editForm.yearOfStudy,
        section: editForm.section,
        academicYear: editForm.academicYear,
        semester: editForm.semester,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        purpose: editForm.purpose.trim(),
        rules,
      });

      const newVenueName =
        res.data?.venue_name ||
        venues.find((v) => String(v.id) === String(editForm.venueId))?.name ||
        "new venue";

      showToastMsg(`Allocation updated successfully! Venue changed to ${newVenueName}.`);
      setShowEditModal(false);
      // Immediately reload calendar occurrences from backend
      await loadOccurrences();
    } catch (err) {
      if (err.conflict) {
        setConflictError(err);
      } else {
        showToastMsg(err.message, "error");
      }
    } finally {
      setUpdatingAllocation(false);
    }
  };

  // Month Grid Days Generator
  const monthGridDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startOffset = firstDay.getDay(); // 0 is Sun
    const totalDays = lastDay.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate, viewMode]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <FacultyLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
              toast.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "error" ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                Academic Portal
              </span>
              <span className="text-blue-300 text-sm">Semester 2026-2027</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Faculty Academic Calendar
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-xl">
              Manage your semester teaching venue allocations, view recurring schedules, and report single-day remarks or absence overrides.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setConflictError(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-sm shadow-md hover:bg-blue-50 transition transform active:scale-95"
            >
              <Plus size={18} />
              New Academic Allocation
            </button>
          </div>
        </div>

        {/* Navigation & Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              title="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              title="Next"
            >
              <ChevronRight size={18} />
            </button>

            <span className="text-base sm:text-lg font-bold text-slate-800 ml-2">
              {currentDate.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "month"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "week"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "list"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agenda / List
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Venues</option>
              {venues.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {OCCURRENCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500 font-medium">Generating academic schedule occurrences...</p>
          </div>
        )}

        {/* 1. MONTH VIEW */}
        {!loading && viewMode === "month" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {monthGridDays.map((dObj, idx) => {
                const dayOccurrences = filteredOccurrences.filter((o) => o.date === dObj.date);
                const isToday = dObj.date === todayStr;

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-2 flex flex-col justify-between transition ${
                      !dObj.isCurrentMonth
                        ? "bg-slate-50/50 text-slate-400"
                        : isToday
                        ? "bg-blue-50/30"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : dObj.isCurrentMonth
                            ? "text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {dObj.dayNum}
                      </span>
                      {dayOccurrences.length > 0 && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          {dayOccurrences.length} class{dayOccurrences.length > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>

                    {/* Classes on this day */}
                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-28 pr-0.5">
                      {dayOccurrences.map((occ) => {
                        const statusObj =
                          OCCURRENCE_STATUSES.find((s) => s.value === occ.status) || OCCURRENCE_STATUSES[0];
                        const isAbsent = occ.status === "ABSENT";
                        const isCancelled = occ.status === "CANCELLED";

                        return (
                          <div
                            key={occ.id}
                            onClick={() => openOccurrenceDetails(occ)}
                            className={`p-1.5 rounded-lg border text-left cursor-pointer transition hover:shadow-md transform hover:-translate-y-0.5 ${
                              isCancelled
                                ? "bg-slate-100 border-slate-300 text-slate-500 line-through opacity-75"
                                : isAbsent
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="truncate">{occ.subjectName}</span>
                              <span className="text-[10px] bg-white/80 px-1 py-0.2 rounded font-semibold border border-slate-200">
                                P{occ.periodId}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-600 truncate mt-0.5">
                              {occ.yearSection} • {occ.venueName}
                            </div>
                            {occ.remark && (
                              <div className="text-[9px] text-amber-700 italic truncate mt-0.5">
                                Note: {occ.remark}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW */}
        {!loading && viewMode === "week" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-6 gap-3">
                {WEEKDAYS.map((wd) => {
                  const dayOccurrences = filteredOccurrences.filter(
                    (o) => o.dayOfWeek.toLowerCase() === wd.name.toLowerCase()
                  );

                  return (
                    <div key={wd.name} className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col">
                      <div className="border-b border-slate-200 pb-2 mb-2 text-center">
                        <h4 className="font-bold text-slate-800 text-sm">{wd.name}</h4>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {dayOccurrences.length} assigned
                        </span>
                      </div>

                      <div className="space-y-2 flex-1">
                        {dayOccurrences.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400 italic">
                            No classes
                          </div>
                        ) : (
                          dayOccurrences.map((occ) => (
                            <div
                              key={occ.id}
                              onClick={() => openOccurrenceDetails(occ)}
                              className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-900">
                                  {occ.subjectName}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                  Period {occ.periodId}
                                </span>
                              </div>
                              <div className="text-xs text-slate-700 font-medium mt-1">
                                {occ.yearSection}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={12} /> {occ.venueName}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {occ.startTime} - {occ.endTime}
                              </div>
                              {occ.status !== "SCHEDULED" && (
                                <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  {occ.status}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. AGENDA / LIST VIEW */}
        {!loading && viewMode === "list" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
            {filteredOccurrences.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarDays size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 font-semibold text-base">No academic classes scheduled</p>
                <p className="text-slate-400 text-xs mt-1">Click "New Academic Allocation" to set up your semester recurring timetable.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOccurrences.map((occ) => {
                  const statusObj =
                    OCCURRENCE_STATUSES.find((s) => s.value === occ.status) || OCCURRENCE_STATUSES[0];

                  return (
                    <div
                      key={occ.id}
                      onClick={() => openOccurrenceDetails(occ)}
                      className="py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="bg-blue-100 text-blue-900 rounded-xl p-2.5 text-center min-w-[54px]">
                          <span className="block text-[10px] font-bold uppercase text-blue-600">
                            {new Date(occ.date).toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span className="block text-base font-extrabold leading-tight">
                            {new Date(occ.date).getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{occ.subjectName}</h4>
                            {occ.subjectCode && (
                              <span className="text-xs text-slate-500 font-mono">({occ.subjectCode})</span>
                            )}
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-700 font-medium">
                              Period {occ.periodId} ({occ.startTime} - {occ.endTime})
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                            <span>{occ.yearSection}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <MapPin size={13} className="text-blue-600" /> {occ.venueName}
                            </span>
                            {occ.alternateFacultyName && (
                              <span className="text-purple-700 font-medium">
                                Alt: {occ.alternateFacultyName}
                              </span>
                            )}
                          </div>

                          {occ.remark && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                              Note: {occ.remark}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${statusObj.color}`}>
                          {statusObj.label}
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: CREATE ACADEMIC ALLOCATION                      */}
        {/* ======================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Create Academic Semester Allocation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure a recurring laboratory/classroom assignment for the entire semester.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Conflict Error Notice */}
              {conflictError && (
                <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                    <AlertTriangle size={16} className="text-rose-600" />
                    Scheduling Conflict Detected
                  </div>
                  <p>{conflictError.message}</p>
                  {conflictError.conflict && (
                    <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100 text-slate-700 mt-2 space-y-0.5">
                      <div><strong>Venue:</strong> {conflictError.conflict.venue}</div>
                      <div><strong>Date & Time:</strong> {conflictError.conflict.date} ({conflictError.conflict.time})</div>
                      <div><strong>Existing Class/Booking:</strong> {conflictError.conflict.existingSubjectOrReason} ({conflictError.conflict.existingStaffName})</div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Subject Name & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Microwave & Optical Technology (MWT)"
                      value={createForm.subjectName}
                      onChange={(e) => setCreateForm({ ...createForm, subjectName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EC8501"
                      value={createForm.subjectCode}
                      onChange={(e) => setCreateForm({ ...createForm, subjectCode: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Year of Study, Section, Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Year of Study *
                    </label>
                    <select
                      value={createForm.yearOfStudy}
                      onChange={(e) => setCreateForm({ ...createForm, yearOfStudy: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                    >
                      <option value="I Year">I Year</option>
                      <option value="II Year">II Year</option>
                      <option value="III Year">III Year</option>
                      <option value="IV Year">IV Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Section *
                    </label>
                    <select
                      value={createForm.section}
                      onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Venue *
                    </label>
                    <select
                      required
                      value={createForm.venueId}
                      onChange={(e) => setCreateForm({ ...createForm, venueId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
                    >
                      {venues.length === 0 ? (
                        <option value="" disabled>Unable to load venues. Please refresh.</option>
                      ) : (
                        venues.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.name} ({v.venueType})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Academic Year, Semester, Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.academicYear}
                      onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester *
                    </label>
                    <select
                      value={createForm.semester}
                      onChange={(e) => setCreateForm({ ...createForm, semester: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                    >
                      <option value="Semester 1">Semester 1 (Odd)</option>
                      <option value="Semester 2">Semester 2 (Even)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.endDate}
                      onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Weekdays Selection */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Recurring Weekdays *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = createForm.selectedDays.includes(wd.index);
                      return (
                        <button
                          type="button"
                          key={wd.index}
                          onClick={() => handleToggleDay(wd.index)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {isSelected && <Check size={12} className="inline mr-1" />}
                          {wd.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Upgraded Multi-Period Assignment Supporting Mode A and Mode B */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Academic Period Assignment *
                    </label>
                    <AcademicPeriodSelector
                      allocationMode={createForm.allocationMode}
                      onModeChange={(mode) => handleModeChange(mode, false)}
                      selectedDays={createForm.selectedDays}
                      samePeriods={createForm.samePeriods}
                      onToggleSamePeriod={(pNum) => handleToggleSamePeriod(pNum, false)}
                      onSetSamePeriods={(periods) => handleSetSamePeriods(periods, false)}
                      dayPeriods={createForm.dayPeriods}
                      onToggleDayPeriod={(dIdx, pNum) => handleToggleDayPeriod(dIdx, pNum, false)}
                      onSetDayPeriods={(dIdx, periods) => handleSetDayPeriods(dIdx, periods, false)}
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Purpose / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Regular theory / laboratory practical sessions as per University syllabus"
                    value={createForm.purpose}
                    onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {submitting ? "Allocating..." : "Confirm Semester Allocation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: OCCURRENCE DETAILS & REMARK OVERRIDE            */}
        {/* ======================================================== */}
        {showDetailModal && selectedOccurrence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Occurrence Override
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedOccurrence.subjectName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Change Venue & Allocation Quick-Action */}
              <div className="flex items-center justify-between p-3 bg-blue-50/70 rounded-xl border border-blue-200 mb-4">
                <div>
                  <span className="text-xs font-bold text-blue-950 block">Semester Allocation Settings</span>
                  <span className="text-[11px] text-blue-700">Need to relocate to another hall or update syllabus schedule?</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditAllocation(selectedOccurrence.allocationId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-xs"
                >
                  <Pencil size={13} /> Change Venue
                </button>
              </div>

              {/* Read-Only Details */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-4">
                <div>
                  <span className="text-slate-500 block">Date & Day</span>
                  <span className="font-bold text-slate-800">
                    {selectedOccurrence.date} ({selectedOccurrence.dayOfWeek})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Period Slot</span>
                  <span className="font-bold text-slate-800">
                    Period {selectedOccurrence.periodId} ({selectedOccurrence.startTime} - {selectedOccurrence.endTime})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Venue</span>
                  <span className="font-bold text-slate-800">{selectedOccurrence.venueName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Class / Section</span>
                  <span className="font-bold text-slate-800">{selectedOccurrence.yearSection}</span>
                </div>
              </div>

              <form onSubmit={handleSaveOccurrenceRemark} className="space-y-4">
                {/* Occurrence Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Occurrence Status *
                  </label>
                  <select
                    value={occurrenceForm.status}
                    onChange={(e) => setOccurrenceForm({ ...occurrenceForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
                  >
                    {OCCURRENCE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Setting ABSENT or CANCELLED applies ONLY to this single date. The rest of the semester schedule remains active.
                  </p>
                </div>

                {/* Optional Alternate Faculty */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designated Alternate Faculty (Optional)
                  </label>
                  <select
                    value={occurrenceForm.alternateFacultyId}
                    onChange={(e) =>
                      setOccurrenceForm({ ...occurrenceForm, alternateFacultyId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="">None / Handled by Department</option>
                    {facultyMembers.map((fac) => (
                      <option key={fac.staff_id} value={fac.staff_id}>
                        {fac.full_name} ({fac.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specific Remark */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Attendance / Absence Remark *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Faculty absent today. Alternate faculty will handle the class."
                    value={occurrenceForm.remark}
                    onChange={(e) => setOccurrenceForm({ ...occurrenceForm, remark: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingOccurrence}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {savingOccurrence ? "Saving..." : "Save Occurrence Remark"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: EDIT ACADEMIC ALLOCATION (CHANGE VENUE)          */}
        {/* ======================================================== */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Edit Academic Allocation / Change Venue
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update the assigned venue, teaching timings, or semester course details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingEditData ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                  <p className="mt-2 text-xs text-slate-500">Loading latest allocation details...</p>
                </div>
              ) : (
                <>
                  {conflictError && (
                    <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                        <AlertTriangle size={16} className="text-rose-600" />
                        Scheduling Conflict Detected
                      </div>
                      <p>{conflictError.message}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    {/* Venue Selection */}
                    <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                      <label className="block text-xs font-bold text-blue-950 mb-1">
                        Assigned Venue *
                      </label>
                      <select
                        required
                        value={editForm.venueId}
                        onChange={(e) => setEditForm({ ...editForm, venueId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-bold text-slate-800"
                      >
                        {venues.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.name} ({v.venueType}) {v.ownershipType === 'COMMON' ? '• Common Venue' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-blue-700 mt-1">
                        Changing the venue updates all recurring future occurrences for this allocation.
                      </p>
                    </div>

                    {/* Subject Name & Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Subject Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.subjectName}
                          onChange={(e) => setEditForm({ ...editForm, subjectName: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Subject Code
                        </label>
                        <input
                          type="text"
                          value={editForm.subjectCode}
                          onChange={(e) => setEditForm({ ...editForm, subjectCode: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Class / Year / Semester */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Year of Study</label>
                        <select
                          value={editForm.yearOfStudy}
                          onChange={(e) => setEditForm({ ...editForm, yearOfStudy: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="I Year">I Year</option>
                          <option value="II Year">II Year</option>
                          <option value="III Year">III Year</option>
                          <option value="IV Year">IV Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
                        <select
                          value={editForm.section}
                          onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                          <option value="C">Section C</option>
                          <option value="D">Section D</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          required
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          required
                          value={editForm.endDate}
                          onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Recurring Weekdays & Multi-Period Selector */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2">
                          Recurring Weekdays *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((wd) => {
                            const isSelected = editForm.selectedDays.includes(wd.index);
                            return (
                              <button
                                type="button"
                                key={wd.index}
                                onClick={() => handleToggleEditDay(wd.index)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {isSelected && <Check size={12} className="inline mr-1" />}
                                {wd.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-800 mb-2">
                          Academic Period Assignment *
                        </label>
                        <AcademicPeriodSelector
                          allocationMode={editForm.allocationMode}
                          onModeChange={(mode) => handleModeChange(mode, true)}
                          selectedDays={editForm.selectedDays}
                          samePeriods={editForm.samePeriods}
                          onToggleSamePeriod={(pNum) => handleToggleSamePeriod(pNum, true)}
                          onSetSamePeriods={(periods) => handleSetSamePeriods(periods, true)}
                          dayPeriods={editForm.dayPeriods}
                          onToggleDayPeriod={(dIdx, pNum) => handleToggleDayPeriod(dIdx, pNum, true)}
                          onSetDayPeriods={(dIdx, periods) => handleSetDayPeriods(dIdx, periods, true)}
                        />
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Notes</label>
                      <textarea
                        rows={2}
                        value={editForm.purpose}
                        onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingAllocation}
                        className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                      >
                        {updatingAllocation ? "Saving Changes..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyAcademicCalendar;
