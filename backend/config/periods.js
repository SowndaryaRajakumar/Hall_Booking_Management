// Centralized 8-period configuration (single source of truth)
// Times are stored in 24-hour HH:mm format to match the bookings table
// time_from / time_to columns (stored as TIME "09:15:00").
//
// Institution's official period timings:
// 1- 9.15 - 10.05
// 2- 10.05 - 10.50
// 3- 11.10 - 12.00
// 4- 12.00 - 12.50
// 5- 1.50 - 2.40
// 6- 2.40 - 3.30
// 7- 3.45 - 4.30
// 8- 4.30 - 5.15

const PERIODS = [
  { period: 1, start: "09:15", end: "10:05" },
  { period: 2, start: "10:05", end: "10:50" },
  { period: 3, start: "11:10", end: "12:00" },
  { period: 4, start: "12:00", end: "12:50" },
  { period: 5, start: "13:50", end: "14:40" },
  { period: 6, start: "14:40", end: "15:30" },
  { period: 7, start: "15:45", end: "16:30" },
  { period: 8, start: "16:30", end: "17:15" },
];

// Helper to format a period as "H:MM AM/PM" for display
const formatTime = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const getPeriods = () => PERIODS.map((p) => ({
  ...p,
  startDisplay: formatTime(p.start),
  endDisplay: formatTime(p.end),
}));

module.exports = { PERIODS, getPeriods, formatTime };
