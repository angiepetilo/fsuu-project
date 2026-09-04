import { MapPin, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, CalendarDays, CheckCircle2, AlertTriangle, Building2, DollarSign, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import CustomTimePicker from "@/components/ui/custom-time-picker";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { getTodayISO, isPastDate, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";

const BLOCKING_STATUSES = ["approved", "ongoing", "on-going"];

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
  isPortal = false,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [, setVersion] = useState(0);
  const [opHours, setOpHours] = useState(propOpHours || null);
  const [pinRules, setPinRules] = useState(propPinRules || null);
  const [dbOverrides, setDbOverrides] = useState([]);
  const [isMultiDay, setIsMultiDay] = useState(() => Boolean(selectedEndDate && selectedEndDate !== selectedDate));

  useEffect(() => {
    if (selectedEndDate && selectedEndDate !== selectedDate) {
      setIsMultiDay(true);
    }
  }, [selectedEndDate, selectedDate]);

  useEffect(() => {
    if (propOpHours) setOpHours(propOpHours);
  }, [propOpHours]);

  useEffect(() => {
    if (propPinRules) setPinRules(propPinRules);
  }, [propPinRules]);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e?.type === "storage" && e.key && e.key !== "fsuu_venue_overrides" && e.key !== "fsuu_venue_maintenance") {
        return;
      }
      setVersion(v => v + 1);
    };
    window.addEventListener("venue_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("venue_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    api.get("/public/operating-hours")
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => { });

    api.get("/public/venue-overrides")
      .then(res => {
        if (Array.isArray(res.data)) setDbOverrides(res.data);
      })
      .catch(() => { });
  }, []);

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const pad = (n) => String(n).padStart(2, "0");

  const dynamicSchedule = selectedVenue?.schedule || (
    opHours?.venue_open && opHours?.venue_close
      ? `Mon - Sat (${formatTime12(opHours.venue_open)} - ${formatTime12(opHours.venue_close)})`
      : "Mon - Sat (7:30 AM - 5:00 PM)"
  );

  // Minimum advance booking requirement (3 days)
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;

  // Search state
  const [venueSearch, setVenueSearch] = useState("");

  const searchedVenues = filteredVenues.filter(v => {
    if (!venueSearch.trim()) return true;
    const q = venueSearch.toLowerCase();
    const name = (v.name || "").toLowerCase();
    const loc = (v.office?.location || v.office?.name || v.location || "").toLowerCase();
    const cap = String(v.capacity || "");
    return name.includes(q) || loc.includes(q) || cap.includes(q);
  });

  // 4-card venue pagination state
  const [venuePage, setVenuePage] = useState(0);
  const pageSize = 4;
  const totalPages = Math.ceil(searchedVenues.length / pageSize) || 1;
  const paginatedVenues = searchedVenues.slice(venuePage * pageSize, (venuePage + 1) * pageSize);

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

  // Automatically pre-select earliest valid booking date if none is selected
  useEffect(() => {
    if (!selectedDate) {
      const defaultDate = isPortal ? getTodayISO() : minDateStr;
      handleDateSelect(defaultDate);
      if (setSelectedEndDate) {
        setSelectedEndDate(defaultDate);
      }
    }
  }, [selectedDate, minDateStr, isPortal]);

  const isDayDisabled = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (isPastDate(dateStr)) return true;
    if (dateStr < minDateStr) return true;
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

    // Check 3-day advance booking requirement
    if (!isPastDate(dateStr) && dateStr < minDateStr) {
      return {
        status: "too_soon",
        tooltip: `${monthLabel} ${day}: 3-Day Advance Notice Required. Venue reservations must be made at least 3 days ahead.`,
        box: {
          status: "3-Day Notice Required",
          badgeClass: "bg-slate-600 text-white",
          time: defaultTimeRange,
          details: "Venue reservations must be booked at least 3 days in advance.",
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
    // Per SPEC: Pending requests do NOT lock the calendar. Only approved/ongoing bookings block availability.
    const dayBookings = existingBookings.filter(b => {
      const bStatus = String(b.status || b.tracking_number?.status || "").toLowerCase();
      if (!BLOCKING_STATUSES.includes(bStatus)) return false; // Pending/inactive slots remain available
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

  const arrivalGraceMins = Number(opHours?.arrival_grace_mins ?? 15);

  const checkOverlap = (s1, e1, s2, e2, graceMins = arrivalGraceMins) => {
    const toMin = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const start1 = toMin(s1);
    const end1 = toMin(e1);
    const start2 = toMin(s2);
    const end2 = toMin(e2);

    // Apply Arrival Grace Period: Next booking can start up to graceMins before end of previous booking
    const adjustedStart1 = start1 + graceMins;
    const adjustedStart2 = start2 + graceMins;

    return (start1 < end2 && end1 > adjustedStart2) && (start2 < end1 && end2 > adjustedStart1);
  };

  const targetEndDate = selectedEndDate && selectedEndDate >= selectedDate ? selectedEndDate : selectedDate;

  const conflictingBooking = (selectedVenue && selectedDate && timeStart && timeEnd)
    ? existingBookings.find(b => {
      // Per SPEC: Only approved or ongoing bookings block the slot and generate a hard conflict
      const bStatus = String(b.status || b.tracking_number?.status || "").toLowerCase();
      if (!BLOCKING_STATUSES.includes(bStatus)) return false;

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
  const isInvalidTimeRange = Boolean(timeStart && timeEnd && timeEnd <= timeStart);
  const isPastSelection = isPastDateTime(selectedDate, timeStart);
  const isConflict = Boolean(conflictingBooking);

  const venueOpen = opHours?.venue_open?.substring(0, 5) || "07:30";
  const venueClose = opHours?.venue_close?.substring(0, 5) || "17:00";
  const isOutsideHours = Boolean(timeStart && timeEnd && (timeStart < venueOpen || timeEnd > venueClose));
  const isShortNotice = Boolean(selectedDate && selectedDate < minDateStr);

  const canProceed = Boolean(
    selectedVenue &&
    selectedDate &&
    timeStart &&
    timeEnd &&
    !isPastSelection &&
    !isInvalidEndDate &&
    !isInvalidTimeRange &&
    !isConflict &&
    (isPortal
      ? (isOutsideHours || isShortNotice ? isPinVerified : true)
      : (!isOutsideHours && !isShortNotice))
  );

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">

      {/* Header Section with Search Bar aligned to the right */}
      <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">Select Venue</h3>
          <p className="text-xs text-slate-500 font-medium">Choose from available university venues</p>
        </div>

        {/* Venue Search Bar aligned to the right side */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search venue name, campus, capacity..."
            value={venueSearch}
            onChange={(e) => {
              setVenueSearch(e.target.value);
              setVenuePage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* 2-Column Main Grid Layout: Left 2x2 Venue Catalog + Right Sticky Apple iOS Calendar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Left Column: 2x2 Venue Cards Grid */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">

          {venuesLoading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <Loader2 size={32} className="mx-auto text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700">Loading university venues...</p>
              <p className="text-[11px] text-slate-400">Fetching live venue catalog</p>
            </div>
          ) : searchedVenues.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80">
              <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                {filteredVenues.length === 0 ? "No university venues registered yet" : "No venues match your search"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {filteredVenues.length === 0 ? "Please check back later or contact the PMO/AVR office." : "Try searching with a different term or keyword"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {paginatedVenues.map((v) => {
                const isSelected = selectedVenue?.id === v.id;
                const campusName = v.office?.location || v.office?.name || v.location || "Main Campus";

                const formatVenueLocation = (venue) => {
                  const loc = (venue.location || "").trim();
                  const campus = (venue.office?.location || venue.office?.name || "").trim();
                  if (loc && campus) {
                    if (loc.toLowerCase() === campus.toLowerCase()) return loc;
                    if (loc.toLowerCase().includes(campus.toLowerCase())) return loc;
                    if (campus.toLowerCase().includes(loc.toLowerCase())) return campus;
                    return `${loc} [ ${campus} ]`;
                  }
                  return loc || campus || "Main Campus";
                };

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
                      {/* Venue Image / Placeholder Box - Seamless Full Fit */}
                      <div className="w-full h-[175px] bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center relative group">
                        {venueInfo.photo ? (
                          <img
                            src={venueInfo.photo}
                            alt={v.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="p-6 flex flex-col items-center justify-center h-full w-full bg-slate-50">
                            <span className="text-slate-800 font-extrabold text-sm leading-snug line-clamp-2">
                              {v.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Venue Metadata */}
                      <div className="mt-4 space-y-1">
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight line-clamp-1">{v.name}</h4>
                        <p className="text-xs text-slate-600 font-semibold line-clamp-1">
                          {formatVenueLocation(v)}
                        </p>
                        <p className="text-xs text-slate-600 font-semibold">
                          {v.capacity || venueInfo.capacity || 80} seats
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Pill Button */}
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
                          <span>Selected</span>
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
          )}

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
                <span>Prev</span>
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
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Date & Time Selection Panel as per Screenshot 1 */}
        <div className="lg:col-span-5 sm:col-span-12 space-y-2">
          {/* Operating Schedule Notice - Green text matching Screenshot 1 */}
          <p className="text-center text-xs font-semibold text-emerald-600 mb-2">
            Operating Schedule: {dynamicSchedule}
          </p>

          <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-slate-200/90 shadow-sm space-y-4 sticky top-4">

            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Date & Time Selection
              </h4>
              <span className="text-xs font-semibold text-slate-500 truncate max-w-[180px] sm:max-w-xs text-right">
                {selectedVenue ? selectedVenue.name : "No Venue Selected"}
              </span>
            </div>

            {/* Multi-Day Reservation Toggle Switch */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Multi-Day Reservation <span className="text-slate-500 font-normal">[{isMultiDay ? "on : multi-day" : "off : single day"}]</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !isMultiDay;
                  setIsMultiDay(next);
                  if (!next && selectedDate && setSelectedEndDate) {
                    setSelectedEndDate(selectedDate);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isMultiDay ? "bg-blue-600" : "bg-slate-300"
                }`}
                title={isMultiDay ? "Switch to single-day mode" : "Switch to multi-day mode"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isMultiDay ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Interactive Calendar Container */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              {/* Header: < Month / Year > */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="text-base font-bold text-slate-900 tracking-tight">
                  {new Date(calYear, calMonth).toLocaleString("default", { month: "long" })} / {calYear}
                </span>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day of Week Headers (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Grid with Multi-Day Range Highlights */}
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                {/* Adjust starting empty slots for Monday-first week */}
                {Array.from({ length: (firstDayOfWeek + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                  const isPast = isPastDate(dateStr);
                  const isShortNotice = !isPast && dateStr < minDateStr;
                  const isPublicBlockedNotice = !isPortal && isShortNotice;
                  const todayStr = getTodayISO();
                  const isToday = dateStr === todayStr;
                  const info = getDayInfo(day);

                  const isStart = selectedDate === dateStr;
                  const isEnd = (selectedEndDate || selectedDate) === dateStr;
                  const hasRange = Boolean(selectedEndDate && selectedEndDate > selectedDate);
                  const isInBetween = hasRange && dateStr > selectedDate && dateStr < selectedEndDate;

                  const isFullyBooked = info.status === "fully";
                  const isPartialBooked = info.status === "partial";
                  const isMaintenanceOrClosed = info.status === "maintenance" || info.status === "closed";

                  // Disabled state for past dates, short notice (in public view), or maintenance/full
                  const isDisabled = isPast || isPublicBlockedNotice || isMaintenanceOrClosed || isFullyBooked;

                  return (
                    <div
                      key={day}
                      className={`relative h-9 flex items-center justify-center ${hasRange && isInBetween
                          ? "bg-blue-50"
                          : hasRange && isStart
                            ? "bg-gradient-to-r from-transparent 50% to-blue-50 50%"
                            : hasRange && isEnd
                              ? "bg-gradient-to-l from-transparent 50% to-blue-50 50%"
                              : ""
                        }`}
                    >
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;

                          if (!isMultiDay) {
                            // Single-Day Mode: Set start and end to the same clicked date
                            handleDateSelect(dateStr);
                            if (setSelectedEndDate) setSelectedEndDate(dateStr);
                          } else {
                            // Multi-Day Mode: Start/End range with NO limit
                            if (!selectedDate || (selectedDate && selectedEndDate && selectedEndDate !== selectedDate)) {
                              handleDateSelect(dateStr);
                              if (setSelectedEndDate) setSelectedEndDate(dateStr);
                            } else if (selectedDate && (!selectedEndDate || selectedEndDate === selectedDate)) {
                              if (dateStr < selectedDate) {
                                handleDateSelect(dateStr);
                                if (setSelectedEndDate) setSelectedEndDate(dateStr);
                              } else {
                                if (setSelectedEndDate) setSelectedEndDate(dateStr);
                              }
                            }
                          }

                          // Trigger verification pin modal prompt for short notice (within 3 days / tomorrow) in portal mode
                          if (isPortal && isShortNotice && !isPinVerified) {
                            setPinModalMeta && setPinModalMeta({
                              title: "Short-Notice Booking Verification PIN",
                              description: `Selected date (${dateStr}) is within the 3-day notice window (tomorrow / short-notice booking). AVR Head / Administrative clearance PIN is required to authorize this slot.`,
                            });
                            setShowPinModal && setShowPinModal(true);
                          }
                        }}
                        className={`w-9 h-9 rounded-full text-xs font-extrabold flex items-center justify-center mx-auto transition-all relative z-10 ${
                          isStart || isEnd
                            ? "bg-blue-600 text-white font-black shadow-sm scale-105 cursor-pointer"
                            : isToday
                              ? "border-2 border-blue-600 text-blue-700 font-extrabold bg-blue-50/40 cursor-pointer"
                              : isFullyBooked
                                ? "border-2 border-rose-400 text-rose-600 font-bold bg-rose-50/40 cursor-not-allowed"
                                : isPartialBooked
                                  ? "border-2 border-amber-400 text-amber-700 font-bold bg-amber-50/40 hover:bg-amber-100 cursor-pointer"
                                  : isShortNotice
                                    ? `border-2 border-slate-300 text-slate-500 font-bold bg-slate-50/50 ${isPublicBlockedNotice ? "cursor-not-allowed opacity-80" : "hover:bg-slate-100 cursor-pointer"}`
                                    : isPast || isMaintenanceOrClosed
                                      ? "text-slate-300 font-semibold cursor-not-allowed select-none"
                                      : "text-slate-800 font-bold hover:bg-slate-100 cursor-pointer"
                        }`}
                        title={
                          isToday
                            ? `Today (${dateStr})${isPublicBlockedNotice ? ' - Min. 3 days advance notice required for venue booking' : ''}`
                            : isPast
                              ? "Date already passed"
                              : isPublicBlockedNotice
                                ? `${dateStr} (Requires at least 3 days advance booking)`
                                : isMaintenanceOrClosed
                                  ? `${dateStr} (${info.box?.status || 'Maintenance / Closed'})`
                                  : isFullyBooked
                                    ? `${dateStr} (Fully Booked)`
                                    : isPartialBooked
                                      ? `${dateStr} (Partially Booked: ${info.box?.time || 'Reserved slots'})`
                                      : isShortNotice
                                        ? `${dateStr} (Short-Notice: PIN Authorization Required)`
                                        : `${dateStr} (Available)`
                        }
                      >
                        <span>{day}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Quick Legend matching Screenshot 1 */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 pt-3 border-t border-slate-100/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                  <span>Selected</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-transparent inline-block"></span>
                  <span>Partially Booked</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-400 bg-transparent inline-block"></span>
                  <span>Fully Booked</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-transparent inline-block"></span>
                  <span>3-day notice</span>
                </span>
              </div>
            </div>

            {/* Time Controls: Time Start * | Time End * with Custom 5-Minute TimePicker */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Time Start *</label>
                <CustomTimePicker
                  value={timeStart || "08:00"}
                  onChange={(val) => setTimeStart(val)}
                  minuteStep={5}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Time End *</label>
                <CustomTimePicker
                  value={timeEnd || "10:00"}
                  onChange={(val) => setTimeEnd(val)}
                  minuteStep={5}
                />
              </div>
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
                        <span>Already Reserved!</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        <strong>{selectedVenue?.name}</strong> is already booked on <strong>{conflictingBooking.date_of_usage ? conflictingBooking.date_of_usage.substring(0, 10) : selectedDate}</strong> from <strong>{formatTime12(conflictingBooking.time_start?.substring(0, 5))} to {formatTime12(conflictingBooking.time_end?.substring(0, 5))}</strong>.
                      </p>
                    </div>
                  ) : null}

                  {(() => {
                    const venueOpen = opHours?.venue_open?.substring(0, 5) || "07:30";
                    const venueClose = opHours?.venue_close?.substring(0, 5) || "17:00";
                    const isOutside = timeStart < venueOpen || timeEnd > venueClose;

                    if (isOutside) {
                      if (isPortal) {
                        return (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                Outside Office Hours ({formatTime12(venueOpen)} – {formatTime12(venueClose)})
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-normal leading-relaxed">
                              Selected booking time ({formatTime12(timeStart)} – {formatTime12(timeEnd)}) is outside campus hours. AVR Head / Admin Verification PIN is required for authorization.
                            </p>
                            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                              {isPinVerified ? (
                                <span className="text-xs font-medium text-slate-700">
                                  ✓ PIN verified for outside hours
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (setPinModalMeta) {
                                      setPinModalMeta({
                                        title: "Outside Office Hours PIN",
                                        description: `Selected booking time (${formatTime12(timeStart)} - ${formatTime12(timeEnd)}) is outside official campus hours (${formatTime12(venueOpen)} - ${formatTime12(venueClose)}). AVR Head / Admin Verification PIN is required.`,
                                      });
                                    }
                                    setShowPinModal && setShowPinModal(true);
                                  }}
                                  className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white active:bg-blue-700 font-semibold text-xs transition-all cursor-pointer text-center shadow-2xs"
                                >
                                  Verify PIN
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 mt-2">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900">
                              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                              <span>Outside Operating Hours</span>
                            </div>
                            <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                              Must be schedule within Operating Hours [ {formatTime12(venueOpen)} - {formatTime12(venueClose)} ].
                            </p>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              )}

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
