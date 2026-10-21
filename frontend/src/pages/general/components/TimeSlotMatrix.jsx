import React, { useMemo } from "react";
import { Clock, User, Calendar, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { formatTime12 as formatTime12h } from "../../../lib/dateUtils";

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
  const hourSlots = useMemo(() => {
    const list = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  const totalHours = Math.max(1, endHour - startHour);

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

  const resourceHeader = title.toLowerCase().includes("borrow")
    ? "Borrowing"
    : title.toLowerCase().includes("venue")
    ? "Venue"
    : "Resource";

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{formattedDateTitle}</p>
        </div>

        {/* Operating Status Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 inline-block shadow-2xs" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 inline-block shadow-2xs" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 inline-block shadow-2xs" />
            <span>On-Going</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 inline-block shadow-2xs" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 inline-block shadow-2xs" />
            <span>Closed</span>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Table Header Row */}
          <div className="grid grid-cols-[240px_1fr] bg-slate-100/90 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
            <div className="p-3 border-r border-slate-200 dark:border-slate-700 font-sans font-extrabold text-slate-900 dark:text-white flex items-center">
              <span>{resourceHeader}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${hourSlots.length}, minmax(0, 1fr))` }}>
              {hourSlots.map((h) => (
                <div
                  key={h}
                  className={`p-2.5 text-center border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-slate-700 dark:text-slate-200 font-bold ${
                    h === 12 ? "bg-slate-200/60 dark:bg-slate-700/60 text-slate-900 dark:text-white" : ""
                  }`}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Table Body Rows */}
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
              {emptyLabel}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                // Find all schedules matching this specific row/item (by ID or Barcode)
                const rowSchedules = (Array.isArray(schedules) ? schedules : []).filter(
                  (s) =>
                    s &&
                    (String(s.itemId || s.item_id || "") === String(item.id || "") ||
                    (item.code && (String(s.barcode || "") === String(item.code) || String(s.itemBarcode || "") === String(item.code))))
                );

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[240px_1fr] hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Left Column: Resource Title */}
                    <div className="p-3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40 transition-colors flex flex-col justify-center">
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight">
                        {item.name}
                      </span>
                      {(item.subtitle || item.code) && (
                        <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          {item.code ? `[${item.code}] ` : ""}
                          {item.subtitle}
                        </span>
                      )}
                    </div>

                    {/* Right Column: Time-Slot Gantt Timeline Area */}
                    <div className="relative h-20 bg-white dark:bg-[#111827] group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40 transition-colors">
                      {/* Background Hourly Available Slots (Image 3 visual) */}
                      <div
                        className="absolute inset-0 grid p-1.5 gap-1.5 pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${hourSlots.length}, minmax(0, 1fr))` }}
                      >
                        {hourSlots.map((h) => (
                          <div
                            key={h}
                            className="h-full rounded-xl bg-emerald-500/15 dark:bg-emerald-500/10 border border-emerald-500/25 dark:border-emerald-500/20"
                          />
                        ))}
                      </div>

                      {/* Plotted Schedule Blocks */}
                      {rowSchedules.map((sched, sIdx) => {
                        if (!sched) return null;
                        const startDec = parseTimeToDecimal(sched?.startTime || sched?.time_start);
                        const endDec = parseTimeToDecimal(sched?.endTime || sched?.time_end);

                        if (startDec === null || endDec === null) return null;

                        // Clamping to visible operating window
                        const clampedStart = Math.max(startHour, Math.min(endHour, startDec));
                        const clampedEnd = Math.max(startHour, Math.min(endHour, endDec));
                        const duration = Math.max(0.6, clampedEnd - clampedStart);

                        const leftPercent = ((clampedStart - startHour) / totalHours) * 100;
                        const widthPercent = (duration / totalHours) * 100;

                        const rawStatus = (sched.status || "").toLowerCase();
                        const isClosed = rawStatus === "closed";
                        const isMaintenance = rawStatus === "maintenance" || rawStatus === "damaged";
                        const isOngoing = rawStatus === "ongoing" || rawStatus === "on-going";
                        const isBooked =
                          rawStatus === "booked" ||
                          rawStatus === "borrowed" ||
                          rawStatus === "approved" ||
                          rawStatus === "reserved";
                        const isPending =
                          rawStatus === "pending" ||
                          rawStatus === "pending_approval";
                        const isAvailable = rawStatus === "available";

                        let blockStyle = "bg-blue-100 dark:bg-blue-950/80 border-2 border-blue-500 text-blue-950 dark:text-blue-100";
                        let statusBadgeLabel = "Booked";
                        let statusBadgeBg = "bg-blue-600 text-white";

                        if (isClosed) {
                          blockStyle = "bg-rose-500 dark:bg-rose-600 border-2 border-rose-600 text-white shadow-xs";
                          statusBadgeLabel = "Closed";
                          statusBadgeBg = "bg-rose-700 text-white";
                        } else if (isMaintenance) {
                          blockStyle = "bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs";
                          statusBadgeLabel = "Maintenance";
                          statusBadgeBg = "bg-amber-600 text-white";
                        } else if (isOngoing) {
                          blockStyle = "bg-indigo-100 dark:bg-indigo-950/80 border-2 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-xs";
                          statusBadgeLabel = "On-Going";
                          statusBadgeBg = "bg-indigo-600 text-white";
                        } else if (isBooked) {
                          blockStyle = "bg-blue-100 dark:bg-blue-950/80 border-2 border-blue-600 text-blue-950 dark:text-blue-100 shadow-xs";
                          statusBadgeLabel = "Booked";
                          statusBadgeBg = "bg-blue-600 text-white";
                        } else if (isPending) {
                          blockStyle = "bg-amber-100/90 dark:bg-amber-950/70 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs";
                          statusBadgeLabel = "Pending";
                          statusBadgeBg = "bg-amber-600 text-white";
                        } else if (isAvailable) {
                          blockStyle = "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-100";
                          statusBadgeLabel = "Available";
                          statusBadgeBg = "bg-emerald-600 text-white";
                        }

                        const sStart = sched?.startTime || sched?.time_start || sched?.start_time || sched?.start || "08:00";
                        const sEnd = sched?.endTime || sched?.time_end || sched?.end_time || sched?.end || "17:00";
                        const formattedTimeRange = `${formatTime12h(sStart)} - ${formatTime12h(sEnd)}`;

                        return (
                          <div
                            key={sched.id || sIdx}
                            style={{
                              left: `calc(${leftPercent}% + 4px)`,
                              width: `calc(${Math.max(8, widthPercent)}% - 8px)`,
                            }}
                            title={`[${statusBadgeLabel}] ${sched.filerName || "Requestor"} | ${sched.department ? sched.department + ' • ' : ''}${sched.classification || ''} | Time: ${formattedTimeRange} | ${sched.title || ""}`}
                            className={`absolute top-1.5 bottom-1.5 rounded-xl px-2.5 py-1.5 flex flex-col justify-between overflow-hidden z-10 transition-all hover:scale-[1.01] hover:z-20 cursor-pointer shadow-sm ${blockStyle}`}
                          >
                            {/* Line 1: Status Badge + Time */}
                            <div className="flex items-center justify-between gap-1 leading-tight">
                              <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 shadow-2xs ${statusBadgeBg}`}>
                                {statusBadgeLabel}
                              </span>
                              <span className="font-extrabold text-[10.5px] font-mono truncate">
                                {formattedTimeRange}
                              </span>
                            </div>

                            {/* Line 2: Filer Name + Title */}
                            <div className="font-extrabold text-[11px] truncate leading-tight mt-0.5">
                              <span>{sched.filerName || "Scheduled"}</span>
                              {sched.title && sched.title !== "Venue Reservation" && (
                                <span className="font-medium opacity-80 ml-1 text-[10px]">
                                  • {sched.title}
                                </span>
                              )}
                            </div>

                            {/* Line 3: Department + Classification/Identity */}
                            <div className="flex items-center gap-1.5 text-[9.5px] font-semibold opacity-90 truncate mt-0.5">
                              {sched.department && (
                                <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold shrink-0">
                                  {sched.department}
                                </span>
                              )}
                              {sched.classification && (
                                <span className="capitalize truncate">
                                  {sched.classification}
                                </span>
                              )}
                              {sched.refCode && !sched.department && !sched.classification && (
                                <span className="font-mono text-[9px]">
                                  {sched.refCode}
                                </span>
                              )}
                            </div>
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
