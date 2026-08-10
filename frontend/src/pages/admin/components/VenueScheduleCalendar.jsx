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
  return (
    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
            <button
              type="button"
              onClick={prevMonth}
              className="w-6 h-6 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-6 h-6 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Status Indicators Legend */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10.5px] font-mono font-bold">
          <span className="text-emerald-700">● Avail</span>
          <span className="text-amber-700">● Partial</span>
          <span className="text-rose-700">● Full</span>
          <span className="text-slate-800">● Maint</span>
        </div>
      </div>

      {/* Small Compact Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-[10px] font-mono font-bold text-slate-400 uppercase py-1">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14 bg-slate-50/40 rounded-xl border border-slate-100 opacity-40"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const info = getVenueDayStatus(dateStr);

          // Status colors & Tinted Backgrounds
          let bgClass = "bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/50";
          let statusTextColor = "text-emerald-700";
          let statusText = "Available";

          if (info?.status === "partial") {
            bgClass = "bg-amber-50/60 border-amber-200 text-amber-950 hover:bg-amber-100/50";
            statusTextColor = "text-amber-700";
            statusText = "Partial";
          } else if (info?.status === "fully") {
            bgClass = "bg-rose-50/60 border-rose-200 text-rose-950 hover:bg-rose-100/50";
            statusTextColor = "text-rose-700";
            statusText = "Full";
          } else if (info?.status === "maintenance" || info?.status === "closed") {
            bgClass = "bg-slate-100/80 border-slate-300 text-slate-900 hover:bg-slate-200/60";
            statusTextColor = "text-slate-800";
            statusText = info?.status === "closed" ? "Closed" : "Maint";
          }

          const isSelected = setupForm.startDate === dateStr;

          return (
            <div
              key={dayNum}
              onClick={() => setSetupForm({ ...setupForm, startDate: dateStr })}
              onMouseEnter={() => info && setHoveredDayData({ dayNum, dateStr, info })}
              onMouseLeave={() => setHoveredDayData(null)}
              className={`relative h-14 p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${bgClass} ${
                isSelected
                  ? "ring-2 ring-slate-900 shadow-2xs font-extrabold"
                  : "shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900">{dayNum}</span>
                <span className={`text-[9px] font-mono font-bold ${statusTextColor}`}>
                  ● {statusText}
                </span>
              </div>

              {info?.bookedSlots?.length > 0 && (
                <span className="text-[9px] font-mono text-slate-600 truncate">
                  {info.bookedSlots.length} booked
                </span>
              )}

              {/* Hover Tooltip Callout */}
              {hoveredDayData?.dateStr === dateStr && info && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 bg-white text-slate-900 rounded-xl p-3 shadow-xl z-50 animate-in zoom-in-95 pointer-events-none border border-slate-300 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                    <span className="font-mono font-bold text-[11px] text-slate-900">
                      {monthNames[currentMonth]} {dayNum}, {currentYear}
                    </span>
                    <span className={`text-[9.5px] font-mono font-bold uppercase ${statusTextColor}`}>
                      {statusText}
                    </span>
                  </div>
                  {info.bookedSlots && info.bookedSlots.length > 0 ? (
                    <div className="space-y-1 text-[10px]">
                      {info.bookedSlots.map((slot, sIdx) => (
                        <div key={sIdx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <p className="font-mono font-bold text-slate-800">{slot.time}</p>
                          <p className="text-slate-600">{slot.requestor} ({slot.dept})</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">{info.reason || "All time slots available"}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
