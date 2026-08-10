import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function BookingCalendar({
  monthLabel,
  prevMonth,
  nextMonth,
  firstDayOfWeek,
  daysInMonth,
  getDayDetails,
  calMonth,
  setCalMonth,
  calYear,
  setCalYear,
}) {
  const currentToday = new Date();
  const todayDay = currentToday.getDate();
  const todayMonth = currentToday.getMonth();
  const todayYear = currentToday.getFullYear();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
          Schedule Overview
        </h3>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          All Venues
        </span>
      </div>

      {/* Month & Year Navigation Row */}
      <div className="flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
          title="Previous Month"
        >
          <ChevronLeft size={13} />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={calMonth !== undefined ? calMonth : 7}
              onChange={(e) => setCalMonth && setCalMonth(Number(e.target.value))}
              className="bg-white text-slate-900 font-extrabold text-[11px] py-1 pl-2 pr-5 rounded-lg border border-slate-300 cursor-pointer focus:outline-none"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={calYear !== undefined ? calYear : 2026}
              onChange={(e) => setCalYear && setCalYear(Number(e.target.value))}
              className="bg-white text-slate-900 font-extrabold text-[11px] py-1 pl-2 pr-5 rounded-lg border border-slate-300 cursor-pointer focus:outline-none"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
          title="Next Month"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Days Header Row */}
      <div className="grid grid-cols-7 gap-1 text-center text-[9.5px] font-mono font-bold text-slate-400 uppercase py-0.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center text-[11px] font-semibold">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const details = getDayDetails ? getDayDetails(day) : { status: "avail" };
          const isFullySelected = day === todayDay && (calMonth === todayMonth) && (calYear === todayYear);
          const hasEvent = details?.status === "fully" || details?.status === "partial" || Boolean(details?.hasEvent);

          let dateNumberStyle = "text-slate-700 font-bold";
          let containerStyle = "w-7 h-7 rounded-lg flex flex-col items-center justify-center mx-auto hover:bg-slate-50 transition-all cursor-pointer border border-transparent";

          if (isFullySelected) {
            containerStyle = "w-7 h-7 rounded-lg border border-slate-900 bg-white text-slate-900 font-black flex flex-col items-center justify-center mx-auto shadow-2xs cursor-pointer";
            dateNumberStyle = "text-slate-900 font-black";
          } else if (hasEvent) {
            containerStyle = "w-7 h-7 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold flex flex-col items-center justify-center mx-auto cursor-pointer hover:bg-slate-50";
            dateNumberStyle = "text-slate-900 font-bold";
          }

          const boxInfo = {
            status: hasEvent ? (details.tooltip || "Reserved / Event Scheduled") : "All Venue Slots Open",
            badgeClass: hasEvent ? "text-rose-600 font-bold" : "text-emerald-600 font-bold",
            time: hasEvent ? "Venue In-Use" : "Available",
            details: `${MONTH_NAMES[calMonth ?? 7]} ${day}, ${calYear ?? 2026}`,
          };

          return (
            <Tooltip key={day} box={boxInfo}>
              <div className={containerStyle}>
                <span className={dateNumberStyle}>{day}</span>
                {hasEvent && !isFullySelected && (
                  <span className="w-1 h-1 rounded-full bg-slate-900 shrink-0" />
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] font-mono font-bold text-slate-500">
        <span className="text-emerald-600">● Open</span>
        <span className="text-rose-600">● Event</span>
        <span className="text-slate-900 font-black">● Today</span>
      </div>
    </div>
  );
}
