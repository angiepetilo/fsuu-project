import { ChevronLeft, ChevronRight } from "lucide-react";

export default function VenueScheduleCalendar({
  currentMonth,
  currentYear,
  monthNames,
  prevMonth,
  nextMonth,
  firstDayOfWeek,
  daysInMonth,
  getVenueDayStatus,
  setSetupForm,
  setupForm,
  hoveredDayData,
  setHoveredDayData,
}) {
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Calculate previous month dates to fill the first row
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(prevMonthDaysCount - i);
  }

  // Calculate next month days to complete the 6 rows (42 total cells)
  const totalRendered = prevMonthDays.length + daysInMonth;
  const nextMonthDaysCount = 42 - totalRendered <= 7 ? 42 - totalRendered : 35 - totalRendered;
  const nextMonthDays = [];
  for (let i = 1; i <= Math.max(0, nextMonthDaysCount); i++) {
    nextMonthDays.push(i);
  }

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      {/* Month & Nav Controls (Screenshot 2) */}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-900 text-2xl tracking-tight">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Days of Week Row: S M T W T F S (Screenshot 2) */}
      <div className="grid grid-cols-7 gap-y-4 text-center">
        {daysOfWeek.map((day, idx) => (
          <div key={`dow-${idx}`} className="text-sm font-extrabold text-slate-700">
            {day}
          </div>
        ))}

        {/* Previous Month Inactive Days */}
        {prevMonthDays.map((dayNum, i) => (
          <div
            key={`prev-${i}`}
            className="w-10 h-10 mx-auto flex items-center justify-center text-sm font-semibold text-slate-400 opacity-60"
          >
            {dayNum}
          </div>
        ))}

        {/* Current Month Active Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
          const isSelected = setupForm.startDate === dateStr;
          const isFirstDay = dayNum === 1;

          return (
            <div
              key={`curr-${dayNum}`}
              onClick={() => setSetupForm({ ...setupForm, startDate: dateStr })}
              className="w-10 h-10 mx-auto flex items-center justify-center cursor-pointer transition-all"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : isFirstDay
                    ? "bg-blue-100/80 text-blue-900 font-black"
                    : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {dayNum}
              </div>
            </div>
          );
        })}

        {/* Next Month Inactive Days */}
        {nextMonthDays.map((dayNum, i) => (
          <div
            key={`next-${i}`}
            className="w-10 h-10 mx-auto flex items-center justify-center text-sm font-semibold text-slate-400 opacity-60"
          >
            {dayNum}
          </div>
        ))}
      </div>
    </div>
  );
}
