import { MapPin, ChevronLeft, ChevronRight, Clock, Calendar, Info, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

export default function Step2Venue({
  filteredVenues = [],
  selectedVenue,
  handleVenueSelect,
  selectedDate,
  handleDateSelect,
  selectedEndDate,
  setSelectedEndDate,
  timeStart,
  setTimeStart,
  timeEnd,
  setTimeEnd,
  existingBookings = [],
  onBack,
  onNext,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setVersion(v => v + 1);
    window.addEventListener("venue_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("venue_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

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
    const info = getDayInfo(day);
    if (info.status === "maintenance" || info.status === "closed") return true;
    return false;
  };

  // Helper to compute booking details for a specific day and selected venue
  const getDayInfo = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;

    if (!selectedVenue) {
      return {
        status: "available",
        tooltip: `${monthLabel} ${day}: Select a venue to view availability`,
        bookings: [],
      };
    }

    const vCode = selectedVenue.code || selectedVenue.id || "";
    const vName = (selectedVenue.name || "").toLowerCase();

    // 1. Check venue-specific maintenance blocks from localStorage
    try {
      const savedMaint = localStorage.getItem("fsuu_venue_maintenance");
      if (savedMaint) {
        const maintMap = JSON.parse(savedMaint);
        // Match by venue code + date (e.g. AVR1_2026-08-06) or date item with matching venue
        const venueKey = `${vCode}_${dateStr}`;
        const mInfo = maintMap[venueKey] || (maintMap[dateStr] && (
          maintMap[dateStr].venueId === selectedVenue.id ||
          (maintMap[dateStr].venueName || "").toLowerCase().includes(vName) ||
          vName.includes((maintMap[dateStr].venueName || "").toLowerCase())
        ) ? maintMap[dateStr] : null);

        if (mInfo && (mInfo.status === "maintenance" || mInfo.status === "closed")) {
          return {
            status: "maintenance",
            tooltip: `${monthLabel} ${day}: ${selectedVenue.name} is under ${mInfo.status.toUpperCase()} (${mInfo.reason || 'Blocked by Admin'})`,
            bookings: [],
          };
        }
      }
    } catch { }

    // 2. Filter bookings strictly for the SELECTED venue & date
    const dayBookings = existingBookings.filter(b => {
      const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
      const matchVenue = b.venue_id === selectedVenue.id ||
        (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
      const bDate = b.date_of_usage ? b.date_of_usage.substring(0, 10) : b.date_of_use;
      return matchVenue && bDate === dateStr;
    });

    if (dayBookings.length === 0) {
      return {
        status: "available",
        tooltip: `${monthLabel} ${day}: All time slots open for ${selectedVenue.name}`,
        bookings: [],
      };
    }

    const filerDetails = dayBookings.map(b => {
      const name = b.filer_name || b.requestor_name || "Booked";
      const tRange = (b.time_start && b.time_end) ? `${b.time_start.substring(0, 5)} - ${b.time_end.substring(0, 5)}` : "08:00 - 12:00";
      return `${name} (${tRange})`;
    });

    const isFully = dayBookings.length >= 3;
    const status = isFully ? "fully" : "partial";

    return {
      status,
      tooltip: `${monthLabel} ${day} [${status.toUpperCase()}] for ${selectedVenue.name}: Booked by ${filerDetails.join(", ")}`,
      bookings: dayBookings,
    };
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">

      {/* 2-Column Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left Column: 4-Card Venue Grid with Pagination (7 cols) ── */}
        <div className="lg:col-span-7 space-y-4">
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

              // Helper to resolve venue photo, avatar, status, capacity & schedule from System Settings or API
              const getVenueData = (v) => {
                let photo = v.photo || v.image || v.avatar || v.avatar_url || v.photo_url || null;
                let status = v.status || "Available";
                let schedule = v.schedule || null;
                let capacity = v.capacity || null;
                try {
                  const saved = localStorage.getItem("fsuu_venue_availability") || localStorage.getItem("fsuu_venues");
                  if (saved) {
                    const list = JSON.parse(saved);
                    const clean = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    const match = list.find(item => {
                      const a = clean(item.name || item.venue_name || item.title);
                      const b = clean(v.name);
                      return a && b && (a.includes(b) || b.includes(a));
                    });
                    if (match) {
                      if (match.photo || match.image || match.avatar || match.avatar_url) {
                        photo = match.photo || match.image || match.avatar || match.avatar_url;
                      }
                      if (match.status) status = match.status;
                      if (match.schedule) schedule = match.schedule;
                      if (match.capacity) capacity = match.capacity;
                    }
                  }
                } catch { }
                return { photo, status, schedule, capacity };
              };

              const venueInfo = getVenueData(v);
              const isMaintenance = venueInfo.status === "Maintenance Block";

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    if (!isMaintenance) handleVenueSelect(v);
                  }}
                  className={`relative border-2 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between overflow-hidden ${isMaintenance
                      ? "border-amber-200 bg-amber-50/40 cursor-not-allowed opacity-90"
                      : isSelected
                        ? "border-blue-600 bg-blue-50/60 shadow-md shadow-blue-600/10 scale-[1.02] cursor-pointer"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                    }`}
                >
                  <div>
                    <div className="relative w-full h-28 bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200/60">
                      {venueInfo.photo ? (
                        <img src={venueInfo.photo} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center bg-blue-50/50 w-full h-full">
                          <Building2 size={32} className="text-blue-500 mb-1" />
                          <span className="text-slate-700 text-xs font-extrabold truncate max-w-[90%]">{v.name}</span>
                        </div>
                      )}

                      {/* Maintenance Block Overlay */}
                      {isMaintenance && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="bg-amber-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-lg border border-amber-300 flex items-center gap-1 uppercase tracking-wider">
                            <AlertTriangle size={13} />
                            <span>MAINTENANCE BLOCK</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${isMorelos ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700"
                        }`}>
                        {isMorelos ? "FSUU Morelos" : "FSUU Main"}
                      </span>
                      <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {v.capacity || venueInfo.capacity || 100} Pax
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">{v.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{v.location || "FSUU Campus"}</span>
                    </p>
                  </div>

                  <div className={`text-xs font-bold text-center py-1.5 rounded-xl border transition-all ${isMaintenance
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-700 border-slate-200/80"
                    }`}>
                    {isMaintenance ? "🚫 Unavailable" : isSelected ? "Selected Venue" : "Select Venue"}
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
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs text-slate-700 font-bold">
                {selectedVenue ? `Availability for ${selectedVenue.name}` : "Select a venue first"}
              </p>
              {/* Display operating schedule ABOVE CALENDAR as normal italic text */}
              <p className="text-xs text-slate-500 italic mt-0.5">
                Operating Schedule: {selectedVenue?.schedule || "Mon - Sat (8:00 AM - 9:00 PM)"}
              </p>
            </div>
          </div>

          {/* Clean Italic Style Legend Text */}
          <p className="text-xs text-slate-500 italic flex items-center flex-wrap gap-2 px-1">
            <span className="text-emerald-700 font-bold">● Available</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-700 font-bold">● Partial</span>
            <span className="text-slate-300">|</span>
            <span className="text-rose-700 font-bold">● Fully Booked</span>
            <span className="text-slate-300">|</span>
            <span className="text-purple-700 font-bold">● Maintenance</span>
          </p>

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
                const info = getDayInfo(day);
                const isSelected = selectedDate === dateStr;

                let colorStyle = "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100";
                if (info.status === "partial") colorStyle = "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100";
                if (info.status === "fully") colorStyle = "bg-rose-50 border-rose-200 text-rose-800 cursor-not-allowed opacity-60";
                if (info.status === "maintenance" || info.status === "closed") colorStyle = "bg-purple-100 border-purple-300 text-purple-800 cursor-not-allowed font-extrabold";
                else if (disabled) colorStyle = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed";

                return (
                  <Tooltip key={day} text={info.tooltip}>
                    <button
                      type="button"
                      disabled={disabled || info.status === "fully"}
                      onClick={() => handleDateSelect(dateStr)}
                      className={`aspect-square w-full flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs font-extrabold scale-105"
                          : colorStyle
                        }`}
                    >
                      {day}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Time Picker Controls & Overlap Conflict Detection */}
          {(() => {
            const selDay = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : 0;
            const info = selDay ? getDayInfo(selDay) : { bookings: [] };

            const checkOverlap = (s1, e1, s2, e2) => {
              const toMin = (t) => {
                if (!t) return 0;
                const [h, m] = t.split(":").map(Number);
                return h * 60 + m;
              };
              return Math.max(toMin(s1), toMin(s2)) < Math.min(toMin(e1), toMin(e2));
            };

            const conflictingBooking = info.bookings.find(b => {
              const bStart = b.time_start?.substring(0, 5) || "08:00";
              const bEnd = b.time_end?.substring(0, 5) || "12:00";
              return checkOverlap(timeStart, timeEnd, bStart, bEnd);
            });

            return (
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

                <div className="mt-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Reservation End Date (Optional for 2+ Day Booking)</label>
                  <input
                    type="date"
                    min={selectedDate}
                    value={selectedEndDate || selectedDate || ''}
                    onChange={e => setSelectedEndDate && setSelectedEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600"
                  />
                  {selectedEndDate && selectedDate && selectedEndDate > selectedDate && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                      🔑 Multi-Day Booking ({selectedDate} to {selectedEndDate}): PIN verification will be required upon proceeding.
                    </p>
                  )}
                </div>

                {selectedDate && timeStart && timeEnd && (
                  <div className="space-y-2">
                    {conflictingBooking ? (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 space-y-1 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-rose-700">
                          <AlertTriangle size={15} />
                          <span>Time Overlap Conflict!</span>
                        </div>
                        <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                          {selectedVenue?.name} is already reserved from <strong>{conflictingBooking.time_start?.substring(0, 5)} to {conflictingBooking.time_end?.substring(0, 5)}</strong> on {selectedDate} by <strong>{conflictingBooking.filer_name || conflictingBooking.requestor_name}</strong>. Please select a non-overlapping time range.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-lg text-[11px] font-semibold text-blue-900 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                        <span>
                          Selected: <strong>{selectedDate}</strong> ({timeStart} - {timeEnd}). Time slot available!
                        </span>
                      </div>
                    )}

                    {/* Display existing bookings on partial date */}
                    {info.bookings.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 font-medium space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-800">
                          <AlertTriangle size={13} className="shrink-0" />
                          <span>Existing Reservations on {selectedDate}:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                          {info.bookings.map((b, idx) => (
                            <li key={idx}>
                              <strong>{b.filer_name || b.requestor_name}</strong>: {b.time_start?.substring(0, 5) ?? "08:00"} - {b.time_end?.substring(0, 5) ?? "12:00"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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
          disabled={!selectedVenue || !selectedDate || (() => {
            const selDay = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : 0;
            const info = selDay ? getDayInfo(selDay) : { bookings: [] };
            const checkOverlap = (s1, e1, s2, e2) => {
              const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
              return Math.max(toMin(s1), toMin(s2)) < Math.min(toMin(e1), toMin(e2));
            };
            return info.bookings.some(b => checkOverlap(timeStart, timeEnd, b.time_start?.substring(0, 5) || "08:00", b.time_end?.substring(0, 5) || "12:00"));
          })()}
          onClick={() => selectedVenue && selectedDate && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          <span>Next: Fill Details</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
