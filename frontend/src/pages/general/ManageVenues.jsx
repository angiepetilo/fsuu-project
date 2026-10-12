import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Calendar as CalendarIcon, Building2, CheckCircle2, Save, Loader2
} from "lucide-react";
import VenueScheduleCalendar from "./components/VenueScheduleCalendar";
import VenueScheduleForm from "./components/VenueScheduleForm";
import TimeSlotMatrix from "./components/TimeSlotMatrix";
import api, { clearApiCache } from "@/lib/axios";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import { PageLoader } from "@/components/ui/page-loader";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { AlertCircle } from "lucide-react";
import notify from "@/lib/notify";
import { getEquipmentBlockMessage } from "@/lib/dateUtils";

const pad = (n) => String(n).padStart(2, "0");

const getLocalDateString = (d = new Date()) => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const normalizeDateStr = (raw) => {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    }
    return s.split("T")[0];
  }
  return s.substring(0, 10);
};

export default function ManageVenues() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);


  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [hoveredDayData, setHoveredDayData] = useState(null);

  // Side-by-side Embedded Status Setup Form State (Item 21)
  const [venueForm, setVenueForm] = useState({
    venueId: 1,
    applyToAll: false,
    closeEquipment: false,
    isMultiDay: false,
    startDate: getLocalDateString(),
    endDate: "",
    startTime: "07:30",
    endTime: "17:00",
    status: "Available", // "Available" | "Maintenance" | "Closed"
    reason: "",
  });

  const [equipmentForm, setEquipmentForm] = useState({
    isMultiDay: false,
    startDate: getLocalDateString(),
    endDate: "",
    startTime: "07:30",
    endTime: "17:00",
    status: "Available", // "Available" | "Maintenance" | "Closed"
    reason: "",
  });

  const [activeMode, setActiveMode] = useState("venue"); // "venue" | "equipment"

  const setupForm = activeMode === "equipment" ? equipmentForm : venueForm;
  const setSetupForm = (updater) => {
    if (activeMode === "equipment") {
      setEquipmentForm((prev) => (typeof updater === "function" ? updater(prev) : updater));
    } else {
      setVenueForm((prev) => (typeof updater === "function" ? updater(prev) : updater));
    }
  };

  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [equipBorrows, setEquipBorrows] = useState([]);
  const [equipOverrides, setEquipOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_equipment_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [operatingHours, setOperatingHours] = useState({
    venue_open: "07:30",
    venue_close: "17:00",
    equipment_open: "07:30",
    equipment_close: "17:00",
  });

  const handleModeChange = (newMode) => {
    setActiveMode(newMode);
    if (newMode === "equipment") {
      const curDate = venueForm.startDate || getLocalDateString();
      const eqOv = equipOverrides[curDate];
      const eqStatus = eqOv ? (eqOv.status === "closed" ? "Closed" : "Maintenance") : "Available";
      setEquipmentForm({
        isMultiDay: false,
        startDate: curDate,
        endDate: "",
        startTime: eqOv?.startTime || eqOv?.start_time || operatingHours.equipment_open || "07:30",
        endTime: eqOv?.endTime || eqOv?.end_time || operatingHours.equipment_close || "17:00",
        status: eqStatus,
        reason: eqStatus === "Available" ? "" : (eqOv?.notes || eqOv?.reason || ""),
      });
      setVenueForm((prev) => ({
        ...prev,
        isMultiDay: false,
        endDate: "",
      }));
    } else {
      const curDate = equipmentForm.startDate || getLocalDateString();
      const isAll = venueForm.applyToAll || venueForm.venueId === "all";
      const venId = isAll ? "all" : (selectedVenue?.id || venueForm.venueId);
      const key = isAll ? `all_${curDate}` : `${venId}_${curDate}`;
      const vOv = overrides[key];
      const vStatus = vOv ? (vOv.status === "closed" ? "Closed" : "Maintenance") : "Available";
      setVenueForm((prev) => ({
        ...prev,
        isMultiDay: false,
        startDate: curDate,
        endDate: "",
        status: vStatus,
        startTime: vOv?.startTime || vOv?.start_time || operatingHours.venue_open || "07:30",
        endTime: vOv?.endTime || vOv?.end_time || operatingHours.venue_close || "17:00",
        reason: vStatus === "Available" ? "" : (vOv?.notes || vOv?.reason || ""),
      }));
      setEquipmentForm((prev) => ({
        ...prev,
        isMultiDay: false,
        endDate: "",
      }));
    }
  };

  const [saveLoading, setSaveLoading] = useState(false);
  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_venue_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [bookings, setBookings] = useState([]);

  const selectedOfficeId = context?.selectedOfficeId;
  const selectedOfficeName = context?.selectedOffice || officeScope;

  const filteredVenues = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return venues;
    return venues.filter((v) => {
      const offId = v.office_id || v.office?.id;
      const offName = v.office?.name || v.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [venues, selectedOfficeId, selectedOfficeName]);

  useEffect(() => {
    if (filteredVenues.length > 0) {
      setSelectedVenue((prev) => {
        if (!prev || !filteredVenues.some((v) => v.id === prev.id)) {
          setVenueForm((p) => ({ ...p, venueId: filteredVenues[0].id }));
          return filteredVenues[0];
        }
        return prev;
      });
    }
  }, [filteredVenues]);

  const fetchVenues = useCallback(async (opts = false) => {
    if (!hasPermission("manage_venues")) {
      setLoading(false);
      return;
    }
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent && venues.length === 0) setLoading(true);
    try {
      const res = await api.get("/general/venues").catch(() => api.get("/general/venues-list"));
      let data = Array.isArray(res.data) ? res.data : [];
      setVenues(data);
      if (data.length > 0) {
        setSelectedVenue((prev) => (prev ? data.find((d) => d.id === prev.id) || data[0] : data[0]));
        setVenueForm((p) => ({ ...p, venueId: data[0].id }));
      }

      // Fetch operating hours with cache
      try {
        const opData = await fetchWithCache("operating_hours_settings", () => api.get("/general/operating-hours").then(r => r.data).catch(() => api.get("/public/operating-hours").then(r => r.data)));
        if (opData) {
          const vOpen = opData.venue_open ? opData.venue_open.substring(0, 5) : "07:00";
          const vClose = opData.venue_close ? opData.venue_close.substring(0, 5) : "17:00";
          const eqOpen = opData.kiosk_open || opData.equipment_open ? (opData.kiosk_open || opData.equipment_open).substring(0, 5) : vOpen;
          const eqClose = opData.kiosk_close || opData.equipment_close ? (opData.kiosk_close || opData.equipment_close).substring(0, 5) : vClose;
          setOperatingHours({
            venue_open: vOpen,
            venue_close: vClose,
            equipment_open: eqOpen,
            equipment_close: eqClose,
          });
          setVenueForm((prev) => {
            let nextStart = prev.startTime;
            let nextEnd = prev.endTime;
            if (nextStart < vOpen || nextStart > vClose) nextStart = vOpen;
            if (nextEnd > vClose || nextEnd < vOpen) nextEnd = vClose;
            return { ...prev, startTime: nextStart, endTime: nextEnd };
          });
          setEquipmentForm((prev) => {
            let nextStart = prev.startTime;
            let nextEnd = prev.endTime;
            if (nextStart < eqOpen || nextStart > eqClose) nextStart = eqOpen;
            if (nextEnd > eqClose || nextEnd < eqOpen) nextEnd = eqClose;
            return { ...prev, startTime: nextStart, endTime: nextEnd };
          });
        }
      } catch {}

      // Fetch bookings for dynamic calendar density
      try {
        const bookingsRes = await api.get("/avr-venue-bookings").catch(() => ({ data: [] }));
        const rawB = bookingsRes.data?.data || bookingsRes.data || [];
        let bData = Array.isArray(rawB) ? rawB : [];
        setBookings(bData);
      } catch {}

      // Fetch equipment catalog types for Equipment Borrowing timeline matrix
      try {
        const eqTypesRes = await api.get("/general/equipment-types").catch(() => ({ data: [] }));
        setEquipmentTypes(Array.isArray(eqTypesRes.data) ? eqTypesRes.data : []);
      } catch {}

      // Fetch equipment borrowings for Equipment Borrowing timeline matrix
      try {
        const eqBorrowsRes = await api.get("/avr-equipment-borrowings").catch(() => ({ data: [] }));
        const rawEB = eqBorrowsRes.data?.data || eqBorrowsRes.data || [];
        setEquipBorrows(Array.isArray(rawEB) ? rawEB : []);
      } catch {}
    } catch {
      if (!isSilent) notify.error("Fetch Error", "Error fetching venues list.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [venues.length]);

  useRealtimeSync(fetchVenues, {
    interval: 30000,
    customEvents: ["venue_availability_updated", "equipment_availability_updated", "venues_updated", "operating_hours_updated"],
  });

  const fetchAvailability = useCallback(() => {
    const isAll = setupForm.applyToAll || setupForm.venueId === "all";
    const vId = isAll ? "all" : (selectedVenue?.id || setupForm.venueId);

    // Fetch Venue Availability
    if (vId) {
      api.get("/general/venue-availability", {
        params: {
          venue_id: vId,
          year: currentYear,
          month: currentMonth + 1,
        }
      }).then(res => {
        if (Array.isArray(res.data)) {
          const nextOv = {};
          res.data.forEach(item => {
            if (item.notes || ['maintenance', 'closed', 'damaged'].includes(item.status)) {
              if (isAll) {
                filteredVenues.forEach(v => {
                  const key = `${v.id}_${item.date}`;
                  nextOv[key] = {
                    status: item.status === 'damaged' ? 'maintenance' : item.status,
                    notes: item.notes || `Assigned ${item.status} status`,
                    reason: item.notes || `Assigned ${item.status} status`,
                    venue_id: v.id,
                    venueId: v.id,
                    venueName: v.name,
                    override_date: item.date,
                    startTime: item.start_time || "07:30",
                    endTime: item.end_time || "17:00",
                  };
                });
              } else if (selectedVenue?.id) {
                const key = `${selectedVenue.id}_${item.date}`;
                nextOv[key] = {
                  status: item.status === 'damaged' ? 'maintenance' : item.status,
                  notes: item.notes || `Assigned ${item.status} status`,
                  reason: item.notes || `Assigned ${item.status} status`,
                  venue_id: selectedVenue.id,
                  venueId: selectedVenue.id,
                  venueName: selectedVenue.name,
                  override_date: item.date,
                  startTime: item.start_time || "07:30",
                  endTime: item.end_time || "17:00",
                };
              }
            }
          });

          setOverrides(prev => {
            const merged = { ...prev, ...nextOv };
            try {
              localStorage.setItem("fsuu_venue_overrides", JSON.stringify(merged));
              localStorage.setItem("fsuu_venue_maintenance", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }).catch(() => {});
    }

    // Fetch Equipment Availability
    api.get("/general/equipment-availability", {
      params: {
        year: currentYear,
        month: currentMonth + 1,
      }
    }).then(res => {
      if (Array.isArray(res.data)) {
        const nextEq = {};
        res.data.forEach(item => {
          const d = normalizeDateStr(item.override_date);
          if (d && (item.status === "closed" || item.status === "maintenance")) {
            nextEq[d] = {
              override_date: d,
              status: item.status,
              notes: item.notes || `Equipment borrowing ${item.status}`,
              startTime: item.start_time || "07:30",
              endTime: item.end_time || "17:00",
            };
          }
        });

        setEquipOverrides(prev => {
          const currentMonthPrefix = `${currentYear}-${pad(currentMonth + 1)}`;
          const cleaned = {};
          Object.keys(prev).forEach(k => {
            if (!k.startsWith(currentMonthPrefix)) {
              cleaned[k] = prev[k];
            }
          });
          const merged = { ...cleaned, ...nextEq };
          try {
            localStorage.setItem("fsuu_equipment_overrides", JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    }).catch(() => {});
  }, [setupForm.applyToAll, setupForm.venueId, selectedVenue?.id, selectedVenue?.name, currentYear, currentMonth, filteredVenues]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    const handleAvailUpdate = () => fetchAvailability();
    window.addEventListener("venue_availability_updated", handleAvailUpdate);
    window.addEventListener("equipment_availability_updated", handleAvailUpdate);
    return () => {
      window.removeEventListener("venue_availability_updated", handleAvailUpdate);
      window.removeEventListener("equipment_availability_updated", handleAvailUpdate);
    };
  }, [fetchAvailability]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else setCurrentMonth(m => m + 1);
  };

  // Days calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Save Availability Control Status
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    const startDateStr = setupForm.startDate;
    const endDateStr = (setupForm.isMultiDay && setupForm.endDate && setupForm.endDate >= startDateStr)
      ? setupForm.endDate
      : startDateStr;

    // Generate list of dates in range
    const targetDates = [];
    if (!setupForm.isMultiDay || !setupForm.endDate || setupForm.endDate === startDateStr) {
      targetDates.push(startDateStr);
    } else {
      const [sy, sm, sd] = startDateStr.split("-").map(Number);
      const [ey, em, ed] = endDateStr.split("-").map(Number);
      const cur = new Date(sy, sm - 1, sd, 12, 0, 0);
      const end = new Date(ey, em - 1, ed, 12, 0, 0);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = pad(cur.getMonth() + 1);
        const d = pad(cur.getDate());
        targetDates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    }

    const statusVal = setupForm.status.toLowerCase();
    const notesVal = setupForm.reason || `Assigned ${setupForm.status} status`;

    // 1. If in Equipment Borrowing mode: ONLY updates Equipment Borrowing availability
    if (activeMode === "equipment") {
      setSaveLoading(true);
      const nextEquipOverrides = { ...equipOverrides };
      try {
        for (const d of targetDates) {
          if (statusVal === "available") {
            delete nextEquipOverrides[d];
          } else {
            nextEquipOverrides[d] = {
              override_date: d,
              status: statusVal,
              notes: notesVal,
              start_time: setupForm.startTime || "07:30",
              end_time: setupForm.endTime || "17:00",
              startTime: setupForm.startTime || "07:30",
              endTime: setupForm.endTime || "17:00",
              isMultiDay: Boolean(setupForm.isMultiDay && setupForm.endDate && setupForm.endDate > setupForm.startDate),
              range_start: startDateStr,
              range_end: endDateStr,
              startDate: startDateStr,
              endDate: endDateStr,
            };
          }

          await api.post("/general/equipment-availability", {
            override_date: d,
            status: statusVal,
            start_time: setupForm.startTime || "07:30",
            end_time: setupForm.endTime || "17:00",
            notes: notesVal,
          }).catch(() => {});
        }

        notify.success(
          "Equipment Status Updated",
          `Equipment borrowing status set to "${setupForm.status}" across ${targetDates.length} date(s)!`
        );
      } catch {
        notify.success("Equipment Status Updated", "Operating status override saved successfully.");
      } finally {
        setSaveLoading(false);
        setEquipOverrides(nextEquipOverrides);
        setEquipmentForm((prev) => ({
          ...prev,
          isMultiDay: false,
          endDate: "",
        }));
        try {
          localStorage.setItem("fsuu_equipment_overrides", JSON.stringify(nextEquipOverrides));
        } catch {}
        clearApiCache();
        invalidateCache("equipment");
        window.dispatchEvent(new Event("equipment_availability_updated"));
        fetchAvailability();
      }
      return;
    }

    // 2. If in Venue Booking mode: ONLY updates Venue Booking availability
    const isAll = setupForm.applyToAll || setupForm.venueId === "all";
    const venId = isAll ? "all" : (selectedVenue?.id || setupForm.venueId);

    // Conflict check (only block when single venue has bookings and setting maintenance/closed)
    if (!isAll) {
      for (const d of targetDates) {
        const currentDayStatus = getVenueDayStatus(d);
        if (
          (statusVal === "maintenance" || statusVal === "closed") &&
          (currentDayStatus?.status === "partial" || currentDayStatus?.status === "fully")
        ) {
          notify.error(
            "Action Blocked",
            `Cannot set "${setupForm.status}" status on ${d}. The venue is already ${currentDayStatus.status} booked!`
          );
          return;
        }
      }
    }

    setSaveLoading(true);
    const nextOverrides = { ...overrides };

    try {
      for (const d of targetDates) {
        if (isAll) {
          const allK = `all_${d}`;
          if (statusVal === "available") {
            delete nextOverrides[allK];
          } else {
            nextOverrides[allK] = {
              venue_id: null,
              venueId: "all",
              venueName: "All Venues",
              override_date: d,
              status: statusVal,
              reason: notesVal,
              notes: notesVal,
              startTime: setupForm.startTime || "07:30",
              endTime: setupForm.endTime || "17:00",
            };
          }

          filteredVenues.forEach((v) => {
            const k = `${v.id}_${d}`;
            if (statusVal === "available") {
              delete nextOverrides[k];
            } else {
              nextOverrides[k] = {
                venue_id: v.id,
                venueId: v.id,
                venueName: v.name,
                override_date: d,
                status: statusVal,
                reason: notesVal,
                notes: notesVal,
                startTime: setupForm.startTime || "07:30",
                endTime: setupForm.endTime || "17:00",
              };
            }
          });
        } else {
          const k = `${venId}_${d}`;
          if (statusVal === "available") {
            delete nextOverrides[k];
          } else {
            nextOverrides[k] = {
              venue_id: venId,
              venueId: venId,
              venueName: selectedVenue?.name || "Venue",
              override_date: d,
              status: statusVal,
              reason: notesVal,
              notes: notesVal,
              startTime: setupForm.startTime || "07:30",
              endTime: setupForm.endTime || "17:00",
            };
          }
        }

        await api.post("/general/venue-availability", {
          venue_id: venId,
          override_date: d,
          status: statusVal,
          notes: notesVal,
          start_time: setupForm.startTime || "07:30",
          end_time: setupForm.endTime || "17:00",
          close_equipment: false,
        }).catch(() => {});
      }

      notify.success(
        "Status Updated",
        isAll
          ? `Operating status updated for all venues across ${targetDates.length} date(s)!`
          : `Operating status for "${selectedVenue?.name || 'Venue'}" updated across ${targetDates.length} date(s)!`
      );
    } catch {
      notify.success(
        "Status Updated",
        "Operating status override saved successfully."
      );
    } finally {
      setSaveLoading(false);
      setOverrides(nextOverrides);
      setVenueForm((prev) => ({
        ...prev,
        isMultiDay: false,
        endDate: "",
      }));
      try {
        localStorage.setItem("fsuu_venue_overrides", JSON.stringify(nextOverrides));
        localStorage.setItem("fsuu_venue_maintenance", JSON.stringify(nextOverrides));
        localStorage.setItem("fsuu_venue_availability_ping", Date.now().toString());
      } catch {}
      clearApiCache();
      invalidateCache("venue");
      window.dispatchEvent(new Event("venue_availability_updated"));
      fetchAvailability();
    }
  };

  const getVenueDayStatus = (dateStr) => {
    // If in Equipment Borrowing mode: show Equipment availability & borrows
    if (activeMode === "equipment") {
      const eqOv = equipOverrides[dateStr];
      if (eqOv) {
        const st = (eqOv.status || "available").toLowerCase();
        if (st === "closed" || st === "maintenance") {
          const blockMsg = getEquipmentBlockMessage(
            eqOv,
            dateStr,
            equipOverrides,
            operatingHours.equipment_open,
            operatingHours.equipment_close
          );
          return {
            status: st,
            reason: blockMsg || eqOv.notes || eqOv.reason || `Equipment Borrowing ${st === "closed" ? "Closed" : "Maintenance"}`,
            override: eqOv,
          };
        }
      }

      // Check active equipment borrowings
      const matchedBorrows = equipBorrows.filter((b) => {
        let bDate = b.date_of_usage || b.date_of_use || b.date || b.start_datetime || "";
        if (bDate.includes("T")) bDate = bDate.split("T")[0];
        const activeStatus = ['pending', 'approved', 'ongoing', 'on-going', 'reserved'].includes((b.status || '').toLowerCase());
        return bDate === dateStr && activeStatus;
      });

      if (matchedBorrows.length > 0) {
        return { status: "booked", reason: `${matchedBorrows.length} Equipment Borrowing(s) (Borrowed)` };
      }

      return { status: "available", reason: "Open & Available" };
    }

    // Venue Booking mode:
    const isAll = setupForm.applyToAll || setupForm.venueId === "all";

    if (isAll && filteredVenues.length > 0) {
      const activeOverrides = filteredVenues.map(v => overrides[`${v.id}_${dateStr}`]).filter(Boolean);
      if (activeOverrides.length > 0) {
        const hasClosed = activeOverrides.some(o => o.status === "closed");
        const hasMaint = activeOverrides.some(o => o.status === "maintenance" || o.status === "damaged");
        return {
          status: hasClosed ? "closed" : (hasMaint ? "maintenance" : "available"),
          reason: activeOverrides.length >= filteredVenues.length
            ? `All venues ${hasClosed ? "Closed" : "Maintenance"}`
            : `${activeOverrides.length} venue(s) restricted`,
          override: activeOverrides[0],
        };
      }
    }

    const venId = selectedVenue?.id || venueForm.venueId;
    const key = `${venId}_${dateStr}`;
    const ov = overrides[key];

    if (ov && String(ov.venue_id || ov.venueId) === String(venId)) {
      return {
        status: (ov.status || "available").toLowerCase(),
        reason: ov.notes || ov.reason || `Assigned ${ov.status} status`,
        override: ov,
      };
    }

    // Check bookings for selected venue on dateStr (including multi-day spans)
    const matchedBookings = bookings.filter((b) => {
      let startD = b.date_of_usage || b.date_of_use || b.date || b.start_datetime || "";
      if (startD.includes("T")) startD = startD.split("T")[0];
      
      let endD = b.reservation_end_date || b.date_of_usage_end || b.end_date || b.end_datetime || startD;
      if (endD.includes("T")) endD = endD.split("T")[0];

      const vId = b.venue_id || b.venue?.id;
      const activeStatus = ['pending', 'approved', 'ongoing', 'reserved'].includes((b.status || '').toLowerCase());
      const inRange = startD && (dateStr >= startD && dateStr <= endD);

      return inRange && (isAll || String(vId) === String(venId)) && activeStatus;
    });

    if (matchedBookings.length > 0) {
      return { status: "booked", reason: `${matchedBookings.length} Booking(s) (Booked)` };
    }

    return { status: "available", reason: "Open & Available" };
  };

  // Compute active schedules for the selected date to plot on TimeSlotMatrix for Venues
  const venueSchedules = useMemo(() => {
    const selectedDateStr = setupForm.startDate;
    if (!selectedDateStr) return [];

    const list = [];

    // 1. Add active bookings for the selected date (including multi-day spans)
    bookings.forEach((b) => {
      let startD = b.date_of_usage || b.date_of_use || b.date || b.start_datetime || "";
      if (startD.includes("T")) startD = startD.split("T")[0];

      let endD = b.reservation_end_date || b.date_of_usage_end || b.end_date || b.end_datetime || startD;
      if (endD.includes("T")) endD = endD.split("T")[0];
      
      const inRange = startD && (selectedDateStr >= startD && selectedDateStr <= endD);

      if (inRange) {
        const vId = b.venue_id || b.venue?.id;
        const st = (b.status || "pending").toLowerCase();
        if (['pending', 'approved', 'ongoing', 'reserved'].includes(st)) {
          const rawStart = b.time_start || b.start_time || (b.start_datetime ? b.start_datetime.split("T")[1]?.substring(0, 5) : "08:00");
          const rawEnd = b.time_end || b.end_time || (b.end_datetime ? b.end_datetime.split("T")[1]?.substring(0, 5) : "12:00");

          list.push({
            id: `bk-${b.id}`,
            itemId: vId,
            startTime: rawStart,
            endTime: rawEnd,
            filerName: b.filer_name || b.requestor_name || "Requestor",
            title: b.event_title || b.purpose || "Venue Reservation",
            refCode: b.tracking_number?.reference_code || b.reference_code,
            status: st,
          });
        }
      }
    });

    // 2. Add maintenance / overrides strictly for matching venue ID on the selected date
    venues.forEach((v) => {
      const key = `${v.id}_${selectedDateStr}`;
      const ov = overrides[key];
      if (
        ov &&
        String(ov.venue_id || ov.venueId) === String(v.id) &&
        (ov.status === 'maintenance' || ov.status === 'closed')
      ) {
        list.push({
          id: `ov-${v.id}-${selectedDateStr}`,
          itemId: v.id,
          startTime: ov.startTime || setupForm.startTime || "08:00",
          endTime: ov.endTime || setupForm.endTime || "17:00",
          filerName: ov.status === 'closed' ? 'Closed' : 'Maintenance',
          title: ov.notes || ov.reason || (ov.status === 'closed' ? 'Venue Closed' : 'Restricted / Scheduled Maintenance'),
          refCode: ov.status === 'closed' ? 'CLOSED' : 'MAINT',
          status: ov.status,
        });
      }
    });

    return list;
  }, [setupForm.startDate, setupForm.startTime, setupForm.endTime, bookings, overrides, venues]);

  // Compute active schedules for Equipment Borrowing to plot on TimeSlotMatrix
  const equipmentSchedules = useMemo(() => {
    const selectedDateStr = setupForm.startDate;
    if (!selectedDateStr) return [];

    const list = [];

    // 1. Add active equipment borrows for selected date
    equipBorrows.forEach((b) => {
      let startD = b.date_of_usage || b.date_of_use || b.date || b.start_datetime || "";
      if (startD.includes("T")) startD = startD.split("T")[0];

      let endD = b.reservation_end_date || b.date_of_usage_end || b.end_date || b.end_datetime || startD;
      if (endD.includes("T")) endD = endD.split("T")[0];

      const inRange = startD && (selectedDateStr >= startD && selectedDateStr <= endD);

      if (inRange) {
        const st = (b.status || "pending").toLowerCase();
        if (['pending', 'approved', 'ongoing', 'on-going', 'reserved'].includes(st)) {
          const rawStart = b.time_start || b.start_time || (b.start_datetime ? b.start_datetime.split("T")[1]?.substring(0, 5) : "08:00");
          const rawEnd = b.time_end || b.end_time || (b.end_datetime ? b.end_datetime.split("T")[1]?.substring(0, 5) : "17:00");
          const items = Array.isArray(b.items) && b.items.length > 0 ? b.items : [{ equipment_type_id: b.equipment_type_id }];

          items.forEach((it, idx) => {
            const tId = it.equipment_type_id || it.equipment_type?.id;
            if (tId) {
              list.push({
                id: `eb-${b.id}-${idx}`,
                itemId: tId,
                startTime: rawStart,
                endTime: rawEnd,
                filerName: b.filer_name || b.requestor_name || `${b.first_name || ''} ${b.last_name || ''}`.trim() || "Borrower",
                title: `${b.purpose || "Equipment Borrow"} (${it.quantity_requested || it.quantity || 1} units)`,
                refCode: b.tracking_number?.reference_code || b.reference_code,
                status: st,
              });
            }
          });
        }
      }
    });

    // 2. Add maintenance / closure for equipment on selected date
    const eqOv = equipOverrides[selectedDateStr];
    if (eqOv && (eqOv.status === 'maintenance' || eqOv.status === 'closed')) {
      equipmentTypes.forEach((t) => {
        list.push({
          id: `ov-eq-${t.id}-${selectedDateStr}`,
          itemId: t.id,
          startTime: eqOv.startTime || setupForm.startTime || "07:30",
          endTime: eqOv.endTime || setupForm.endTime || "17:00",
          filerName: eqOv.status === 'closed' ? 'Closed' : 'Maintenance',
          title: eqOv.notes || (eqOv.status === 'closed' ? 'Equipment Borrowing Closed' : 'Equipment Scheduled Maintenance'),
          refCode: eqOv.status === 'closed' ? 'CLOSED' : 'MAINT',
          status: eqOv.status,
        });
      });
    }

    return list;
  }, [setupForm.startDate, setupForm.startTime, setupForm.endTime, equipBorrows, equipOverrides, equipmentTypes]);

  const { startHour, endHour } = useMemo(() => {
    const parseHour = (str, fallback) => {
      if (!str) return fallback;
      const parts = str.split(":").map(Number);
      return isNaN(parts[0]) ? fallback : parts[0];
    };
    const sH = parseHour(activeMode === "equipment" ? operatingHours.equipment_open : operatingHours.venue_open, 7);
    let eH = parseHour(activeMode === "equipment" ? operatingHours.equipment_close : operatingHours.venue_close, 17);
    // TimeSlotMatrix iterates `h < endHour`. To include the 5:00 PM (17:00) slot, endHour must be at least eH + 1 (18).
    const effectiveEnd = Math.max(eH + 1, sH + 1);
    return {
      startHour: Math.min(sH, 23),
      endHour: Math.min(effectiveEnd, 24),
    };
  }, [operatingHours, activeMode]);

  if (!hasPermission("manage_venues")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view or manage Venues.
        </p>
      </div>
    );
  }

  if (loading) return <PageLoader message="Loading Manage Venues..." />;

  return (
    <div className="space-y-6">

      {/* Main Grid: Left Calendar & Right Availability Control Form with Equal Height Stretching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Color-Coded Venue Schedule Calendar (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <VenueScheduleCalendar
            currentMonth={currentMonth}
            currentYear={currentYear}
            monthNames={monthNames}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            firstDayOfWeek={firstDayOfWeek}
            daysInMonth={daysInMonth}
            getVenueDayStatus={getVenueDayStatus}
            setupForm={setupForm}
            setSetupForm={setSetupForm}
            hoveredDayData={hoveredDayData}
            setHoveredDayData={setHoveredDayData}
            activeMode={activeMode}
            venueOpen={operatingHours.venue_open}
            venueClose={operatingHours.venue_close}
            equipmentOpen={operatingHours.equipment_open}
            equipmentClose={operatingHours.equipment_close}
          />
        </div>

        {/* Right Side: Embedded Availability Control Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <VenueScheduleForm
            activeMode={activeMode}
            setActiveMode={handleModeChange}
            VENUES={filteredVenues}
            selectedVenue={selectedVenue}
            setSelectedVenue={setSelectedVenue}
            setupForm={setupForm}
            setSetupForm={setSetupForm}
            handleSaveStatus={handleSaveStatus}
            saveLoading={saveLoading}
            venueOpen={operatingHours.venue_open}
            venueClose={operatingHours.venue_close}
            equipmentOpen={operatingHours.equipment_open}
            equipmentClose={operatingHours.equipment_close}
            overrides={overrides}
            equipOverrides={equipOverrides}
          />
        </div>

      </div>

      {/* Hourly Timeline Matrix Grid (Strictly bounded to Operating Hours) */}
      <TimeSlotMatrix
        selectedDate={setupForm.startDate}
        items={activeMode === "equipment" ? equipmentTypes.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: t.brand?.name || t.category?.name || "Equipment Type",
          code: `QTY: ${t.total_quantity || t.total_units || 0}`,
        })) : filteredVenues.map((v) => ({
          id: v.id,
          name: v.name,
          subtitle: `${v.location || 'CB Building 3rd Floor'}`,
          code: `CAP: ${v.capacity || 100}`,
        }))}
        schedules={activeMode === "equipment" ? equipmentSchedules : venueSchedules}
        startHour={startHour}
        endHour={endHour}
        title={activeMode === "equipment" ? "Borrowed Daily Time-Slot Schedule" : "Venue Daily Time-Slot Schedule"}
        emptyLabel={activeMode === "equipment" ? "No equipment items registered" : "No venues found"}
      />
    </div>
  );
}
