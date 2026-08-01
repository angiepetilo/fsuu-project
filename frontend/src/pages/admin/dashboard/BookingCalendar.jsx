import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export default function BookingCalendar({
  monthLabel,
  prevMonth,
  nextMonth,
  firstDayOfWeek,
  daysInMonth,
  getDayDetails,
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <CalendarIcon size={16} className="text-blue-600" />
          {monthLabel} Event Calendar
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs font-bold">
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8 rounded-lg bg-slate-50/50 opacity-40" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const details = getDayDetails(dayNum);

          let colorClass = "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
          if (details.status === "fully") {
            colorClass = "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100";
          } else if (details.status === "partial") {
            colorClass = "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
          }

          return (
            <Tooltip key={dayNum} content={details.tooltip}>
              <div
                className={`h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${colorClass}`}
              >
                {dayNum}
              </div>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex items-center justify-around pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Partial Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Fully Reserved
        </span>
      </div>
    </div>
  );
}
