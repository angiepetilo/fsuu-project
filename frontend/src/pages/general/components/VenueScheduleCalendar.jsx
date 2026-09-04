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
    <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-slate-200/90 shadow-sm h-full flex flex-col justify-between space-y-4">
      {/* Header: < Month / Year > */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-base font-black text-slate-900 tracking-tight">
          {monthName} / {currentYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Days & Grid Container - Expanded tiles balancing the form height */}
      <div className="flex-1 flex flex-col justify-center space-y-2 py-1">
        {/* Day of Week Headers (Mon - Sun) with WCAG compliant high contrast */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-black text-slate-700 py-1 uppercase tracking-wider">
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
            const isMaintenanceOrClosed = ["maintenance", "closed", "damaged"].includes(dayStatus.status);
            const isFully = dayStatus.status === "fully";
            const isPartial = dayStatus.status === "partial";

            // Multi-day and single selection states
            const isSelected = !isMultiDay && startDate === dateStr;
            const isRangeStart = isMultiDay && startDate === dateStr;
            const isRangeEnd = isMultiDay && endDate === dateStr;
            const isInRange = isMultiDay && startDate && endDate && dateStr >= startDate && dateStr <= endDate;
            const isPrimaryActive = isSelected || isRangeStart || isRangeEnd;

            // Compute background and border theme
            let tileClasses = "bg-slate-50/70 border-slate-200/80 text-slate-900 hover:border-blue-300 hover:bg-blue-50/40";
            if (isPrimaryActive) {
              tileClasses = "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30";
            } else if (isInRange) {
              tileClasses = "bg-blue-100/90 border-blue-300 text-blue-950 font-black";
            } else if (isToday) {
              tileClasses = "border-2 border-blue-600 bg-blue-50/60 text-blue-900 font-black";
            } else if (isFully) {
              tileClasses = "bg-rose-50/90 border-rose-300 text-rose-950 hover:bg-rose-100 hover:border-rose-400";
            } else if (isPartial) {
              tileClasses = "bg-amber-50/90 border-amber-300 text-amber-950 hover:bg-amber-100 hover:border-amber-400";
            } else if (isMaintenanceOrClosed) {
              tileClasses = "bg-slate-100/90 border-slate-300 text-slate-800 hover:bg-slate-200 hover:border-slate-400";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                className={`min-h-[50px] sm:min-h-[56px] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col items-center justify-between cursor-pointer select-none ${tileClasses}`}
                title={`${dateStr} - ${dayStatus.reason || dayStatus.status}`}
              >
                {/* Day number with high WCAG contrast */}
                <span className={`text-xs sm:text-sm font-black ${
                  isPrimaryActive 
                    ? "text-white" 
                    : isInRange 
                    ? "text-blue-950" 
                    : isToday 
                    ? "text-blue-700" 
                    : "text-slate-900"
                }`}>
                  {day}
                </span>

                {/* Status Indicator Pill or Dot matching legend */}
                <div className="flex items-center justify-center h-3.5 w-full">
                  {isPrimaryActive ? (
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-100">
                      {isRangeStart && endDate ? "Start" : isRangeEnd ? "End" : "Selected"}
                    </span>
                  ) : isInRange ? (
                    <span className="text-[9px] font-black text-blue-700 uppercase">Range</span>
                  ) : isFully ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-black text-rose-700">Full</span>
                    </span>
                  ) : isPartial ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-black text-amber-800">Partial</span>
                    </span>
                  ) : isMaintenanceOrClosed ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500 ring-2 ring-slate-300 inline-block"></span>
                      <span className="hidden md:inline text-[9px] font-black text-slate-700">Closed</span>
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200/80 inline-block"></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Quick Legend matching tile indicators exactly with high contrast */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-extrabold text-slate-700 pt-4 border-t border-slate-100/90 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span>Selected</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 inline-block"></span>
          <span>Partially Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 inline-block"></span>
          <span>Fully Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-2 ring-slate-300 inline-block"></span>
          <span>Maintenance / Closed</span>
        </span>
      </div>
    </div>
  );
}

