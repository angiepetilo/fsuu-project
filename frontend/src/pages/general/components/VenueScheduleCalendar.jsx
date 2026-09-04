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
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = new Date().toISOString().substring(0, 10);

  const monthName = monthNames && monthNames[currentMonth] 
    ? monthNames[currentMonth] 
    : new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-slate-200/90 shadow-sm space-y-4">
      {/* Header: < Month / Year > matching book-venue */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-base font-extrabold text-slate-900 tracking-tight">
          {monthName} / {currentYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day of Week Headers (Mon - Sun) */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-slate-400 py-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid with Monday-First Week Alignment */}
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
        {/* Empty slots before the 1st day of the month (Monday-first) */}
        {Array.from({ length: (firstDayOfWeek + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
          const isSelected = setupForm.startDate === dateStr;
          const isToday = dateStr === todayStr;
          const dayStatus = getVenueDayStatus(dateStr);
          const isMaintenanceOrClosed = ["maintenance", "closed", "damaged"].includes(dayStatus.status);
          const isFully = dayStatus.status === "fully";
          const isPartial = dayStatus.status === "partial";

          return (
            <div
              key={day}
              className="relative h-9 flex items-center justify-center"
            >
              <button
                type="button"
                onClick={() => setSetupForm((prev) => ({ ...prev, startDate: dateStr }))}
                className={`w-9 h-9 rounded-full text-xs font-extrabold flex items-center justify-center mx-auto transition-all relative z-10 ${
                  isSelected
                    ? "bg-blue-600 text-white font-black shadow-sm scale-105 cursor-pointer"
                    : isToday
                    ? "border-2 border-blue-600 text-blue-700 font-extrabold bg-blue-50/40 cursor-pointer"
                    : isMaintenanceOrClosed
                    ? "text-slate-800 bg-slate-100 border border-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                    : isFully
                    ? "text-rose-700 bg-rose-50 border border-rose-200 font-bold hover:bg-rose-100 cursor-pointer"
                    : isPartial
                    ? "text-amber-900 font-bold hover:bg-amber-100 cursor-pointer"
                    : "text-slate-800 font-bold hover:bg-slate-100 cursor-pointer"
                }`}
                title={`${dateStr} - ${dayStatus.reason || dayStatus.status}`}
              >
                <span>{day}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Calendar Quick Legend matching book-venue */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold text-slate-500 pt-3 border-t border-slate-100/60">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span>Selected</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-transparent inline-block"></span>
          <span>Partially Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-400 bg-transparent inline-block"></span>
          <span>Fully Booked</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-transparent inline-block"></span>
          <span>Maintenance / Closed</span>
        </span>
      </div>
    </div>
  );
}
