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
    <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-200/90 p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1 border border-slate-200/80 rounded-full p-1 bg-slate-100/80">
            <button onClick={prevMonth} className="w-7 h-7 rounded-full bg-white hover:bg-slate-200/60 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs active:scale-95">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextMonth} className="w-7 h-7 rounded-full bg-white hover:bg-slate-200/60 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs active:scale-95">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Color Coding Badges */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-black">
          <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Avail
          </span>
          <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/80">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Full
          </span>
          <span className="flex items-center gap-1.5 text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/80">
            <span className="w-2 h-2 rounded-full bg-purple-600" /> Maint
          </span>
        </div>
      </div>

      {/* Small Compact Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-[10px] font-extrabold text-slate-400 uppercase py-1">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14 bg-slate-50/40 rounded-2xl border border-slate-100/50 opacity-30"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const info = getVenueDayStatus(dateStr);

          let dotColor = "bg-emerald-500";
          let bgClass = "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800";
          let statusText = "Available";

          if (info?.status === "partial") {
            dotColor = "bg-amber-500";
            bgClass = "bg-amber-50/40 border-amber-200 text-amber-900";
            statusText = "Partial";
          } else if (info?.status === "fully") {
            dotColor = "bg-rose-500";
            bgClass = "bg-rose-50/40 border-rose-200 text-rose-900";
            statusText = "Full";
          } else if (info?.status === "maintenance" || info?.status === "closed") {
            dotColor = "bg-purple-600";
            bgClass = "bg-purple-50/40 border-purple-200 text-purple-900";
            statusText = info?.status === "closed" ? "Closed" : "Maint";
          }

          const isSelected = setupForm.startDate === dateStr;

          return (
            <div
              key={dayNum}
              onClick={() => setSetupForm({ ...setupForm, startDate: dateStr })}
              onMouseEnter={() => info && setHoveredDayData({ dayNum, dateStr, info })}
              onMouseLeave={() => setHoveredDayData(null)}
              className={`relative h-14 p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${bgClass} ${
                isSelected ? "ring-2 ring-blue-600 border-blue-600 shadow-xs" : "hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800">{dayNum}</span>
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              </div>

              {info?.bookedSlots?.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 truncate">
                  {info.bookedSlots.length} booked
                </span>
              )}

              {/* Hover Tooltip Callout */}
              {hoveredDayData?.dateStr === dateStr && info && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl z-50 animate-in zoom-in-95 pointer-events-none border border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                    <span className="font-extrabold text-[11px] text-blue-400">📅 {monthNames[currentMonth]} {dayNum}, {currentYear}</span>
                    <span className="text-[9px] font-bold uppercase bg-blue-600 px-2 py-0.5 rounded-full text-white">
                      {statusText}
                    </span>
                  </div>
                  {info.bookedSlots && info.bookedSlots.length > 0 ? (
                    <div className="space-y-1 text-[10px]">
                      {info.bookedSlots.map((slot, sIdx) => (
                        <div key={sIdx} className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                          <p className="font-bold text-amber-300">{slot.time}</p>
                          <p className="text-slate-300">{slot.requestor} ({slot.dept})</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">{info.reason || "All time slots available"}</p>
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
