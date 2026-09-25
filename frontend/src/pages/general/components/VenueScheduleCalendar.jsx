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

  const isMultiDay = Boolean(setupForm?.isMultiDay);
  const startDate = setupForm?.startDate || "";
  const endDate = setupForm?.endDate || "";

  const handleDateClick = (dateStr) => {
    if (isMultiDay) {
      if (!startDate || (startDate && endDate)) {
        setSetupForm((prev) => ({ ...prev, startDate: dateStr, endDate: "" }));
      } else {
        if (dateStr < startDate) {
          setSetupForm((prev) => ({ ...prev, startDate: dateStr, endDate: prev.startDate }));
        } else {
          setSetupForm((prev) => ({ ...prev, endDate: dateStr }));
        }
      }
    } else {
      setSetupForm((prev) => ({ ...prev, startDate: dateStr, endDate: "" }));
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-sm h-full flex flex-col justify-between space-y-4">
      {/* Header: < Month / Year > */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {monthName} / {currentYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Days & Grid Container - Expanded tiles balancing the form height */}
      <div className="flex-1 flex flex-col justify-center space-y-2 py-1">
        {/* Day of Week Headers (Mon - Sun) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-1 uppercase tracking-wider">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid of Expanded Tiles with Monday-First Week Alignment */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs">
          {/* Empty slots before the 1st day of the month (Monday-first) */}
          {Array.from({ length: (firstDayOfWeek + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[50px] sm:min-h-[56px] rounded-xl sm:rounded-2xl border border-transparent" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const dayStatus = getVenueDayStatus(dateStr);
            const isClosed = dayStatus.status === "closed";
            const isMaintenance = dayStatus.status === "maintenance" || dayStatus.status === "damaged";
            const isBooked = dayStatus.status === "booked" || dayStatus.status === "fully" || dayStatus.status === "partial";

            // Multi-day and single selection states
            const isSelected = !isMultiDay && startDate === dateStr;
            const isRangeStart = isMultiDay && startDate === dateStr;
            const isRangeEnd = isMultiDay && endDate === dateStr;
            const isInRange = isMultiDay && startDate && endDate && dateStr >= startDate && dateStr <= endDate;
            const isPrimaryActive = isSelected || isRangeStart || isRangeEnd;

            // Compute background and border theme
            let tileClasses = "bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30";
            if (isPrimaryActive) {
              tileClasses = "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30";
            } else if (isInRange) {
              tileClasses = "bg-blue-100/90 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 font-bold";
            } else if (isToday) {
              tileClasses = "border-2 border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold";
            } else if (isClosed) {
              tileClasses = "bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50";
            } else if (isMaintenance) {
              tileClasses = "bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50";
            } else if (isBooked) {
              tileClasses = "bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                className={`min-h-[50px] sm:min-h-[56px] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col items-center justify-between cursor-pointer select-none ${tileClasses}`}
                title={`${dateStr} - ${dayStatus.reason || dayStatus.status}`}
              >
                {/* Day number */}
                <span className={`text-xs sm:text-sm font-bold ${
                  isPrimaryActive 
                    ? "text-white" 
                    : isInRange 
                    ? "text-blue-950 dark:text-blue-200" 
                    : isToday 
                    ? "text-blue-700 dark:text-blue-400" 
                    : "text-slate-900 dark:text-slate-100"
                }`}>
                  {day}
                </span>

                {/* Status Indicator Pill or Dot matching legend */}
                <div className="flex items-center justify-center h-3.5 w-full">
                  {isPrimaryActive ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-100">
                      {isRangeStart && endDate ? "Start" : isRangeEnd ? "End" : "Selected"}
                    </span>
                  ) : isInRange ? (
                    <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase">Range</span>
                  ) : isClosed ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-600 ring-2 ring-rose-200 dark:ring-rose-900 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-bold text-rose-700 dark:text-rose-300">Closed</span>
                    </span>
                  ) : isMaintenance ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-bold text-amber-700 dark:text-amber-300">Maint</span>
                    </span>
                  ) : isBooked ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-bold text-blue-700 dark:text-blue-300">Booked</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-emerald-200 dark:ring-emerald-900 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">Available</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Quick Legend matching tile indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-4 border-t border-slate-100/90 dark:border-slate-800 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900 inline-block"></span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Available</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 inline-block"></span>
          <span className="text-blue-700 dark:text-blue-400 font-semibold">Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-200 dark:ring-rose-900 inline-block"></span>
          <span className="text-rose-700 dark:text-rose-400 font-semibold">Closed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 inline-block"></span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">Maintenance</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span>Selected</span>
        </span>
      </div>
    </div>
  );
}

