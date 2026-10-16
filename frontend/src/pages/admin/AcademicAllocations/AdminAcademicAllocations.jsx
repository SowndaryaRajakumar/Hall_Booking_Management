import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Building,
  User,
  AlertTriangle,
  Layers,
  ChevronRight,
  Eye,
  Check,
  X,
  AlertCircle,
  FileText,
  Pencil,
} from "lucide-react";
import AdminLayout from "../../../layouts/AdminLayout";
import Pagination from "../../../components/Pagination";
import {
  getAcademicAllocations,
  updateAcademicAllocationStatus,
  createAcademicAllocation,
  updateAcademicAllocation,
  getAcademicAllocationById,
  getAcademicCalendar,
} from "../../../api/academicApi";
import { getAllHalls } from "../../../api/hallApi";
import { getAllStaff } from "../../../api/staffApi";
import AcademicPeriodSelector, {
  INSTITUTIONAL_PERIODS,
  ALL_WEEKDAYS,
} from "../../../components/academic/AcademicPeriodSelector";

const PERIOD_LIST = INSTITUTIONAL_PERIODS;
const WEEKDAYS = ALL_WEEKDAYS;

const AdminAcademicAllocations = () => {
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'calendar'
  const [allocations, setAllocations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [venues, setVenues] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Modals & Action States
  const [toast, setToast] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    facultyId: "",
    venueId: "",
    academicYear: "2026-2027",
    semester: "Semester 1",
    subjectName: "",
    subjectCode: "",
    yearOfStudy: "III Year",
    section: "A",
    startDate: "2026-07-01",
    endDate: "2026-10-31",
    purpose: "Academic Curriculum Classes",
    selectedDays: [1, 2, 3, 4, 5],
    allocationMode: "different", // 'same' | 'different'
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
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  // Edit Allocation State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [updatingAllocation, setUpdatingAllocation] = useState(false);
  const [editForm, setEditForm] = useState({
    facultyId: "",
    venueId: "",
    academicYear: "2026-2027",
    semester: "Semester 1",
    subjectName: "",
    subjectCode: "",
    yearOfStudy: "III Year",
    section: "A",
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

  const loadAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (selectedVenue !== "all") params.venueId = selectedVenue;

      const res = await getAcademicAllocations(params);
      setAllocations(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, selectedVenue]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const token = localStorage.getItem("token");
        const [hallsRes, staffRes] = await Promise.all([
          getAllHalls({ limit: 100 }),
          getAllStaff(token, { limit: 100 }),
        ]);
        const hList = (hallsRes.halls || hallsRes.data || []).map((h) => ({
          ...h,
          id: h.hallId ?? h.HallID ?? h.id,
          name: h.hallName ?? h.HallName ?? h.name ?? "",
        }));
        setVenues(hList);
        if (hList.length && !createForm.venueId) {
          setCreateForm((p) => ({ ...p, venueId: String(hList[0].id) }));
        }

        const rawStaff = staffRes.data || staffRes.staff || staffRes || [];
        const sList = (Array.isArray(rawStaff) ? rawStaff : []).map((s) => ({
          ...s,
          id: s.staff_id ?? s.id ?? s.userId,
          name: s.full_name ?? s.name ?? s.staffName ?? "",
          department: s.department ?? "",
        }));
        setFacultyList(sList);
        if (sList.length && !createForm.facultyId) {
          setCreateForm((p) => ({ ...p, facultyId: String(sList[0].id) }));
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    };
    fetchMetadata();
  }, []);

  // Status Action (Approve / Reject)
  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await updateAcademicAllocationStatus(id, "APPROVED");
      showToastMsg("Academic Allocation approved successfully!");
      loadAllocations();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (alloc) => {
    setSelectedAllocation(alloc);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    setProcessingId(selectedAllocation.id);

    try {
      await updateAcademicAllocationStatus(
        selectedAllocation.id,
        "REJECTED",
        rejectionReason || "Scheduling conflict or administrative decision"
      );
      showToastMsg("Allocation request rejected.");
      setShowRejectModal(false);
      loadAllocations();
    } catch (err) {
      showToastMsg(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Multi-Period Mode and Toggle Handlers
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

  // Create Allocation Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setConflictError(null);
    setSubmitting(true);

    try {
      if (!createForm.selectedDays.length) {
        throw new Error("Please select at least one weekday.");
      }

      const rules = buildRulesFromForm(createForm);

      const payload = {
        facultyId: Number(createForm.facultyId),
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

      await createAcademicAllocation(payload);
      showToastMsg("Academic Allocation created successfully!");
      setShowCreateModal(false);
      loadAllocations();
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

  const handleOpenEditAllocation = async (allocationId) => {
    if (!allocationId) return;
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
          facultyId: String(data.faculty_id || ""),
          venueId: String(data.venue_id || ""),
          academicYear: data.academic_year || "2026-2027",
          semester: data.semester || "Semester 1",
          subjectName: data.subject_name || "",
          subjectCode: data.subject_code || "",
          yearOfStudy: data.year_of_study || "III Year",
          section: data.section || "A",
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
      showToastMsg("Failed to load allocation details: " + err.message, "error");
    } finally {
      setLoadingEditData(false);
    }
  };

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
        "venue";

      showToastMsg(`Allocation updated successfully! Venue changed to ${newVenueName}.`);
      setShowEditModal(false);
      await loadAllocations();
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

  return (
    <AdminLayout>
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-800/80 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-blue-200">
                Administration
              </span>
              <span className="text-blue-300 text-sm">Academic Semester Venue Allocations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
              Academic Allocations & Timetable
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-xl">
              Review and approve recurring semester venue allocations, verify conflicts, and inspect departmental academic assignments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setConflictError(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-sm shadow-md hover:bg-blue-50 transition active:scale-95"
            >
              <Plus size={18} />
              New Semester Allocation
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, faculty, venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-700"
            >
              <option value="all">All Venues</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500 font-medium">Loading academic allocations...</p>
            </div>
          ) : allocations.length === 0 ? (
            <div className="py-20 text-center">
              <CalendarDays size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-700">No Academic Allocations Found</h3>
              <p className="text-xs text-slate-500 mt-1">No recurring semester allocations match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Subject & Code</th>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Class / Section</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Semester & Duration</th>
                    <th className="py-3 px-4">Weekly Schedule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((alloc) => {
                    const isPending = alloc.status === "PENDING";
                    const isApproved = alloc.status === "APPROVED";
                    const isRejected = alloc.status === "REJECTED";

                    return (
                      <tr key={alloc.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{alloc.subject_name}</div>
                          {alloc.subject_code && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {alloc.subject_code}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          <div>{alloc.faculty_name}</div>
                          <span className="text-[10px] text-slate-500">{alloc.faculty_email}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-semibold">
                          {alloc.year_of_study} - Sec {alloc.section}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{alloc.venue_name}</div>
                          <span className="text-[10px] text-slate-500">{alloc.venue_location}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium text-slate-800">
                            {alloc.academic_year} • {alloc.semester}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(alloc.start_date).toLocaleDateString()} to{" "}
                            {new Date(alloc.end_date).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(alloc.rules || []).map((r, i) => (
                              <span
                                key={i}
                                className="inline-block bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-200"
                              >
                                {r.day_of_week.slice(0, 3)} P{r.period_id}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-800"
                                : isPending
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : isRejected
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {alloc.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(alloc.id)}
                                  disabled={processingId === alloc.id}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReject(alloc)}
                                  disabled={processingId === alloc.id}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAllocation(alloc);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditAllocation(alloc.id)}
                              className="p-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 text-blue-600 transition"
                              title="Edit Allocation / Change Venue"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && allocations.length > 0 && (
            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setCurrentPage(p)}
                totalItems={pagination.total}
              />
            </div>
          )}
        </div>

        {/* MODAL: REJECT REASON */}
        {showRejectModal && selectedAllocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-900">
                Reject Academic Allocation Request
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Reject allocation for <strong>{selectedAllocation.subject_name}</strong> requested by{" "}
                <strong>{selectedAllocation.faculty_name}</strong>.
              </p>

              <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide justification (e.g. Venue reserved for institutional accreditation or schedule clash)."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VIEW DETAILS */}
        {showDetailModal && selectedAllocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Allocation Details</h3>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Subject:</span>
                    <span className="font-bold text-slate-800">{selectedAllocation.subject_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Faculty:</span>
                    <span className="font-bold text-slate-800">{selectedAllocation.faculty_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Venue:</span>
                    <span className="font-bold text-slate-800">{selectedAllocation.venue_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Class / Sec:</span>
                    <span className="font-bold text-slate-800">
                      {selectedAllocation.year_of_study} - Sec {selectedAllocation.section}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Semester Range:</span>
                    <span className="font-bold text-slate-800">
                      {selectedAllocation.academic_year} ({selectedAllocation.semester})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className="font-bold text-blue-900">{selectedAllocation.status}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Schedule Rules:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedAllocation.rules || []).map((r, i) => (
                      <span key={i} className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-xs font-semibold">
                        {r.day_of_week}: Period {r.period_id} ({String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)})
                      </span>
                    ))}
                  </div>
                </div>

                {selectedAllocation.purpose && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">Purpose:</h4>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {selectedAllocation.purpose}
                    </p>
                  </div>
                )}

                {selectedAllocation.rejection_reason && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                    <strong>Rejection Reason:</strong> {selectedAllocation.rejection_reason}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE ALLOCATION (ADMIN) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Create Semester Allocation (Admin)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {conflictError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle size={15} /> Scheduling Conflict Detected
                  </div>
                  <p>{conflictError.message}</p>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Faculty Member *
                    </label>
                    <select
                      required
                      value={createForm.facultyId}
                      onChange={(e) => setCreateForm({ ...createForm, facultyId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.department ? `(${f.department})` : ""}
                        </option>
                      ))}
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
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cloud Computing Lab"
                      value={createForm.subjectName}
                      onChange={(e) => setCreateForm({ ...createForm, subjectName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Class / Sec *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="III Year A"
                      value={`${createForm.yearOfStudy} ${createForm.section}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(" ");
                        setCreateForm({
                          ...createForm,
                          yearOfStudy: parts[0] || "III Year",
                          section: parts[1] || "A",
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
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
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Recurring Weekdays *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((wd) => {
                        const isSelected = createForm.selectedDays.includes(wd.index);
                        return (
                          <button
                            type="button"
                            key={wd.index}
                            onClick={() => {
                              const next = isSelected
                                ? createForm.selectedDays.filter((d) => d !== wd.index)
                                : [...createForm.selectedDays, wd.index].sort((a, b) => a - b);
                              setCreateForm({ ...createForm, selectedDays: next });
                            }}
                            className={`px-2.5 py-1 text-xs rounded-xl font-bold border transition ${
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

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {submitting ? "Allocating..." : "Create Allocation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT ALLOCATION (CHANGE VENUE) */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Academic Allocation / Change Venue
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {loadingEditData ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading allocation details...</div>
              ) : (
                <>
                  {conflictError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertTriangle size={15} /> Scheduling Conflict Detected
                      </div>
                      <p>{conflictError.message}</p>
                    </div>
                  )}

                  <form onSubmit={handleEditSubmit} className="space-y-3.5">
                    {/* Venue Selection */}
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                      <label className="block text-xs font-bold text-blue-950 mb-1">
                        Assigned Venue *
                      </label>
                      <select
                        required
                        value={editForm.venueId}
                        onChange={(e) => setEditForm({ ...editForm, venueId: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-blue-300 rounded-xl bg-white font-bold text-slate-800"
                      >
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-blue-700 mt-1">
                        Modifying the venue persists directly to the database and timetable.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Subject Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.subjectName}
                          onChange={(e) => setEditForm({ ...editForm, subjectName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
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
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Class / Sec *
                      </label>
                      <input
                        type="text"
                        required
                        value={`${editForm.yearOfStudy} ${editForm.section}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(" ");
                          setEditForm({
                            ...editForm,
                            yearOfStudy: parts[0] || "III Year",
                            section: parts[1] || "A",
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-2">
                          Recurring Weekdays *
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((wd) => {
                            const isSelected = editForm.selectedDays.includes(wd.index);
                            return (
                              <button
                                type="button"
                                key={wd.index}
                                onClick={() => {
                                  const next = isSelected
                                    ? editForm.selectedDays.filter((d) => d !== wd.index)
                                    : [...editForm.selectedDays, wd.index].sort((a, b) => a - b);
                                  setEditForm({ ...editForm, selectedDays: next });
                                }}
                                className={`px-2.5 py-1 text-xs rounded-xl font-bold border transition ${
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={editForm.startDate}
                          onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          required
                          value={editForm.endDate}
                          onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingAllocation}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                      >
                        {updatingAllocation ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAcademicAllocations;
