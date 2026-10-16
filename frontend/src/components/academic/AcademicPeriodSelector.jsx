import React from "react";
import { Check, Clock, CalendarDays, AlertCircle, Sparkles } from "lucide-react";

export const INSTITUTIONAL_PERIODS = [
  { period: 1, start: "09:15", end: "10:05", label: "Period 1", time: "09:15 – 10:05" },
  { period: 2, start: "10:05", end: "10:50", label: "Period 2", time: "10:05 – 10:50" },
  { period: 3, start: "11:10", end: "12:00", label: "Period 3", time: "11:10 – 12:00" },
  { period: 4, start: "12:00", end: "12:50", label: "Period 4", time: "12:00 – 12:50" },
  { period: 5, start: "13:50", end: "14:40", label: "Period 5", time: "13:50 – 14:40" },
  { period: 6, start: "14:40", end: "15:30", label: "Period 6", time: "14:40 – 15:30" },
  { period: 7, start: "15:45", end: "16:30", label: "Period 7", time: "15:45 – 16:30" },
  { period: 8, start: "16:30", end: "17:15", label: "Period 8", time: "16:30 – 17:15" },
];

export const ALL_WEEKDAYS = [
  { name: "Monday", short: "Mon", index: 1 },
  { name: "Tuesday", short: "Tue", index: 2 },
  { name: "Wednesday", short: "Wed", index: 3 },
  { name: "Thursday", short: "Thu", index: 4 },
  { name: "Friday", short: "Fri", index: 5 },
  { name: "Saturday", short: "Sat", index: 6 },
];

const AcademicPeriodSelector = ({
  allocationMode = "same", // 'same' | 'different'
  onModeChange,
  selectedDays = [1, 2, 3, 4, 5],
  samePeriods = [2, 3, 4],
  onToggleSamePeriod,
  onSetSamePeriods,
  dayPeriods = {},
  onToggleDayPeriod,
  onSetDayPeriods,
}) => {
  // Helpers for batch selection
  const handleSelectMorningSame = () => {
    onSetSamePeriods?.([1, 2, 3, 4]);
  };

  const handleSelectAfternoonSame = () => {
    onSetSamePeriods?.([5, 6, 7, 8]);
  };

  const handleClearAllSame = () => {
    onSetSamePeriods?.([]);
  };

  const handleSetDayBatch = (dayIdx, periods) => {
    onSetDayPeriods?.(dayIdx, periods);
  };

  // Calculate total weekly periods
  const totalWeeklyPeriods = React.useMemo(() => {
    if (allocationMode === "same") {
      return selectedDays.length * samePeriods.length;
    }
    return selectedDays.reduce((acc, dIdx) => acc + (dayPeriods[dIdx]?.length || 0), 0);
  }, [allocationMode, selectedDays, samePeriods, dayPeriods]);

  return (
    <div className="space-y-4">
      {/* Allocation Mode Header / Toggle */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => onModeChange?.("same")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            allocationMode === "same"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles size={14} className={allocationMode === "same" ? "text-blue-600" : "text-slate-400"} />
          Mode A — Same Periods Every Day
        </button>
        <button
          type="button"
          onClick={() => onModeChange?.("different")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            allocationMode === "different"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarDays size={14} className={allocationMode === "different" ? "text-blue-600" : "text-slate-400"} />
          Mode B — Different Periods Per Day
        </button>
      </div>

      {/* Mode A: Same periods for every selected day */}
      {allocationMode === "same" && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Select Academic Periods</span>
              <span className="text-[11px] text-slate-500">
                These selected periods apply to every selected weekday ({selectedDays.length} days).
              </span>
            </div>
            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={handleSelectMorningSame}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                P1–P4 (Morning)
              </button>
              <button
                type="button"
                onClick={handleSelectAfternoonSame}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                P5–P8 (Afternoon)
              </button>
              <button
                type="button"
                onClick={handleClearAllSame}
                className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          {/* 8 Periods Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INSTITUTIONAL_PERIODS.map((p) => {
              const isSelected = samePeriods.includes(p.period);
              return (
                <button
                  type="button"
                  key={p.period}
                  onClick={() => onToggleSamePeriod?.(p.period)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-xs">P{p.period}</span>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                    {p.time}
                  </span>
                </button>
              );
            })}
          </div>

          {samePeriods.length === 0 && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>Please select at least one period above.</span>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Different periods per day */}
      {allocationMode === "different" && (
        <div className="space-y-3">
          <div className="text-xs text-slate-600 font-medium">
            Select the required period combination for each active weekday below:
          </div>

          {selectedDays.map((dIdx) => {
            const dayObj = ALL_WEEKDAYS.find((w) => w.index === dIdx);
            const currentDayPeriods = dayPeriods[dIdx] || [];
            const hasPeriods = currentDayPeriods.length > 0;

            return (
              <div
                key={dIdx}
                className={`border rounded-2xl p-3.5 transition ${
                  hasPeriods ? "bg-white border-slate-200" : "bg-amber-50/50 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">
                      {dayObj?.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        hasPeriods
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {currentDayPeriods.length} {currentDayPeriods.length === 1 ? "period" : "periods"} selected
                    </span>
                  </div>

                  {/* Quick buttons per day */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSetDayBatch(dIdx, [1, 2, 3, 4])}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      P1–P4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDayBatch(dIdx, [5, 6, 7, 8])}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      P5–P8
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDayBatch(dIdx, [])}
                      className="px-1.5 py-0.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* 8 Period Chips */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {INSTITUTIONAL_PERIODS.map((p) => {
                    const isSelected = currentDayPeriods.includes(p.period);
                    return (
                      <button
                        type="button"
                        key={p.period}
                        onClick={() => onToggleDayPeriod?.(dIdx, p.period)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/40 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-xs">P{p.period}</span>
                        <span
                          className={`text-[9px] truncate w-full ${
                            isSelected ? "text-blue-100 font-medium" : "text-slate-400"
                          }`}
                        >
                          {p.start}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!hasPeriods && (
                  <p className="text-[11px] text-amber-700 mt-2 font-medium">
                    ⚠️ Please select at least one period for {dayObj?.name}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Live Timetable Preview & Summary */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Clock size={14} className="text-blue-600" />
            <span>Weekly Schedule Preview</span>
          </div>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
            {totalWeeklyPeriods} periods / week
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {selectedDays.map((dIdx) => {
            const dayObj = ALL_WEEKDAYS.find((w) => w.index === dIdx);
            const periodsForDay =
              allocationMode === "same"
                ? samePeriods
                : dayPeriods[dIdx] || [];

            return (
              <div
                key={dIdx}
                className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
              >
                <span className="font-extrabold text-slate-900 w-24 shrink-0 uppercase tracking-wide text-[11px]">
                  {dayObj?.name}
                </span>

                {periodsForDay.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {periodsForDay.map((pId) => {
                      const pObj = INSTITUTIONAL_PERIODS.find((p) => p.period === pId);
                      return (
                        <span
                          key={pId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-[11px]"
                        >
                          P{pId} <span className="text-[10px] text-blue-600">({pObj?.start}–{pObj?.end})</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-rose-600 italic text-[11px]">No periods selected</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AcademicPeriodSelector;
