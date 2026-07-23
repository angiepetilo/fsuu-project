import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Step2Venue({
  venueCategory,
  setVenueCategory,
  filteredVenues,
  selectedVenue,
  handleVenueSelect,
  selectedDate,
  handleDateSelect,
  bookedDates = [],   // array of "YYYY-MM-DD" strings from backend
}) {
  const today        = new Date();
  today.setHours(0, 0, 0, 0);

  // Earliest selectable date: today + 3 days
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 3);

  // Calendar state — start at current month
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel  = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate();

  const pad = (n) => String(n).padStart(2, "0");

  const isDayDisabled = (day) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < minDate) return true; // past or within 3-day window
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (bookedDates.includes(dateStr)) return true;
    return false;
  };

  const isBooked = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    return bookedDates.includes(dateStr);
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">

      {/* Venue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {filteredVenues.map((v) => {
          const isSelected = selectedVenue?.id === v.id;
          const isSco      = v.type === "sco";

          return (
            <div
              key={v.id}
              onClick={() => handleVenueSelect(v)}
              className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? isSco
                    ? "border-purple-600 bg-purple-50/60 shadow-md shadow-purple-600/10 scale-[1.02]"
                    : "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-600/10 scale-[1.02]"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
              }`}
            >
              <div className="flex flex-col flex-grow">
                <div className="w-full h-32 bg-slate-200 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200">
                  <span className="text-slate-400 text-xs font-medium">No Image Available</span>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    isSco ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700"
                  }`}>
                    {isSco ? "SCO Studio" : "AVR Venue"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {v.capacity ? `${v.capacity} seats` : "Broadcast Studio"}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-base mb-1">{v.name}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{v.location}</span>
                </p>
              </div>

              <div className={`mt-auto text-xs font-bold text-center py-2 rounded-xl border transition-all ${
                isSelected
                  ? isSco ? "bg-purple-600 text-white border-purple-600" : "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 text-slate-700 border-slate-200/60"
              }`}>
                {isSelected ? "Selected Venue" : "Select Venue"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar */}
      {selectedVenue && (
        <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Select Date of Usage</h3>
              <p className="text-xs text-slate-500">
                Checking live availability for{" "}
                <span className="font-bold text-blue-600">{selectedVenue.name}</span>
              </p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Booked
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Unavailable
              </span>
            </div>
          </div>

          {/* 3-day notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 font-medium">
            ⏳ Bookings must be made at least <strong>3 days in advance</strong>. Earliest available date:{" "}
            <strong>{minDate.toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</strong>.
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            {/* Month nav */}
            <div className="flex justify-between items-center mb-4">
              <span className="font-extrabold text-slate-900 text-sm">{monthLabel}</span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 rounded-lg">
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 rounded-lg">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-1.5">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} className="font-bold text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {/* Empty cells for first-day offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                const disabled = isDayDisabled(day);
                const booked   = isBooked(day);
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={day}
                    onClick={() => !disabled && handleDateSelect(dateStr)}
                    className={`aspect-square flex items-center justify-center rounded-xl border text-xs font-semibold transition-all duration-150 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white font-extrabold shadow-md shadow-blue-600/30 scale-105 cursor-pointer"
                        : booked
                          ? "bg-slate-100/50 border-slate-100 border-b-2 border-b-red-400 text-slate-400 opacity-60 cursor-not-allowed"
                          : disabled
                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            : "bg-slate-50/60 border-slate-200/60 border-b-2 border-b-emerald-500 text-slate-800 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                    }`}
                    title={
                      booked ? "Already booked"
                      : disabled ? "Not available (less than 3 days ahead)"
                      : dateStr
                    }
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
