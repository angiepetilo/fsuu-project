import { useMemo } from "react";
import { CalendarHeader } from "@/components/ui/custom-calendar-picker";

export default function VenueScheduleCalendar({
  currentMonth,
  currentYear,
  prevMonth,
  nextMonth,
  onSelectMonth,
  onSelectYear,
  firstDayOfWeek,
  daysInMonth,
  getVenueDayStatus,
  setSetupForm,
  setupForm,
  activeMode = "venue",
  venueOpen = "07:30",
  venueClose = "17:00",
  equipmentOpen = "07:30",
  equipmentClose = "17:00",
}) {
  const pad = (n) => String(n).padStart(2, "0");
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${pad(_now.getMonth() + 1)}-${pad(_now.getDate())}`;

  const isMultiDay = Boolean(setupForm?.isMultiDay);
  const startDate = setupForm?.startDate || "";
  const endDate = setupForm?.endDate || "";

  // Monthly health stats
  const monthStats = useMemo(() => {
    let available = 0;
    let booked = 0;
    let ongoing = 0;
    let restricted = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(d)}`;
      const st = getVenueDayStatus ? getVenueDayStatus(dateStr)?.status : "available";
      if (st === "closed" || st === "maintenance" || st === "damaged") {
        restricted++;
      } else if (st === "ongoing") {
        ongoing++;
      } else if (st === "booked" || st === "fully" || st === "partial") {
        booked++;
      } else {
        available++;
      }
    }
    return { available, booked, ongoing, restricted };
  }, [currentYear, currentMonth, daysInMonth, getVenueDayStatus]);

  const handleDateClick = (dateStr) => {
    const dayStatus = getVenueDayStatus(dateStr);
    const rawStatus = dayStatus?.status || "available";
    const statusMap = {
      closed: "Closed",
      maintenance: "Maintenance",
      damaged: "Maintenance",
      available: "Available",
      booked: "Available",
      fully: "Available",
      partial: "Available",
    };
    const mappedStatus = statusMap[rawStatus] || "Available";

    const defaultOpen = activeMode === "equipment" ? (equipmentOpen || "07:30") : (venueOpen || "07:30");
    const defaultClose = activeMode === "equipment" ? (equipmentClose || "17:00") : (venueClose || "17:00");
    const newStart = dayStatus?.override?.startTime || dayStatus?.override?.start_time || defaultOpen;
    const newEnd = dayStatus?.override?.endTime || dayStatus?.override?.end_time || defaultClose;
    const newReason = mappedStatus === "Available" ? "" : (dayStatus?.override?.notes || dayStatus?.override?.reason || "");

    if (isMultiDay) {
      if (!startDate) {
        setSetupForm((prev) => ({
          ...prev,
          startDate: dateStr,
          endDate: "",
          status: mappedStatus,
          startTime: newStart,
          endTime: newEnd,
          reason: newReason,
        }));
      } else if (!endDate || endDate === startDate) {
        if (dateStr < startDate) {
          setSetupForm((prev) => ({
            ...prev,
            startDate: dateStr,
            endDate: prev.startDate,
            status: mappedStatus,
            startTime: newStart,
            endTime: newEnd,
            reason: newReason,
          }));
        } else if (dateStr > startDate) {
          setSetupForm((prev) => ({
            ...prev,
            endDate: dateStr,
          }));
        } else {
          setSetupForm((prev) => ({
            ...prev,
            endDate: "",
          }));
        }
      } else {
        if (dateStr > endDate) {
          setSetupForm((prev) => ({
            ...prev,
            endDate: dateStr,
          }));
        } else if (dateStr < startDate) {
          setSetupForm((prev) => ({
            ...prev,
            startDate: dateStr,
            status: mappedStatus,
            startTime: newStart,
            endTime: newEnd,
            reason: newReason,
          }));
        } else if (dateStr > startDate && dateStr <= endDate) {
          setSetupForm((prev) => ({
            ...prev,
            endDate: dateStr === endDate ? "" : dateStr,
          }));
        } else if (dateStr === startDate) {
          setSetupForm((prev) => ({
            ...prev,
            endDate: "",
          }));
        }
      }
    } else {
      setSetupForm((prev) => ({
        ...prev,
        startDate: dateStr,
        endDate: "",
        status: mappedStatus,
        startTime: newStart,
        endTime: newEnd,
        reason: newReason,
      }));
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] p-5 sm:p-6 rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-xs h-full flex flex-col justify-between space-y-4">
      {/* Top Navigation Header */}
      <CalendarHeader
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onSelectMonth={onSelectMonth}
        onSelectYear={onSelectYear}
        theme="adaptive"
        className="mb-0"
      />

      {/* Sleek Monthly Summary & Quick Today Action */}
      <div className="flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/60 px-3.5 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-800/70 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-semibold text-[11px] sm:text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{monthStats.available} Available</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>
              {monthStats.booked} {activeMode === "equipment" ? "Borrowed" : "Booked"}
            </span>
          </span>
          {monthStats.ongoing > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>{monthStats.ongoing} On-Going</span>
              </span>
            </>
          )}
          {monthStats.restricted > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>{monthStats.restricted} Restricted</span>
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            const now = new Date();
            if (onSelectMonth) onSelectMonth(now.getMonth());
            if (onSelectYear) onSelectYear(now.getFullYear());
            handleDateClick(todayStr);
          }}
          className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 flex flex-col justify-center space-y-1.5 py-1">
        {/* Day of Week Headers (Mon - Sun) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1.5 uppercase tracking-wider">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Simplified Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs">
          {/* Trailing days from previous month — clean & borderless */}
          {(() => {
            const firstDayMonday = (firstDayOfWeek + 6) % 7;
            const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
            const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

            return Array.from({ length: firstDayMonday }).map((_, i) => {
              const prevDay = daysInPrevMonth - firstDayMonday + 1 + i;
              const prevDateStr = `${prevYear}-${pad(prevMonthIdx + 1)}-${pad(prevDay)}`;
              return (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => {
                    if (onSelectMonth) onSelectMonth(prevMonthIdx);
                    if (currentMonth === 0 && onSelectYear) onSelectYear(prevYear);
                    handleDateClick(prevDateStr);
                  }}
                  className="min-h-[54px] sm:min-h-[60px] p-1.5 rounded-2xl border border-transparent text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col items-center justify-center cursor-pointer select-none"
                  title={`Go to ${prevDateStr}`}
                >
                  <span className="text-xs sm:text-sm font-medium">{prevDay}</span>
                </button>
              );
            });
          })()}

          {/* Active Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const dayStatus = getVenueDayStatus(dateStr);
            const isClosed = dayStatus.status === "closed";
            const isMaintenance = dayStatus.status === "maintenance" || dayStatus.status === "damaged";
            const isOngoing = dayStatus.status === "ongoing";
            const isBooked = dayStatus.status === "booked" || dayStatus.status === "fully" || dayStatus.status === "partial";
            const hasSpecialStatus = isClosed || isMaintenance || isOngoing || isBooked;

            const activeCount = (dayStatus.bookings?.length || dayStatus.borrows?.length || 0);

            // Multi-day and single selection states
            const isSelected = !isMultiDay && startDate === dateStr;
            const isRangeStart = isMultiDay && startDate === dateStr;
            const isRangeEnd = isMultiDay && endDate === dateStr;
            const isInRange = isMultiDay && startDate && endDate && dateStr >= startDate && dateStr <= endDate;
            const isPrimaryActive = isSelected || isRangeStart || isRangeEnd;

            // Surface styling: Available is clean & minimal; statuses use soft tinted surfaces
            let tileClasses =
              "bg-white dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/60";

            if (isClosed) {
              tileClasses =
                "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/80 text-rose-950 dark:text-rose-200 hover:bg-rose-100/70";
            } else if (isMaintenance) {
              tileClasses =
                "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 hover:bg-amber-100/70";
            } else if (isOngoing) {
              tileClasses =
                "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/90 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100/70";
            } else if (isBooked) {
              tileClasses =
                "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-800/80 text-blue-950 dark:text-blue-200 hover:bg-blue-100/70";
            }

            // Selection styling: solid blue for Selected, soft blue for multi-day Range
            if (isPrimaryActive) {
              tileClasses =
                "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30 z-10";
            } else if (isInRange) {
              tileClasses =
                "bg-blue-100/90 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 font-bold";
            } else if (isToday && !hasSpecialStatus) {
              tileClasses =
                "bg-blue-50/40 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                className={`min-h-[54px] sm:min-h-[60px] p-1.5 rounded-2xl border transition-all flex flex-col items-center justify-between cursor-pointer select-none relative ${tileClasses}`}
                title={`${dateStr} — ${dayStatus.reason || dayStatus.status}`}
              >
                {/* Top Row: Day Number */}
                <div className="flex items-center justify-center w-full mt-0.5">
                  <span
                    className={`inline-flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                      isPrimaryActive
                        ? "text-white"
                        : isInRange
                        ? "text-blue-950 dark:text-blue-200"
                        : isToday
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Bottom Row: Only show badges for Exceptions, Multi-Day Range, or Selected state */}
                <div className="flex items-center justify-center h-4 w-full">
                  {isPrimaryActive ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                      {isRangeStart && endDate ? "Start" : isRangeEnd ? "End" : "Selected"}
                    </span>
                  ) : isInRange ? (
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                      Range
                    </span>
                  ) : isClosed ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100/90 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      <span className="hidden md:inline">Closed</span>
                    </span>
                  ) : isMaintenance ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="hidden md:inline">Maint</span>
                    </span>
                  ) : isOngoing ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-100/90 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      <span className="hidden md:inline">On-Going</span>
                    </span>
                  ) : isBooked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100/90 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      <span className="hidden md:inline">
                        {activeCount > 1
                          ? `${activeCount} ${activeMode === "equipment" ? "Borrows" : "Booked"}`
                          : activeMode === "equipment"
                          ? "Borrowed"
                          : "Booked"}
                      </span>
                    </span>
                  ) : isToday ? (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      Today
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}

          {/* Leading days from next month — clean & borderless */}
          {(() => {
            const firstDayMonday = (firstDayOfWeek + 6) % 7;
            const totalSlots = firstDayMonday + daysInMonth <= 35 ? 35 : 42;
            const remaining = totalSlots - (firstDayMonday + daysInMonth);
            const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

            return Array.from({ length: remaining }).map((_, i) => {
              const nextDay = i + 1;
              const nextDateStr = `${nextYear}-${pad(nextMonthIdx + 1)}-${pad(nextDay)}`;
              return (
                <button
                  key={`next-${i}`}
                  type="button"
                  onClick={() => {
                    if (onSelectMonth) onSelectMonth(nextMonthIdx);
                    if (currentMonth === 11 && onSelectYear) onSelectYear(nextYear);
                    handleDateClick(nextDateStr);
                  }}
                  className="min-h-[54px] sm:min-h-[60px] p-1.5 rounded-2xl border border-transparent text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col items-center justify-center cursor-pointer select-none"
                  title={`Go to ${nextDateStr}`}
                >
                  <span className="text-xs sm:text-sm font-medium">{nextDay}</span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Simplified Bottom Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 inline-block"></span>
          <span>Available</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/70 inline-block"></span>
          <span className="text-blue-700 dark:text-blue-400">
            {activeMode === "equipment" ? "Borrowed" : "Booked"}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900/70 inline-block"></span>
          <span className="text-indigo-700 dark:text-indigo-400">On-Going</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-900/70 inline-block"></span>
          <span className="text-amber-700 dark:text-amber-400">Maintenance</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600 ring-2 ring-rose-100 dark:ring-rose-900/70 inline-block"></span>
          <span className="text-rose-700 dark:text-rose-400">Closed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span className="text-slate-700 dark:text-slate-200">Selected</span>
        </span>
      </div>
    </div>
  );
}
