import { MapPin, ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Step2Venue({
  filteredVenues = [],
  selectedVenue,
  handleVenueSelect,
  selectedDate,
  handleDateSelect,
  timeStart,
  setTimeStart,
  timeEnd,
  setTimeEnd,
  bookedDates = [],
  onBack,
  onNext,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Minimum advance booking requirement (3 days)
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 3);

  // 4-card venue pagination state
  const [venuePage, setVenuePage] = useState(0);
  const pageSize = 4;
  const totalPages = Math.ceil(filteredVenues.length / pageSize) || 1;
  const paginatedVenues = filteredVenues.slice(venuePage * pageSize, (venuePage + 1) * pageSize);

  // Calendar navigation state
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const pad = (n) => String(n).padStart(2, "0");

  const isDayDisabled = (day) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < minDate) return true;
    return false;
  };

  const getDayStatus = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (bookedDates.includes(dateStr)) return "fully";
    // Dummy check for partially booked days (e.g. weekends or specific dates)
    const dayOfWeek = new Date(calYear, calMonth, day).getDay();
    if (dayOfWeek === 6) return "partially";
    return "available";
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* 2-Column Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Column: 4-Card Venue Grid with Pagination (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">1. Select Venue</h3>
              <p className="text-xs text-slate-500 font-semibold">Choose from available university venues</p>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={venuePage === 0}
                  onClick={() => setVenuePage(p => p - 1)}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold"
                >
                  <ChevronLeft size={14} className="mr-1" /> Prev 4
                </Button>
                <span className="text-xs font-bold text-slate-500">
                  {venuePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={venuePage >= totalPages - 1}
                  onClick={() => setVenuePage(p => p + 1)}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold"
                >
                  Next 4 <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* 4-Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedVenues.map((v) => {
              const isSelected = selectedVenue?.id === v.id;
              const isMorelos = v.office?.slug === "fsuu-morelos" || v.location?.includes("Morelos");

              return (
                <div
                  key={v.id}
                  onClick={() => handleVenueSelect(v)}
                  className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-600/10 scale-[1.02]"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div>
                    <div className="w-full h-28 bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200/60">
                      <span className="text-slate-400 text-xs font-bold">{v.name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        isMorelos ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700"
                      }`}>
                        {isMorelos ? "FSUU Morelos" : "FSUU Main"}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {v.capacity ? `${v.capacity} seats` : "Standard"}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">{v.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{v.location || "FSUU Campus"}</span>
                    </p>
                  </div>

                  <div className={`text-xs font-bold text-center py-1.5 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-200/80"
                  }`}>
                    {isSelected ? "Selected Venue" : "Select Venue"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Calendar & Time Selection (5 cols) ── */}
        <div className="lg:col-span-5 space-y-5 bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              2. Date & Time Selection
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {selectedVenue ? `Availability for ${selectedVenue.name}` : "Select a venue first"}
            </p>
          </div>

          {/* Color Availability Badges */}
          <div className="flex items-center justify-between text-[11px] font-bold bg-white p-2.5 rounded-xl border border-slate-200/60">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Partial
            </span>
            <span className="flex items-center gap-1 text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fully Booked
            </span>
          </div>

          {/* Calendar Widget */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="font-extrabold text-slate-900 text-xs">{monthLabel}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0 rounded-md">
                  <ChevronLeft size={13} />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0 rounded-md">
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] mb-1 font-bold text-slate-400">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <div key={d} className="py-0.5">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                const disabled = isDayDisabled(day);
                const status = getDayStatus(day);
                const isSelected = selectedDate === dateStr;

                let colorStyle = "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100";
                if (status === "partially") colorStyle = "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100";
                if (status === "fully") colorStyle = "bg-rose-50 border-rose-200 text-rose-800 cursor-not-allowed opacity-60";
                if (disabled) colorStyle = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed";

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled || status === "fully"}
                    onClick={() => handleDateSelect(dateStr)}
                    className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs font-extrabold scale-105"
                        : colorStyle
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Clock size={14} className="text-blue-600" />
              Set Time Range
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Time Start</label>
                <input
                  type="time"
                  step="300"
                  value={timeStart}
                  onChange={e => setTimeStart(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Time End</label>
                <input
                  type="time"
                  step="300"
                  value={timeEnd}
                  onChange={e => setTimeEnd(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            {selectedDate && timeStart && timeEnd && (
              <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-lg text-[11px] font-semibold text-blue-900">
                ✅ Selected: <strong>{selectedDate}</strong> ({timeStart} - {timeEnd}). This will auto-fill into your details.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Back and Next Switches */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200/80">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs flex items-center gap-2"
        >
          <ChevronLeft size={16} />
          <span>Back to Role Selection</span>
        </Button>

        <Button
          type="button"
          disabled={!selectedVenue || !selectedDate}
          onClick={() => selectedVenue && selectedDate && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
        >
          <span>Next: Fill Details</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
