import { MapPin, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import api from "@/lib/axios";

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

  const [, setVersion] = useState(0);
  const [opHours, setOpHours] = useState(null);
  const [dbOverrides, setDbOverrides] = useState([]);

  useEffect(() => {
    const handleUpdate = () => setVersion(v => v + 1);
    window.addEventListener("venue_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("venue_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    api.get("/public/operating-hours")
      .catch(() => api.get("/admin/operating-hours"))
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => {});

    api.get("/public/venue-overrides")
      .then(res => {
        if (Array.isArray(res.data)) setDbOverrides(res.data);
      })
      .catch(() => {});
  }, []);

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const dynamicSchedule = selectedVenue?.schedule || (
    opHours?.venue_open && opHours?.venue_close
      ? `Mon - Sat (${formatTime12(opHours.venue_open)} - ${formatTime12(opHours.venue_close)})`
      : "Mon - Sat (7:30 AM - 5:00 PM)"
  );

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

    // 1. Check venue-specific maintenance blocks from database & localStorage
    const dbMatch = dbOverrides.find(o => {
      const oVenueId = o.venue_id || o.venue?.id;
      const oDate = o.override_date ? o.override_date.substring(0, 10) : null;
      return String(oVenueId) === String(selectedVenue.id) && oDate === dateStr;
    });

    if (dbMatch && (dbMatch.status === "maintenance" || dbMatch.status === "closed")) {
      return {
        status: "maintenance",
        tooltip: `${monthLabel} ${day}: ${selectedVenue.name} is under ${dbMatch.status.toUpperCase()} (${dbMatch.notes || 'Blocked by Admin'})`,
        bookings: [],
      };
    }

    try {
      const savedMaint = localStorage.getItem("fsuu_venue_maintenance") || localStorage.getItem("fsuu_venue_overrides");
      if (savedMaint) {
        const maintMap = JSON.parse(savedMaint);
        const venueKey = `${vCode}_${dateStr}`;
        const mInfo = maintMap[venueKey] || (maintMap[dateStr] && (
          maintMap[dateStr].venueId === selectedVenue.id ||
          maintMap[dateStr].venue_id === selectedVenue.id ||
          (maintMap[dateStr].venueName || "").toLowerCase().includes(vName) ||
          vName.includes((maintMap[dateStr].venueName || "").toLowerCase())
        ) ? maintMap[dateStr] : null);

        if (mInfo && (mInfo.status === "maintenance" || mInfo.status === "closed")) {
          return {
            status: "maintenance",
            tooltip: `${monthLabel} ${day}: ${selectedVenue.name} is under ${mInfo.status.toUpperCase()} (${mInfo.reason || mInfo.notes || 'Blocked by Admin'})`,
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
        tooltip: `${monthLabel} ${day}: Available – No bookings for ${selectedVenue.name} on this date.`,
        bookings: [],
      };
    }

    const OP_START = 480;
    const OP_END = 1020;
    let totalBookedMins = 0;

    const filerDetails = dayBookings.map(b => {
      const name = b.filer_name || b.requestor_name || "Booked";
      const startTime = b.time_start || "08:00:00";
      const endTime = b.time_end || "17:00:00";
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const bStartMins = (sh || 8) * 60 + (sm || 0);
      const bEndMins = (eh || 17) * 60 + (em || 0);

      const overlapStart = Math.max(OP_START, bStartMins);
      const overlapEnd = Math.min(OP_END, bEndMins);
      if (overlapEnd > overlapStart) {
        totalBookedMins += (overlapEnd - overlapStart);
      }

      return `${name} (${startTime.substring(0, 5)} - ${endTime.substring(0, 5)})`;
    });

    const isFully = totalBookedMins >= 540 || dayBookings.length >= 2;
    const status = isFully ? "fully" : "partial";
    const statusLabel = isFully ? "Fully Booked – Entire operating hours taken" : "Partially Booked – Open time slots remaining";

    return {
      status,
      tooltip: `${monthLabel} ${day} [${statusLabel}] for ${selectedVenue.name}: Booked by ${filerDetails.join(", ")}`,
      bookings: dayBookings,
    };
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">

      {/* Header Section with Top-Right Pill Pagination Controls (Apple iOS Style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">1. Select Venue</h3>
          <p className="text-xs text-slate-500 font-medium">Choose from available university venues</p>
        </div>

        {/* Top-Right Pill Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setVenuePage(p => Math.max(0, p - 1))}
              disabled={venuePage === 0}
              className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Prev 4</span>
            </button>

            <span className="text-xs font-black text-slate-700 px-1">
              {venuePage + 1} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setVenuePage(p => Math.min(totalPages - 1, p + 1))}
              disabled={venuePage >= totalPages - 1}
              className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <span>Next 4</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Main Grid Layout: Left 2x2 Venue Catalog + Right Sticky Apple iOS Calendar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Left Column: 2x2 Venue Cards Grid */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {paginatedVenues.map((v) => {
              const isSelected = selectedVenue?.id === v.id;
              const officeLocation = v.office?.location || v.office?.name || "";
              const isMorelos = officeLocation.toLowerCase().includes("morelos") || v.office_id === 2 || v.office?.slug === "fsuu-morelos";
              const campusName = v.office?.location || (isMorelos ? "FSUU Morelos" : "FSUU Main");

              const getVenueData = (v) => {
                let photo = v.photo || v.image || v.avatar || v.avatar_url || v.photo_url || null;
                let status = v.status || "Available";
                let schedule = v.schedule || null;
                let capacity = v.capacity || null;
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
                  className={`relative border-2 rounded-[28px] p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden ${isMaintenance
                    ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                    : isSelected
                      ? "border-blue-600 bg-white shadow-md ring-4 ring-blue-50/60 cursor-pointer"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                    }`}
                >
                  <div>
                    {/* Venue Image / Avatar Frame */}
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200/80">
                      {venueInfo.photo ? (
                        <img src={venueInfo.photo} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center bg-blue-50/50 w-full h-full">
                          <Building2 size={38} className="text-blue-500 mb-1" />
                          <span className="text-slate-700 text-xs font-extrabold truncate max-w-[90%]">{v.name}</span>
                        </div>
                      )}

                      {/* Maintenance Block Overlay */}
                      {isMaintenance && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[11px] px-4 py-1.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                            <AlertTriangle size={14} className="shrink-0 text-white" />
                            <span>MAINTENANCE BLOCK</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-xl border ${isMorelos ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                        {campusName}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {v.capacity || venueInfo.capacity || 100} Seats
                      </span>
                    </div>

                    {/* Venue Title & Location */}
                    <h4 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight line-clamp-1">{v.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-4 flex items-center gap-1 line-clamp-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{v.location ? `${v.location} • ${campusName}` : campusName}</span>
                    </p>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="pt-2 border-t border-slate-100">
                    {isMaintenance ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full border border-amber-300/80 bg-amber-50 text-amber-800 text-xs font-black flex items-center justify-center gap-1.5 opacity-90 cursor-not-allowed"
                      >
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>Maintenance Block</span>
                      </button>
                    ) : isSelected ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleVenueSelect(v); }}
                        className="w-full py-2.5 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Selected Venue</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleVenueSelect(v); }}
                        className="w-full py-2.5 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-black transition-all cursor-pointer shadow-2xs"
                      >
                        Select Venue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sticky Apple iOS Backdrop Blur Calendar & Time Panel */}
        <div className="lg:col-span-5 sm:col-span-12">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-[28px] border border-slate-200/90 shadow-md space-y-4 sticky top-4">

            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                <Clock size={16} className="text-blue-600" />
                2. Date & Time Selection
              </h4>
            </div>

            {/* Operating Schedule Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <p className="text-xs font-extrabold text-slate-900">
                {selectedVenue ? selectedVenue.name : "No venue selected"}
              </p>
              <p className="text-[11px] text-blue-700 font-semibold italic">
                Operating Schedule: {dynamicSchedule}
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-slate-600 px-1">
              <span className="text-emerald-700 font-black">● Available</span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-black">● Partial</span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700 font-black">● Fully Booked</span>
              <span className="text-slate-300">|</span>
              <span className="text-purple-700 font-black">● Maintenance</span>
            </div>

            {/* Interactive iOS Calendar Container */}
            <div className="bg-slate-100/70 p-3.5 rounded-[22px] border border-slate-200/80 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <CalendarIcon size={15} className="text-blue-600" />
                  {monthLabel}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
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
                        className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center mx-auto transition-all cursor-pointer ${isSelected
                          ? "bg-blue-600 text-white font-black shadow-md scale-105"
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
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-extrabold text-slate-800">Time Start *</label>
                      <input
                        type="time"
                        step="300"
                        value={timeStart}
                        onChange={e => setTimeStart(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-extrabold text-slate-800">Time End *</label>
                      <input
                        type="time"
                        step="300"
                        value={timeEnd}
                        onChange={e => setTimeEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">Reservation End Date (Multi-Day)</label>
                    <input
                      type="date"
                      min={selectedDate}
                      value={selectedEndDate || selectedDate || ''}
                      onChange={e => setSelectedEndDate && setSelectedEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-inner"
                    />
                  </div>

                  {selectedDate && timeStart && timeEnd && (
                    <div className="space-y-2 pt-1">
                      {conflictingBooking ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-700">
                            <AlertTriangle size={15} />
                            <span>Time Overlap Conflict!</span>
                          </div>
                          <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                            {selectedVenue?.name} is already reserved from <strong>{conflictingBooking.time_start?.substring(0, 5)} to {conflictingBooking.time_end?.substring(0, 5)}</strong> on {selectedDate} by <strong>{conflictingBooking.filer_name || conflictingBooking.requestor_name}</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-2xl text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                          <span>
                            Selected: <strong>{selectedDate}</strong> ({formatTime12(timeStart)} - {formatTime12(timeEnd)}). Available!
                          </span>
                        </div>
                      )}

                      {(() => {
                        const venueOpen = opHours?.venue_open?.substring(0, 5) || "07:30";
                        const venueClose = opHours?.venue_close?.substring(0, 5) || "17:00";
                        const isOutside = timeStart < venueOpen || timeEnd > venueClose;

                        if (isOutside) {
                          return (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 space-y-1 mt-2">
                              <div className="flex items-center gap-1.5 text-amber-800">
                                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                <span>Operating Hours Notice ({formatTime12(venueOpen)} - {formatTime12(venueClose)})</span>
                              </div>
                              <p className="text-[10.5px] font-semibold text-amber-800 leading-snug">
                                Selected booking time ({formatTime12(timeStart)} - {formatTime12(timeEnd)}) is outside official campus hours.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </div>

      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back to Role Selection</span>
        </Button>

        <Button
          type="button"
          disabled={!selectedVenue || !selectedDate || !timeStart || !timeEnd}
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
