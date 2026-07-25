import { MapPin, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

export default function Step2Venue({
  venueCategory,
  setVenueCategory,
  filteredVenues,
  selectedVenue,
  handleVenueSelect,
  selectedDate,
  handleDateSelect,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
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

  // Venue pagination state (display only 4 venues at a time in 2x2 grid)
  const PAGE_SIZE = 4;
  const [venuePage, setVenuePage] = useState(0);
  const totalVenuePages = Math.max(1, Math.ceil(filteredVenues.length / PAGE_SIZE));
  const displayedVenues = useMemo(() => {
    const startIndex = venuePage * PAGE_SIZE;
    return filteredVenues.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredVenues, venuePage]);

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
      
      {/* SIDE-BY-SIDE SPLIT GRID (VENUES ON LEFT, CALENDAR ON RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: VENUE SELECTION CARDS (MAX 4 DISPLAYED WITH NEXT/PREV ARROWS) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Select Available Venue</h3>
              <p className="text-xs text-slate-400">Showing {displayedVenues.length} of {filteredVenues.length}</p>
            </div>
            {totalVenuePages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={venuePage === 0}
                  onClick={() => setVenuePage(p => Math.max(0, p - 1))}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </Button>
                <span className="text-[10px] font-bold text-slate-600 px-1">
                  {venuePage + 1}/{totalVenuePages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={venuePage >= totalVenuePages - 1}
                  onClick={() => setVenuePage(p => Math.min(totalVenuePages - 1, p + 1))}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-white disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedVenues.map((v) => {
              const isSelected = selectedVenue?.id === v.id;
              const isSco      = v.type === "sco";

              return (
                <div
                  key={v.id}
                  onClick={() => handleVenueSelect(v)}
                  className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? isSco
                        ? "border-purple-600 bg-purple-50/60 shadow-md shadow-purple-600/10 scale-[1.02]"
                        : "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-600/10 scale-[1.02]"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex flex-col flex-grow">
                    <div className="w-full h-24 bg-slate-200 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200/80">
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">No Image</span>
                      )}
                    </div>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isSco ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700"
                      }`}>
                        {isSco ? "SCO Studio" : "AVR Venue"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {v.capacity ? `${v.capacity} seats` : "Studio"}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">{v.name}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-3">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{v.location}</span>
                    </p>
                  </div>

                  <div className={`mt-auto text-xs font-bold text-center py-1.5 rounded-xl border transition-all ${
                    isSelected
                      ? isSco ? "bg-purple-600 text-white border-purple-600" : "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-200/60"
                  }`}>
                    {isSelected ? "Selected" : "Select Venue"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR DATE PICKER + TIME SLOTS BELOW */}
        <div className="lg:col-span-6 bg-slate-50/70 border border-slate-200/80 p-5 rounded-2xl">
          {selectedVenue ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Select Date & Time Slots</h3>
                  <p className="text-xs text-slate-500">
                    Schedule for <span className="font-bold text-blue-600">{selectedVenue.name}</span>
                  </p>
                </div>
                <div className="flex gap-2 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Booked
                  </span>
                </div>
              </div>

              {/* 3-day notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 font-medium leading-relaxed">
                ⏳ Bookings must be made at least <strong>3 days in advance</strong>. Earliest:{" "}
                <strong>{minDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong>.
              </div>

              {/* Calendar Grid */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                {/* Month nav */}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-extrabold text-slate-900 text-sm">{monthLabel}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0 rounded-lg">
                      <ChevronLeft size={14} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0 rounded-lg">
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <div key={d} className="font-bold text-slate-400 py-1 text-[11px]">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
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
                        className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30 scale-105 cursor-pointer"
                            : booked
                              ? "bg-slate-100 border-slate-100 border-b-2 border-b-red-400 text-slate-400 opacity-60 cursor-not-allowed"
                              : disabled
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-slate-50 border-slate-200 border-b-2 border-b-emerald-500 text-slate-800 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
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

              {/* TIME SLOTS PICKER BELOW CALENDAR */}
              {selectedDate ? (
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                    <Clock size={14} className="text-blue-600" />
                    <span>Select Time Slot for {selectedDate}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Start Time <span className="text-red-500">*</span></label>
                      <input 
                        type="time" 
                        required 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">End Time <span className="text-red-500">*</span></label>
                      <input 
                        type="time" 
                        required 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        min={startTime}
                        disabled={!startTime}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-600 disabled:opacity-50" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-center text-slate-400 font-semibold italic">Please click a date on the calendar above to select time slots.</p>
              )}

            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <MapPin size={22} />
              </div>
              <p className="text-slate-700 font-bold text-sm">No Venue Selected Yet</p>
              <p className="text-slate-400 max-w-xs mx-auto">Please select a venue on the left to unlock live schedule & availability calendar.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
