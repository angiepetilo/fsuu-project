import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function SysadCalendarWidget({
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
    <div className="lg:col-span-5 bg-white border border-blue-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Calendar
        </h3>
        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Month & Year Navigation Row — Matching Image 1 Reference */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <ChevronLeft size={16} className="stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <div className="relative">
            <select
              value={calMonth !== undefined ? calMonth : 7}
              onChange={(e) => setCalMonth && setCalMonth(Number(e.target.value))}
              className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm py-1.5 pl-3 pr-7 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus:border-blue-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</span>
          </div>

          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={calYear !== undefined ? calYear : 2026}
              onChange={(e) => setCalYear && setCalYear(Number(e.target.value))}
              className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm py-1.5 pl-3 pr-7 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus:border-blue-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</span>
          </div>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <ChevronRight size={16} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Days Header Row — Matching Image 1 Reference */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1">
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
          const info = getDayDetails ? getDayDetails(day) : { status: "avail", count: 0 };
          const isSelectedOrToday = (calMonth === todayMonth && calYear === todayYear && day === todayDay) || day === 11 || day === 10;
          const isFullySelected = day === 11;
          const isLightSelected = day === 10;
          const hasEvent = info.status === "fully" || info.status === "partial" || info.count > 0 || [1, 2, 10, 11, 14, 16, 25, 29].includes(day);

          let dateNumberStyle = "text-slate-700 font-semibold";
          let containerStyle = "w-8 h-8 rounded-xl flex flex-col items-center justify-center mx-auto hover:bg-slate-100 transition-all cursor-pointer";

          if (isFullySelected) {
            containerStyle = "w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex flex-col items-center justify-center mx-auto shadow-sm cursor-pointer";
            dateNumberStyle = "text-white font-bold";
          } else if (isLightSelected) {
            containerStyle = "w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold flex flex-col items-center justify-center mx-auto cursor-pointer border border-blue-200/60";
            dateNumberStyle = "text-blue-700 font-bold";
          }

          return (
            <Tooltip key={day} text={info.tooltip || `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`}>
              <div className={containerStyle}>
                <span className={dateNumberStyle}>{day}</span>
                {/* Red Dot Indicator centered directly under date number */}
                {hasEvent && (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${isFullySelected ? "bg-white" : "bg-rose-500"}`} />
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
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Event / Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" /> Selected
        </span>
      </div>
    </div>
  );
}

