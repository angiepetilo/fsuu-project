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
    <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-extrabold text-slate-900 text-base">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white text-slate-600 transition-all cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white text-slate-600 transition-all cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Color Coding Badges */}
        <div className="flex items-center gap-3 text-[10px] font-extrabold">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Avail
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Full
          </span>
          <span className="flex items-center gap-1 text-purple-700">
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
          <div key={`empty-${i}`} className="h-16 bg-slate-50/50 rounded-xl border border-slate-100/50 opacity-40"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `2026-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const info = getVenueDayStatus(dateStr);

          let bgColor = "bg-emerald-50/70 border-emerald-200 text-emerald-900";
          let badgeBg = "bg-emerald-100 text-emerald-800";
          let statusText = "Available";

          if (info?.status === "partial") {
            bgColor = "bg-amber-50/80 border-amber-300 text-amber-900";
            badgeBg = "bg-amber-100 text-amber-900";
            statusText = "Partial";
          } else if (info?.status === "fully") {
            bgColor = "bg-rose-50/80 border-rose-300 text-rose-900";
            badgeBg = "bg-rose-100 text-rose-800";
            statusText = "Full";
          } else if (info?.status === "maintenance" || info?.status === "closed") {
            bgColor = "bg-purple-50/80 border-purple-300 text-purple-900";
            badgeBg = "bg-purple-100 text-purple-800";
            statusText = info?.status === "closed" ? "Closed" : "Maint";
          }

          return (
            <div
              key={dayNum}
              onClick={() => setSetupForm({ ...setupForm, startDate: dateStr })}
              onMouseEnter={() => info && setHoveredDayData({ dayNum, dateStr, info })}
              onMouseLeave={() => setHoveredDayData(null)}
              className={`relative h-16 p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer hover:scale-105 ${bgColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs">{dayNum}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${badgeBg}`}>
                  {statusText}
                </span>
              </div>

              {info?.bookedSlots?.length > 0 ? (
                <p className="text-[9px] font-bold truncate opacity-80">
                  {info.bookedSlots.length} Booked
                </p>
              ) : info?.reason ? (
                <p className="text-[9px] font-bold truncate opacity-80">
                  {info.reason}
                </p>
              ) : null}

              {/* Hover Tooltip Callout */}
              {hoveredDayData?.dateStr === dateStr && info && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl z-50 animate-in zoom-in-95 pointer-events-none border border-slate-700">
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
