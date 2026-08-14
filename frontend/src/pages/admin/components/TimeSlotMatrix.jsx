import React, { useMemo } from "react";
import { Clock, User, Calendar, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Helper to parse various time formats ("08:00", "08:30:00", "1:30 PM", "13:00")
 * into a decimal hour (e.g. 8.5)
 */
function parseTimeToDecimal(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim().toUpperCase();

  // Handle "1:30 PM" or "08:00 AM"
  const isPM = str.includes("PM");
  const isAM = str.includes("AM");
  const cleanStr = str.replace(/[^\d:]/g, "");
  const parts = cleanStr.split(":").map(Number);

  if (parts.length < 1 || isNaN(parts[0])) return null;
  let hours = parts[0];
  const minutes = parts[1] || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours + minutes / 60;
}

function formatHourLabel(hour) {
  const h = hour % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:00 ${suffix}`;
}

export default function TimeSlotMatrix({
  selectedDate,
  items = [], // Array of rows: { id, name, subtitle, code }
  schedules = [], // Array of plotted reservations: { itemId, startTime, endTime, filerName, title, refCode, status, notes }
  startHour = 7, // 7:00 AM
  endHour = 19, // 7:00 PM
  title = "Hourly Schedule Matrix",
  emptyLabel = "No items available",
}) {
  const hours = useMemo(() => {
    const list = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  const totalHours = endHour - startHour;

  // Format header date (e.g. "Tuesday, August 14, 2026")
  const formattedDateTitle = useMemo(() => {
    if (!selectedDate) return "Select a Date";
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header & Legend Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 font-semibold">{formattedDateTitle}</p>
          </div>
        </div>

        {/* Legend Badges (Matches Reference Image) */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-lg border bg-white border-slate-200 text-slate-700 shadow-2xs">
            Open / Available
          </span>
          <span className="px-2.5 py-1 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 shadow-2xs">
            ● Reserved
          </span>
          <span className="px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 shadow-2xs">
            ● Pending
          </span>
          <span className="px-2.5 py-1 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 shadow-2xs">
            ● Maintenance / Blocked
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Table Header Row */}
          <div className="grid grid-cols-[220px_1fr] bg-slate-100/90 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-600">
            <div className="p-3 border-r border-slate-200 font-sans font-extrabold text-slate-900 flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600" />
              <span>Resource / Venue</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 ${
                    h === 12 ? "bg-slate-200/50 text-slate-800" : ""
                  }`}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Table Body Rows */}
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              {emptyLabel}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                // Find all schedules matching this specific row/item
                const rowSchedules = schedules.filter(
                  (s) => String(s.itemId) === String(item.id)
                );

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[220px_1fr] hover:bg-slate-50/50 transition-colors group"
                  >
                    {/* Left Column: Resource Title */}
                    <div className="p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50/50 transition-colors flex flex-col justify-center">
                      <span className="font-extrabold text-slate-900 text-xs leading-tight">
                        {item.name}
                      </span>
                      {(item.subtitle || item.code) && (
                        <span className="text-[10.5px] font-mono text-slate-500 font-semibold mt-0.5">
                          {item.code ? `[${item.code}] ` : ""}
                          {item.subtitle}
                        </span>
                      )}
                    </div>

                    {/* Right Column: Time-Slot Gantt Timeline Area */}
                    <div className="relative h-14 bg-white group-hover:bg-slate-50/50 transition-colors">
                      {/* Background Hourly Grid Lines */}
                      <div
                        className="absolute inset-0 grid pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            className={`border-r border-slate-100/90 last:border-r-0 h-full ${
                              h === 12 ? "bg-slate-50/40" : ""
                            }`}
                          />
                        ))}
                      </div>

                      {/* Plotted Schedule Blocks */}
                      {rowSchedules.map((sched, sIdx) => {
                        const startDec = parseTimeToDecimal(sched.startTime);
                        const endDec = parseTimeToDecimal(sched.endTime);

                        if (startDec === null || endDec === null) return null;

                        // Clamping to visible operating window
                        const clampedStart = Math.max(startHour, Math.min(endHour, startDec));
                        const clampedEnd = Math.max(startHour, Math.min(endHour, endDec));
                        const duration = Math.max(0.5, clampedEnd - clampedStart);

                        const leftPercent = ((clampedStart - startHour) / totalHours) * 100;
                        const widthPercent = (duration / totalHours) * 100;

                        const isPending =
                          sched.status === "pending" ||
                          sched.status === "pending_approval";
                        const isMaintenance =
                          sched.status === "maintenance" ||
                          sched.status === "closed" ||
                          sched.status === "damaged";

                        let blockStyle =
                          "bg-blue-600 border-blue-700 text-white shadow-xs";
                        if (isPending) {
                          blockStyle =
                            "bg-amber-500 border-amber-600 text-white shadow-xs";
                        } else if (isMaintenance) {
                          blockStyle =
                            "bg-slate-700 border-slate-800 text-white shadow-xs";
                        }

                        return (
                          <div
                            key={sched.id || sIdx}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(4, widthPercent)}%`,
                            }}
                            title={`${sched.filerName || "Requestor"} | ${sched.title || "Booking"} (${sched.startTime} - ${sched.endTime})`}
                            className={`absolute top-1.5 bottom-1.5 rounded-lg border px-2 py-1 flex flex-col justify-center overflow-hidden z-10 transition-all hover:scale-[1.01] hover:z-20 cursor-pointer ${blockStyle}`}
                          >
                            <span className="font-extrabold text-[10.5px] leading-tight truncate">
                              {sched.filerName || sched.title || "Scheduled"}
                            </span>
                            <span className="text-[9.5px] font-mono opacity-90 truncate">
                              {sched.startTime} - {sched.endTime}
                              {sched.refCode ? ` (${sched.refCode})` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
