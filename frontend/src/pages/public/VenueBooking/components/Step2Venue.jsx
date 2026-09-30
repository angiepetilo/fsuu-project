import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import CustomTimePicker from "@/components/ui/custom-time-picker";
import { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/lib/axios";
import { getTodayISO, isPastDate, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";
import IosToggle from "@/components/ui/ios-toggle";

const BLOCKING_STATUSES = ["approved", "ongoing", "on-going", "reserved"];

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
  venueOverrides: propOverrides,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [, setVersion] = useState(0);
  const [opHours, setOpHours] = useState(propOpHours || null);
  const [pinRules, setPinRules] = useState(propPinRules || null);
  const [dbOverrides, setDbOverrides] = useState(propOverrides || []);
  const [isMultiDay, setIsMultiDay] = useState(() => Boolean(selectedEndDate && selectedEndDate !== selectedDate));

  useEffect(() => {
    if (propOverrides && propOverrides.length > 0) {
      setDbOverrides(propOverrides);
    }
  }, [propOverrides]);

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

  const fetchOverrides = useCallback(() => {
    api.get("/public/venue-overrides")
      .then(res => {
        let list = Array.isArray(res.data) ? res.data : [];
        try {
          const local = JSON.parse(localStorage.getItem("fsuu_venue_overrides") || "{}");
          const localEntries = Object.values(local).map(ov => ({
            id: ov.id || `local-${ov.venueId || ov.venue_id || 'all'}-${ov.override_date}`,
            venue_id: ov.venue_id !== undefined ? ov.venue_id : (ov.venueId === "all" ? null : ov.venueId),
            override_date: ov.override_date,
            status: ov.status,
            notes: ov.notes || ov.reason,
            start_time: ov.startTime || ov.start_time || "07:30",
            end_time: ov.endTime || ov.end_time || "17:00",
          }));
          const existingKeys = new Set(list.map(o => `${o.venue_id ?? 'all'}_${(o.override_date || '').substring(0, 10)}`));
          localEntries.forEach(lo => {
            const k = `${lo.venue_id ?? 'all'}_${(lo.override_date || '').substring(0, 10)}`;
            if (!existingKeys.has(k)) {
              list.push(lo);
            }
          });
        } catch {}
        setDbOverrides(list);
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem("fsuu_venue_overrides") || "{}");
          setDbOverrides(Object.values(local).map(ov => ({
            id: ov.id || `local-${ov.venueId || ov.venue_id || 'all'}-${ov.override_date}`,
            venue_id: ov.venue_id !== undefined ? ov.venue_id : (ov.venueId === "all" ? null : ov.venueId),
            override_date: ov.override_date,
            status: ov.status,
            notes: ov.notes || ov.reason,
            start_time: ov.startTime || ov.start_time || "07:30",
            end_time: ov.endTime || ov.end_time || "17:00",
          })));
        } catch {}
      });
  }, []);

  useEffect(() => {
    fetchOverrides();
    const handleUpdate = (e) => {
      if (e?.type === "storage" && e.key && e.key !== "fsuu_venue_overrides" && e.key !== "fsuu_venue_maintenance") {
        return;
      }
      fetchOverrides();
      setVersion(v => v + 1);
    };
    window.addEventListener("venue_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("venue_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [fetchOverrides]);

  useEffect(() => {
    api.get("/public/operating-hours")
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => { });
  }, []);

  const formatTime12 = useCallback((tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  const dynamicSchedule = selectedVenue?.schedule || (
    opHours?.venue_open && opHours?.venue_close
      ? `${formatTime12(opHours.venue_open)} - ${formatTime12(opHours.venue_close)}`
      : "07:30 AM - 05:00 PM"
  );

  // Minimum advance booking requirement (3 days)
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 3);
  const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;

  // Search state
  const [venueSearch, setVenueSearch] = useState("");

  const searchedVenues = useMemo(() => {
    if (!venueSearch.trim()) return filteredVenues;
    const q = venueSearch.toLowerCase();
    return filteredVenues.filter(v => {
      const name = (v.name || "").toLowerCase();
      const loc = (v.office?.location || v.office?.name || v.location || "").toLowerCase();
      const cap = String(v.capacity || "");
      return name.includes(q) || loc.includes(q) || cap.includes(q);
    });
  }, [filteredVenues, venueSearch]);

  // Responsive venue pagination: 1 card on mobile, 4 cards on desktop/tablet
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [venuePage, setVenuePage] = useState(0);
  const pageSize = isMobile ? 1 : 4;
  const totalPages = Math.ceil(searchedVenues.length / pageSize) || 1;
  const safeVenuePage = Math.min(venuePage, totalPages - 1);
  const paginatedVenues = useMemo(() => {
    return searchedVenues.slice(safeVenuePage * pageSize, (safeVenuePage + 1) * pageSize);
  }, [searchedVenues, safeVenuePage, pageSize]);

  // Helper to find the first available date
  const getFirstAvailableDate = useCallback((venue) => {
    const startIso = isPortal ? getTodayISO() : minDateStr;
    const [sy, sm, sd] = startIso.split("-").map(Number);
    let curr = new Date(sy, sm - 1, sd);

    for (let step = 0; step < 90; step++) {
      const y = curr.getFullYear();
      const m = curr.getMonth();
      const d = curr.getDate();
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;

      const dbMatch = dbOverrides.find(o => {
        const oVenueId = o.venue_id || o.venue?.id;
        const oDate = o.override_date ? o.override_date.substring(0, 10) : null;
        if (venue && oVenueId && oVenueId !== 'all' && String(oVenueId) !== String(venue.id)) return false;
        return oDate === dateStr;
      });
      const isBlockedOverride = dbMatch && (dbMatch.status === "maintenance" || dbMatch.status === "closed");

      let isFullyBooked = false;
      if (venue) {
        const vIdStr = String(venue.id);
        const vName = (venue.name || "").toLowerCase();
        const dayBookings = existingBookings.filter(b => {
          const bStatus = String(b.status || b.tracking_number?.status || "").toLowerCase();
          if (!BLOCKING_STATUSES.includes(bStatus)) return false;
          const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
          const matches = String(b.venue_id) === vIdStr || (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
          if (!matches) return false;
          const bStart = b.date_of_usage ? b.date_of_usage.substring(0, 10) : (b.date_of_use || "");
          const bEnd = b.reservation_end_date ? b.reservation_end_date.substring(0, 10) : bStart;
          return bStart <= dateStr && bEnd >= dateStr;
        });
        if (dayBookings.length > 0) {
          isFullyBooked = dayBookings.some(b => {
            const s = (b.time_start || "").substring(0, 5);
            const e = (b.time_end || "").substring(0, 5);
            return (s <= "08:00" && e >= "17:00") || b.is_whole_day;
          });
        }
      }

      if (!isBlockedOverride && !isFullyBooked) {
        return dateStr;
      }

      curr.setDate(curr.getDate() + 1);
    }
    return startIso;
  }, [isPortal, minDateStr, dbOverrides, existingBookings]);

  // Calendar navigation state - initialized to earliest available date's year & month
  const [calYear, setCalYear] = useState(() => {
    const baseDate = isPortal ? today : minDate;
    return baseDate.getFullYear();
  });
  const [calMonth, setCalMonth] = useState(() => {
    const baseDate = isPortal ? today : minDate;
    return baseDate.getMonth();
  });

  const prevMonth = useCallback(() => {
    setCalMonth(m => {
      if (m === 0) { setCalYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCalMonth(m => {
      if (m === 11) { setCalYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const monthLabel = `${new Date(calYear, calMonth).toLocaleString("default", { month: "long" })} ${calYear}`;
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Pre-filter bookings for the selected venue to avoid O(N) scanning across all global bookings on every calendar day cell
  const relevantBookings = useMemo(() => {
    if (!selectedVenue) return [];
    const vIdStr = String(selectedVenue.id);
    const vName = (selectedVenue.name || "").toLowerCase();
    return existingBookings.filter(b => {
      const bStatus = String(b.status || b.tracking_number?.status || "").toLowerCase();
      if (!BLOCKING_STATUSES.includes(bStatus)) return false;
      const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
      return String(b.venue_id) === vIdStr || (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
    });
  }, [existingBookings, selectedVenue]);

  // Automatically navigate directly to the first available date and month
  useEffect(() => {
    const firstAvail = getFirstAvailableDate(selectedVenue);
    if (firstAvail) {
      const [y, m] = firstAvail.split("-").map(Number);
      setCalYear(y);
      setCalMonth(m - 1);
      if (!selectedDate || selectedDate < (isPortal ? getTodayISO() : minDateStr)) {
        handleDateSelect(firstAvail);
        if (setSelectedEndDate) {
          setSelectedEndDate(firstAvail);
        }
      }
    }
  }, [selectedVenue, getFirstAvailableDate]);

  const onSelectVenue = (v) => {
    handleVenueSelect(v);
    const firstAvail = getFirstAvailableDate(v);
    if (firstAvail) {
      const [y, m] = firstAvail.split("-").map(Number);
      setCalYear(y);
      setCalMonth(m - 1);
      handleDateSelect(firstAvail);
      if (setSelectedEndDate) {
        setSelectedEndDate(firstAvail);
      }
    }
  };

  const isDayDisabled = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (isPastDate(dateStr)) return true;
    if (dateStr < minDateStr && !isPortal) return true;
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

  const feeRates = useMemo(() => getVenueFeeRates(selectedVenue), [selectedVenue]);
  const isExternalUser = (identity || "").toLowerCase() === "external";

  // Helper to compute booking details for a specific day and selected venue
  const getDayInfo = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const venueOpenTime = opHours?.venue_open ? formatTime12(opHours.venue_open) : "07:30 AM";
    const venueCloseTime = opHours?.venue_close ? formatTime12(opHours.venue_close) : "05:00 PM";
    const defaultTimeRange = `${venueOpenTime} - ${venueCloseTime}`;

    if (!selectedVenue) {
      // Check if this date has a global facility closure or maintenance override
      const globalOverride = dbOverrides.find(o => {
        const oVenueId = o.venue_id || o.venue?.id;
        const oDate = o.override_date ? o.override_date.substring(0, 10) : null;
        return (!oVenueId || oVenueId === 'all') && oDate === dateStr;
      });

      if (globalOverride && (globalOverride.status === "maintenance" || globalOverride.status === "closed")) {
        const isMaint = globalOverride.status === "maintenance";
        return {
          status: isMaint ? "maintenance" : "closed",
          tooltip: `${monthLabel} ${day}: All Campus Venues are ${isMaint ? 'Under Maintenance' : 'Closed'} (${globalOverride.notes || 'Blocked by Admin'})`,
          box: {
            status: isMaint ? "Maintenance" : "Closed",
            badgeClass: isMaint ? "bg-amber-500 text-white" : "bg-rose-600 text-white",
            time: globalOverride.start_time && globalOverride.end_time ? `${formatTime12(globalOverride.start_time)} - ${formatTime12(globalOverride.end_time)}` : defaultTimeRange,
            details: globalOverride.notes || (isMaint ? 'Campus Facility Maintenance' : 'All Facilities Closed'),
          },
          bookings: [],
        };
      }

      return {
        status: "available",
        tooltip: `${monthLabel} ${day}: Select a venue to view availability`,
        box: {
          status: "Select",
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
      return (!oVenueId || oVenueId === 'all' || String(oVenueId) === String(selectedVenue.id)) && oDate === dateStr;
    });

    if (dbMatch && (dbMatch.status === "maintenance" || dbMatch.status === "closed")) {
      const isMaint = dbMatch.status === "maintenance";
      return {
        status: isMaint ? "maintenance" : "closed",
        tooltip: `${monthLabel} ${day}: ${selectedVenue.name} is ${isMaint ? 'Under Maintenance' : 'Closed'} (${dbMatch.notes || 'Blocked by Admin'})`,
        box: {
          status: isMaint ? "Maintenance" : "Closed",
          badgeClass: isMaint ? "bg-amber-500 text-white" : "bg-rose-600 text-white",
          time: dbMatch.start_time && dbMatch.end_time ? `${formatTime12(dbMatch.start_time)} - ${formatTime12(dbMatch.end_time)}` : "All Day Blocked",
          details: `${selectedVenue.name} (${dbMatch.notes || (isMaint ? 'Under Maintenance' : 'Closed by Admin')})`,
        },
        bookings: [],
      };
    }

    // 2. Filter bookings strictly for the SELECTED venue & date (including multi-day spans)
    // relevantBookings is already pre-filtered by venue & blocking status
    const dayBookings = relevantBookings.filter(b => {
      const bStartDate = b.date_of_usage ? b.date_of_usage.substring(0, 10) : (b.date_of_use || "");
      const bEndDate = b.reservation_end_date ? b.reservation_end_date.substring(0, 10) : bStartDate;
      return bStartDate <= dateStr && bEndDate >= dateStr;
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

    const status = "booked";
    const statusText = "Booked";
    const badgeClass = "bg-rose-600 text-white";

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

  const selectedDateOverride = (selectedVenue && selectedDate)
    ? dbOverrides.find(o => {
        const oVenueId = o.venue_id || o.venue?.id;
        const oDate = o.override_date ? o.override_date.substring(0, 10) : null;
        if (oVenueId && oVenueId !== 'all' && String(oVenueId) !== String(selectedVenue.id)) return false;
        const tEnd = targetEndDate || selectedDate;
        return oDate && oDate >= selectedDate && oDate <= tEnd && (o.status === "maintenance" || o.status === "closed");
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
    !selectedDateOverride &&
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
      <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Venues</h3>
        </div>

        {/* Venue Search Bar */}
        <div className="w-full sm:w-80 md:w-96">
          <input
            type="text"
            placeholder="Search"
            value={venueSearch}
            onChange={(e) => {
              setVenueSearch(e.target.value);
              setVenuePage(0);
            }}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* 2-Column Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* Left Column: Venue Cards Grid */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">

          {venuesLoading ? (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Loading</p>
            </div>
          ) : searchedVenues.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {filteredVenues.length === 0 ? "Empty" : "None"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      if (!isMaintenance) onSelectVenue(v);
                    }}
                    className={`border rounded-lg p-4 transition-colors flex flex-col justify-between overflow-hidden ${
                      isMaintenance
                        ? "border-amber-300 bg-amber-50/20 opacity-90 cursor-not-allowed"
                        : isSelected
                          ? "border-blue-600 bg-white dark:bg-slate-800 cursor-pointer"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 cursor-pointer"
                    }`}
                  >
                    <div>
                      {/* Venue Image */}
                      <div className="w-full aspect-video bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col items-center justify-center text-center relative group p-1">
                        {venueInfo.photo ? (
                          <img
                            src={venueInfo.photo}
                            alt={v.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="p-4 flex flex-col items-center justify-center h-full w-full bg-slate-50 dark:bg-slate-700">
                            <span className="text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm leading-snug line-clamp-2 uppercase tracking-wide">
                              {v.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Venue Metadata */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight line-clamp-1">
                            {v.name}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isMaintenance 
                              ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400"
                              : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400"
                          }`}>
                            {isMaintenance ? "Maintenance" : "Available"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                          {formatVenueLocation(v)}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                          Min {v.min_capacity || 1} • Max {v.max_capacity || v.capacity || venueInfo.capacity || 80}
                        </p>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div className="mt-3.5">
                      {isMaintenance ? (
                        <button
                          disabled
                          className="w-full h-9 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold flex items-center justify-center opacity-90 cursor-not-allowed"
                        >
                          Maintenance
                        </button>
                      ) : isSelected ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectVenue(v); }}
                          className="w-full h-9 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                        >
                          Selected
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectVenue(v); }}
                          className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Select
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
                disabled={safeVenuePage === 0}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Prev
              </button>

              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                {safeVenuePage + 1} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setVenuePage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safeVenuePage >= totalPages - 1}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Date & Time Selection Panel */}
        <div className="lg:col-span-5 sm:col-span-12 space-y-2 relative z-10 mt-4 lg:mt-0">
          {/* Operating Schedule Notice */}
          <p className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
            Schedule: {dynamicSchedule}
          </p>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4 static lg:sticky lg:top-24 z-10">

            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Schedule
              </h4>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs text-right">
                {selectedVenue ? selectedVenue.name : "None"}
              </span>
            </div>

            {/* Multi-Day Reservation Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Multi-Day
              </span>
              <IosToggle
                checked={isMultiDay}
                onChange={(next) => {
                  setIsMultiDay(next);
                  if (!next && selectedDate && setSelectedEndDate) {
                    setSelectedEndDate(selectedDate);
                  }
                }}
                size="md"
              />
            </div>

            {/* Interactive Calendar Container */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
              {/* Header: < Month Year > */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                >
                  &lt;
                </button>

                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {monthLabel}
                </span>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
                >
                  &gt;
                </button>
              </div>

              {/* Day of Week Headers (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 dark:text-slate-400">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
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

                  const isBooked = info.status === "booked" || info.status === "fully" || info.status === "partial";
                  const isMaintenance = info.status === "maintenance";
                  const isClosed = info.status === "closed";
                  const isDisabled = isPast || isPublicBlockedNotice || isMaintenance || isClosed || isBooked;

                  return (
                    <div
                      key={day}
                      className={`relative h-9 flex items-center justify-center ${hasRange && isInBetween
                          ? "bg-blue-50 dark:bg-blue-950/40"
                          : hasRange && (isStart || isEnd)
                            ? "bg-blue-50 dark:bg-blue-950/40"
                            : ""
                        }`}
                    >
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;

                          if (!isMultiDay) {
                            handleDateSelect(dateStr);
                            if (setSelectedEndDate) setSelectedEndDate(dateStr);
                          } else {
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

                          if (isPortal && isShortNotice && !isPinVerified) {
                            setPinModalMeta && setPinModalMeta({
                              title: "Verification Pin",
                              description: `Early date [${dateStr}] need authorized admin verification pin.`,
                            });
                            setShowPinModal && setShowPinModal(true);
                          }
                        }}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center mx-auto transition-colors relative z-10 ${
                          isStart || isEnd
                            ? "bg-blue-600 text-white font-bold cursor-pointer"
                            : isToday
                              ? "border border-blue-600 text-blue-700 dark:text-blue-400 font-bold bg-blue-50/40 dark:bg-blue-500/10 cursor-pointer"
                              : isClosed
                                ? "border border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold cursor-not-allowed"
                                : isMaintenance
                                  ? "border border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold cursor-not-allowed"
                                  : isBooked
                                    ? "border border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold cursor-not-allowed"
                                    : isShortNotice
                                      ? `border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-800/40 ${isPublicBlockedNotice ? "cursor-not-allowed opacity-80" : "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"}`
                                      : isPast
                                        ? "text-slate-300 dark:text-slate-600 font-normal cursor-not-allowed select-none"
                                        : "border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/20 dark:bg-emerald-950/20 text-slate-700 dark:text-slate-200 font-medium hover:bg-emerald-100/50 cursor-pointer"
                        }`}
                      >
                        <span className="relative">
                          {day}
                          {isClosed && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-600" />
                          )}
                          {isBooked && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                          )}
                          {isMaintenance && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                          {!isClosed && !isBooked && !isMaintenance && !isPast && !isShortNotice && !isToday && !isStart && !isEnd && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Calendar Quick Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Available</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">Booked</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                  <span className="text-rose-700 dark:text-rose-400 font-semibold">Closed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">Maintenance</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  <span>Selected</span>
                </span>
              </div>
            </div>

            {/* Time Controls: Start | End */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Start</label>
                <CustomTimePicker
                  value={timeStart || "08:00"}
                  onChange={(val) => setTimeStart(val)}
                  minuteStep={5}
                  align="left"
                  dropUp
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">End</label>
                <CustomTimePicker
                  value={timeEnd || "10:00"}
                  onChange={(val) => setTimeEnd(val)}
                  minuteStep={5}
                  align="right"
                  dropUp
                />
              </div>
            </div>

            {selectedDate && timeStart && timeEnd && (
              <div className="space-y-2 pt-1">
                {selectedDateOverride ? (
                  <div className={`p-3.5 border rounded-lg text-xs font-bold space-y-1.5 ${
                    selectedDateOverride.status === "maintenance"
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}>
                    <div className="font-extrabold">
                      <span>{selectedDateOverride.status === "maintenance" ? "Maintenance" : "Closed"}</span>
                    </div>
                    <p className="text-[11px] font-semibold leading-snug">
                      <strong>{selectedVenue?.name}</strong> is unavailable on <strong>{selectedDateOverride.override_date?.substring(0, 10)}</strong>.
                      {selectedDateOverride.notes ? ` Reason: ${selectedDateOverride.notes}` : ""}
                    </p>
                  </div>
                ) : null}
                {isInvalidEndDate ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 space-y-1">
                    <div className="text-rose-700">
                      <span>Invalid</span>
                    </div>
                    <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                      End date ({selectedEndDate}) cannot be earlier than start date ({selectedDate}).
                    </p>
                  </div>
                ) : isInvalidTimeRange ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 space-y-1">
                    <div className="text-rose-700">
                      <span>Invalid</span>
                    </div>
                    <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                      End ({formatTime12(timeEnd)}) must be later than Start ({formatTime12(timeStart)}).
                    </p>
                  </div>
                ) : isPastSelection ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 space-y-1">
                    <div className="text-rose-700">
                      <span>Invalid</span>
                    </div>
                    <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                      Selected start time ({formatTime12(timeStart)}) has passed.
                    </p>
                  </div>
                ) : isConflict ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg text-xs font-bold text-rose-800 space-y-1.5">
                    <div className="text-rose-700 font-extrabold">
                      <span>Reserved</span>
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
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              Hours ({formatTime12(venueOpen)} – {formatTime12(venueClose)})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-normal leading-relaxed">
                            PIN is required for authorization.
                          </p>
                          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                            {isPinVerified ? (
                              <span className="text-xs font-medium text-slate-700">
                                Verified
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (setPinModalMeta) {
                                    setPinModalMeta({
                                      title: "Verification Pin",
                                      description: `Selected booking time (${formatTime12(timeStart)} - ${formatTime12(timeEnd)}) is outside official campus hours. Verification PIN is required.`,
                                    });
                                  }
                                  setShowPinModal && setShowPinModal(true);
                                }}
                                className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold text-xs transition-colors cursor-pointer text-center"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1 mt-2">
                          <div className="font-bold text-rose-900">
                            <span>Hours</span>
                          </div>
                          <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                            Must be scheduled within Operating Hours [ {formatTime12(venueOpen)} - {formatTime12(venueClose)} ].
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
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-2.5 rounded-lg font-semibold text-xs cursor-pointer shrink-0"
        >
          Back
        </Button>

        <Button
          type="button"
          disabled={!canProceed}
          onClick={() => canProceed && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
