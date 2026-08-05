import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
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
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[28px] p-6 shadow-md flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>📅 Schedule Overview</span>
        </h3>
        <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Month & Year Navigation Row — Apple iOS Styling */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
        >
          <ChevronLeft size={16} className="stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={calMonth !== undefined ? calMonth : 7}
              onChange={(e) => setCalMonth && setCalMonth(Number(e.target.value))}
              className="appearance-none bg-slate-100/90 hover:bg-slate-200/80 text-slate-900 font-extrabold text-xs py-2 pl-3.5 pr-7 rounded-full border border-slate-200/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={calYear !== undefined ? calYear : 2026}
              onChange={(e) => setCalYear && setCalYear(Number(e.target.value))}
              className="appearance-none bg-slate-100/90 hover:bg-slate-200/80 text-slate-900 font-extrabold text-xs py-2 pl-3.5 pr-7 rounded-full border border-slate-200/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
          </div>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
        >
          <ChevronRight size={16} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Days Header Row */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase py-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-xs font-medium">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const details = getDayDetails ? getDayDetails(day) : { status: "avail" };
          const isFullySelected = day === todayDay && (calMonth === todayMonth) && (calYear === todayYear);
          const hasEvent = details?.status === "fully" || details?.status === "partial" || [1, 2, 10, 11, 14, 16, 25, 29].includes(day);

          let dateNumberStyle = "text-slate-700 font-bold";
          let containerStyle = "w-9 h-9 rounded-full flex flex-col items-center justify-center mx-auto hover:bg-slate-100 transition-all cursor-pointer active:scale-95";

          if (isFullySelected) {
            containerStyle = "w-9 h-9 rounded-full bg-blue-600 text-white font-black flex flex-col items-center justify-center mx-auto shadow-md ring-4 ring-blue-100 scale-105 cursor-pointer";
            dateNumberStyle = "text-white font-black";
          } else if (hasEvent) {
            containerStyle = "w-9 h-9 rounded-full bg-blue-50 text-blue-800 font-extrabold flex flex-col items-center justify-center mx-auto cursor-pointer border border-blue-200/60 hover:bg-blue-100 transition-all active:scale-95";
            dateNumberStyle = "text-blue-800 font-extrabold";
          }

          return (
            <Tooltip key={day} content={details?.tooltip || `${MONTH_NAMES[calMonth || 7]} ${day}, ${calYear || 2026}`}>
              <div className={containerStyle}>
                <span className={dateNumberStyle}>{day}</span>
                {hasEvent && !isFullySelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-0.5" />
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Event / Reserved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" /> Selected
        </span>
      </div>
    </div>
  );
}

