import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export default function SysadCalendarWidget({
  monthLabel,
  prevMonth,
  nextMonth,
  firstDayOfWeek,
  daysInMonth,
  getDayDetails,
}) {
  return (
    <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs space-y-3 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <CalendarIcon size={15} className="text-blue-600" />
          Venue Availability Calendar
        </h3>
        <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
          {monthLabel}
        </span>
      </div>

      {/* Month Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <button
          onClick={prevMonth}
          className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-bold text-slate-800">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Calendar Grid - Compact Cells */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-0.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const info = getDayDetails(day);

          let badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
          if (info.status === "partial") badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
          if (info.status === "fully") badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";

          return (
            <Tooltip key={day} text={info.tooltip}>
              <div
                className={`h-7 w-full flex items-center justify-center gap-1 rounded-md border text-[10.5px] font-bold transition-all cursor-help ${badgeStyle}`}
              >
                <span>{day}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  info.status === "fully" ? "bg-rose-500" : info.status === "partial" ? "bg-amber-500" : "bg-emerald-500"
                }`} />
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend Badges */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] font-bold">
        <span className="flex items-center gap-1 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1 text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
        </span>
        <span className="flex items-center gap-1 text-rose-700">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Fully Booked
        </span>
      </div>

    </div>
  );
}
