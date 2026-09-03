import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Building2, User } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { formatTime12, formatTimeRange12 } from "@/lib/dateUtils";

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

  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3 h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <CalendarIcon size={14} className="text-blue-600" />
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
            Schedule Overview
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Interactive Calendar
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
          <select
            value={calMonth !== undefined ? calMonth : 7}
            onChange={(e) => setCalMonth && setCalMonth(Number(e.target.value))}
            className="bg-white text-slate-900 font-extrabold text-[11px] py-1 px-2 rounded-lg border border-slate-200 cursor-pointer focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={calYear !== undefined ? calYear : 2026}
            onChange={(e) => setCalYear && setCalYear(Number(e.target.value))}
            className="bg-white text-slate-900 font-extrabold text-[11px] py-1 px-2 rounded-lg border border-slate-200 cursor-pointer focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center text-[11px] font-semibold">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const details = getDayDetails ? getDayDetails(day) : { isBooked: false, bookings: [] };
          const isToday = day === todayDay && (calMonth === todayMonth) && (calYear === todayYear);
          const hasBookings = Boolean(details?.isBooked && details?.bookings?.length > 0);
          const bookingsCount = details?.bookings?.length || 0;

          // Status determination
          const isOngoing = details?.isOngoing;
          const isPending = details?.isPending;

          let statusClass = "border-transparent text-slate-700 hover:bg-slate-100 font-medium";
          let badgeClass = "bg-emerald-600 text-white";

          if (hasBookings) {
            if (isOngoing) {
              statusClass = "bg-blue-600 hover:bg-blue-700 text-white font-extrabold border-blue-600 shadow-xs";
              badgeClass = "bg-blue-600 text-white";
            } else if (isPending) {
              statusClass = "bg-amber-500 hover:bg-amber-600 text-white font-extrabold border-amber-500 shadow-xs";
              badgeClass = "bg-amber-600 text-white";
            } else {
              statusClass = "bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold border-emerald-600 shadow-xs";
              badgeClass = "bg-emerald-600 text-white";
            }

            if (isToday) {
              statusClass += " ring-2 ring-blue-500 ring-offset-2 ring-offset-white";
            }
          } else if (isToday) {
            statusClass = "border-2 border-blue-600 bg-blue-50/70 text-blue-700 font-extrabold shadow-2xs";
          }

          // Build rich tooltip content
          const primaryBooking = details?.bookings?.[0];
          const timeRange = primaryBooking
            ? formatTimeRange12(
                primaryBooking.time_start || primaryBooking.start_time || primaryBooking.start_datetime,
                primaryBooking.time_end || primaryBooking.end_time || primaryBooking.end_datetime
              )
            : "All Facility Slots Open";

          const venueOrPurpose = primaryBooking
            ? (primaryBooking.venue_name || primaryBooking.purpose || "Campus Reservation")
            : `${MONTH_NAMES[calMonth ?? 7]} ${day}, ${calYear ?? 2026}`;

          const boxInfo = {
            status: hasBookings ? `${bookingsCount} Booking${bookingsCount > 1 ? "s" : ""}` : "Available",
            badgeClass,
            time: timeRange,
            details: hasBookings
              ? `${venueOrPurpose} • ${primaryBooking?.filer_name || "Department Filer"}`
              : "No reservation scheduled.",
          };

          return (
            <Tooltip key={day} box={boxInfo}>
              <button
                type="button"
                onClick={() => {
                  if (hasBookings) {
                    setSelectedDayEvents({
                      day,
                      dateStr: `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`,
                      bookings: details.bookings
                    });
                  }
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer border ${statusClass}`}
              >
                <span className="text-[11px] leading-none">{day}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Quick Day Details Modal if a day is clicked */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {selectedDayEvents.dateStr}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedDayEvents.bookings.length} Scheduled Reservation{selectedDayEvents.bookings.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedDayEvents.bookings.map((b, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="truncate max-w-[170px]">{b.venue_name || b.purpose || "Reservation"}</span>
                    <span className="font-mono text-[10px] text-blue-600">{b.reference_code}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                    <Clock size={11} />
                    <span>
                      {formatTimeRange12(
                        b.time_start || b.start_time || b.start_datetime,
                        b.time_end || b.end_time || b.end_datetime
                      )}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {b.filer_name} ({b.program_office || "Department"})
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayEvents(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
