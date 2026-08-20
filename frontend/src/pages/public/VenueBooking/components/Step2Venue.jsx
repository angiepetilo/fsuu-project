import { MapPin, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, CheckCircle2, AlertTriangle, Building2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getTodayISO, isPastDate, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";

export default function Step2Venue({
  identity,
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
  opHours: propOpHours,
  pinRules: propPinRules,
  isPinVerified = false,
  setIsPinVerified,
  setShowPinModal,
  setPinModalMeta,
  onBack,
  onNext,
  venuesLoading = false,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [, setVersion] = useState(0);
  const [opHours, setOpHours] = useState(propOpHours || null);
  const [pinRules, setPinRules] = useState(propPinRules || null);
  const [dbOverrides, setDbOverrides] = useState([]);

  useEffect(() => {
    if (propOpHours) setOpHours(propOpHours);
  }, [propOpHours]);

  useEffect(() => {
    if (propPinRules) setPinRules(propPinRules);
  }, [propPinRules]);

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
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (isPastDate(dateStr)) return true;
    const info = getDayInfo(day);
    if (info.status === "maintenance" || info.status === "closed") return true;
    return false;
  };

  // Helper to compute fee rates for external user
  const getVenueFeeRates = (venue) => {
    if (!venue) return { hourly: "₱1,500 / hr", daily: "₱10,000 / day", cleaning: "₱500 (Flat)" };

    const hourly = venue.external_rental_price || venue.rental_price || 1500;
    const daily = venue.external_daily_price || 10000;
    return {
      hourly: `₱${Number(hourly).toLocaleString()} / hr`,
      daily: `₱${Number(daily).toLocaleString()} / day`,
      cleaning: "₱500 (Flat)",
    };
  };

  const feeRates = getVenueFeeRates(selectedVenue);
  const isExternalUser = (identity || "").toLowerCase() === "external";

  // Helper to compute booking details for a specific day and selected venue
  const getDayInfo = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const venueOpenTime = opHours?.venue_open ? formatTime12(opHours.venue_open) : "07:30 AM";
    const venueCloseTime = opHours?.venue_close ? formatTime12(opHours.venue_close) : "05:00 PM";
    const defaultTimeRange = `${venueOpenTime} - ${venueCloseTime}`;

    if (!selectedVenue) {
      return {
        status: "available",
        tooltip: `${monthLabel} ${day}: Select a venue to view availability`,
        box: {
          status: "Select Venue",
          badgeClass: "bg-slate-700 text-white",
          time: defaultTimeRange,
          details: "Select a venue to check available slots.",
        },
        bookings: [],
      };
    }

    const vCode = selectedVenue.code || selectedVenue.id || "";
    const vName = (selectedVenue.name || "").toLowerCase();

    // 1. Check venue-specific maintenance blocks from database
    const dbMatch = dbOverrides.find(o => {
      const oVenueId = o.venue_id || o.venue?.id;
      const oDate = o.override_date ? o.override_date.substring(0, 10) : null;
      return String(oVenueId) === String(selectedVenue.id) && oDate === dateStr;
    });

    if (dbMatch && (dbMatch.status === "maintenance" || dbMatch.status === "closed")) {
      const isMaint = dbMatch.status === "maintenance";
      return {
        status: "maintenance",
        tooltip: `${monthLabel} ${day}: ${selectedVenue.name} is under ${dbMatch.status.toUpperCase()} (${dbMatch.notes || 'Blocked by Admin'})`,
        box: {
          status: isMaint ? "Maintenance" : "Closed",
          badgeClass: isMaint ? "bg-amber-600 text-white" : "bg-red-600 text-white",
          time: "All Day Blocked",
          details: `${selectedVenue.name} (${dbMatch.notes || 'Blocked by Admin'})`,
        },
        bookings: [],
      };
    }

    // 2. Filter bookings strictly for the SELECTED venue & date (including multi-day spans)
    const dayBookings = existingBookings.filter(b => {
      const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
      const matchVenue = String(b.venue_id) === String(selectedVenue.id) ||
        (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
      const bStartDate = b.date_of_usage ? b.date_of_usage.substring(0, 10) : (b.date_of_use || "");
      const bEndDate = b.reservation_end_date ? b.reservation_end_date.substring(0, 10) : bStartDate;
      return matchVenue && bStartDate <= dateStr && bEndDate >= dateStr;
    });

    if (dayBookings.length === 0) {
      return {
        status: "available",
        tooltip: `${monthLabel} ${day}: Available – No bookings for ${selectedVenue.name} on this date.`,
        box: {
          status: "Available",
          badgeClass: "bg-emerald-600 text-white",
          time: defaultTimeRange,
          details: `${selectedVenue.name} is fully available.`,
        },
        bookings: [],
      };
    }

    const OP_START = 480;
    const OP_END = 1020;
    let totalBookedMins = 0;

    const slotTimes = dayBookings.map(b => {
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

      return `${formatTime12(startTime.substring(0, 5))} - ${formatTime12(endTime.substring(0, 5))}`;
    });

    const isFully = totalBookedMins >= 540 || dayBookings.length >= 2;
    const status = isFully ? "fully" : "partial";
    const statusText = isFully ? "Fully Booked" : "Partially Booked";
    const badgeClass = isFully ? "bg-rose-600 text-white" : "bg-amber-500 text-white";

    return {
      status,
      tooltip: `${monthLabel} ${day} [${statusText}] for ${selectedVenue.name}`,
      box: {
        status: statusText,
        badgeClass: badgeClass,
        time: slotTimes.join(", "),
        details: `${selectedVenue.name} (${dayBookings.length} reserved slot${dayBookings.length > 1 ? 's' : ''})`,
      },
      bookings: dayBookings,
    };
  };

  const checkOverlap = (s1, e1, s2, e2) => {
    const toMin = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    return Math.max(toMin(s1), toMin(s2)) < Math.min(toMin(e1), toMin(e2));
  };

  const targetEndDate = selectedEndDate && selectedEndDate >= selectedDate ? selectedEndDate : selectedDate;

  const conflictingBooking = (selectedVenue && selectedDate && timeStart && timeEnd)
    ? existingBookings.find(b => {
        const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
        const vName = (selectedVenue.name || "").toLowerCase();
        const matchVenue = String(b.venue_id) === String(selectedVenue.id) ||
          (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
        if (!matchVenue) return false;

        const bStartDate = b.date_of_usage ? b.date_of_usage.substring(0, 10) : (b.date_of_use || "");
        const bEndDate = b.reservation_end_date ? b.reservation_end_date.substring(0, 10) : bStartDate;
        
        const dateOverlap = bStartDate <= targetEndDate && bEndDate >= selectedDate;
        if (!dateOverlap) return false;

        const bStart = b.time_start?.substring(0, 5) || "08:00";
        const bEnd = b.time_end?.substring(0, 5) || "17:00";
        return checkOverlap(timeStart, timeEnd, bStart, bEnd);
      })
    : null;

  const isInvalidEndDate = Boolean(selectedEndDate && selectedEndDate < selectedDate);
  const isInvalidTimeRange = Boolean(timeStart && timeEnd && timeEnd <= timeStart && (!selectedEndDate || selectedEndDate === selectedDate));
  const isPastSelection = isPastDateTime(selectedDate, timeStart);
  const isConflict = Boolean(conflictingBooking);

  const canProceed = Boolean(
    selectedVenue &&
    selectedDate &&
    timeStart &&
    timeEnd &&
    !isPastSelection &&
    !isInvalidEndDate &&
    !isInvalidTimeRange &&
    !isConflict
  );

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">

      {/* Header Section */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">1. Select Venue</h3>
        <p className="text-xs text-slate-500 font-medium">Choose from available university venues</p>
      </div>

      {/* 2-Column Main Grid Layout: Left 2x2 Venue Catalog + Right Sticky Apple iOS Calendar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Left Column: 2x2 Venue Cards Grid */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {paginatedVenues.map((v) => {
              const isSelected = selectedVenue?.id === v.id;
              const campusName = v.office?.location || v.office?.name || v.location || "Main Campus";

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
                  className={`relative border-2 rounded-[32px] p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${isMaintenance
                    ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                    : isSelected
                      ? "border-blue-600 bg-white shadow-lg ring-4 ring-blue-50/60 cursor-pointer"
                      : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                    }`}
                >
                  <div>
                    {/* Venue Image / Placeholder Box (Screenshot 1) */}
                    <div className="w-full h-[160px] bg-blue-50/70 border border-blue-100/80 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center relative">
                      {venueInfo.photo ? (
                        <img src={venueInfo.photo} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="p-6 flex flex-col items-center justify-center h-full w-full">
                          <Building2 size={44} className="text-blue-600 mb-2.5 shrink-0" />
                          <span className="text-blue-950 font-extrabold text-sm leading-snug line-clamp-2">
                            {v.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Venue Metadata (Screenshot 1) */}
                    <div className="mt-4 space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight line-clamp-1">{v.name}</h4>
                      <p className="text-xs text-slate-600 font-semibold line-clamp-1">
                        {v.location ? `${v.location} [ ${campusName} ]` : `[ ${campusName} ]`}
                      </p>
                      <p className="text-xs text-slate-600 font-semibold">
                        {v.capacity || venueInfo.capacity || 80} seats
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Pill Button (Screenshot 1) */}
                  <div className="mt-5">
                    {isMaintenance ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-extrabold flex items-center justify-center gap-1.5 opacity-90 cursor-not-allowed"
                      >
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>Maintenance Block</span>
                      </button>
                    ) : isSelected ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleVenueSelect(v); }}
                        className="w-full py-3 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Selected Venue</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleVenueSelect(v); }}
                        className="w-full py-3 rounded-full border border-slate-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-slate-800 text-xs font-black transition-all cursor-pointer shadow-2xs"
                      >
                        Select Venue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls Below Venue Selection */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setVenuePage(p => Math.max(0, p - 1))}
                disabled={venuePage === 0}
                className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev 4</span>
              </button>

              <span className="text-xs font-black text-slate-700 px-2">
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
                    <Tooltip key={day} box={info.box} text={info.tooltip}>
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
                  min={selectedDate || getTodayISO()}
                  value={selectedEndDate || selectedDate || ''}
                  onChange={e => setSelectedEndDate && setSelectedEndDate(e.target.value)}
                  className={`w-full px-3.5 py-2 bg-slate-100/80 border rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:outline-none transition-all shadow-inner ${isInvalidEndDate ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-blue-600'}`}
                />
              </div>

              {selectedDate && timeStart && timeEnd && (
                <div className="space-y-2 pt-1">
                  {isInvalidEndDate ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle size={15} />
                        <span>Invalid Reservation End Date!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        Reservation end date ({selectedEndDate}) cannot be earlier than the start date ({selectedDate}). Please select a date equal to or ahead of the start date.
                      </p>
                    </div>
                  ) : isInvalidTimeRange ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle size={15} />
                        <span>Invalid Time Range!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        Time End ({formatTime12(timeEnd)}) must be later than Time Start ({formatTime12(timeStart)}).
                      </p>
                    </div>
                  ) : isPastSelection ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle size={15} />
                        <span>Past Time Selected!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        Selected start time ({formatTime12(timeStart)}) has already passed for today. Please select a future time slot.
                      </p>
                    </div>
                  ) : isConflict ? (
                    <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs font-bold text-rose-800 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-rose-700 font-extrabold">
                        <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                        <span>Time Slot Blocked / Already Reserved!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        <strong>{selectedVenue?.name}</strong> is already booked on <strong>{conflictingBooking.date_of_usage ? conflictingBooking.date_of_usage.substring(0, 10) : selectedDate}</strong> from <strong>{formatTime12(conflictingBooking.time_start?.substring(0, 5))} to {formatTime12(conflictingBooking.time_end?.substring(0, 5))}</strong>.
                      </p>
                      <p className="text-[11px] font-bold text-rose-900 leading-snug bg-rose-100/70 p-2 rounded-xl border border-rose-200">
                        You cannot proceed to fill details for an overlapping schedule. Please choose a different date, time, or venue.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-2xl text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                      <span>
                        Selected: <strong>{selectedDate}</strong> {selectedEndDate && selectedEndDate !== selectedDate ? `to ${selectedEndDate}` : ''} ({formatTime12(timeStart)} - {formatTime12(timeEnd)}). Available!
                      </span>
                    </div>
                  )}

                  {(() => {
                    const venueOpen = opHours?.venue_open?.substring(0, 5) || "07:30";
                    const venueClose = opHours?.venue_close?.substring(0, 5) || "17:00";
                    const isOutside = timeStart < venueOpen || timeEnd > venueClose;
                    const requiresPinForOutside = (pinRules?.requirePinOutsideHours !== false) && isOutside;

                    if (isOutside) {
                      return (
                        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs font-bold text-amber-900 space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-800">
                              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                              <span className="font-extrabold">Outside Campus Office Hours ({formatTime12(venueOpen)} - {formatTime12(venueClose)})</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase">
                              PIN Required
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                            Selected booking time (<strong>{formatTime12(timeStart)} - {formatTime12(timeEnd)}</strong>) is outside official campus office hours.
                            {requiresPinForOutside ? " An AVR Head / Admin Verification PIN is required for authorization." : ""}
                          </p>
                          {requiresPinForOutside && (
                            <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between gap-2">
                              {isPinVerified ? (
                                <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                                  <CheckCircle2 size={15} />
                                  <span>AVR Head PIN Verified for Outside Hours</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (setPinModalMeta) {
                                      setPinModalMeta({
                                        title: "Outside Office Hours PIN",
                                        description: `Selected booking time (${formatTime12(timeStart)} - ${formatTime12(timeEnd)}) is outside official campus hours (${formatTime12(venueOpen)} - ${formatTime12(venueClose)}). AVR Head / Admin Verification PIN is required for authorization.`,
                                      });
                                    }
                                    setShowPinModal && setShowPinModal(true);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Clock size={14} />
                                  <span>Verify AVR Head PIN Now</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

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
          disabled={!canProceed}
          onClick={() => canProceed && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next: Fill Details</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
