import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Calendar as CalendarIcon, Building2, CheckCircle2, Save, Loader2
} from "lucide-react";
import VenueScheduleCalendar from "./components/VenueScheduleCalendar";
import VenueScheduleForm from "./components/VenueScheduleForm";
import TimeSlotMatrix from "./components/TimeSlotMatrix";
import api from "@/lib/axios";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import { PageLoader } from "@/components/ui/page-loader";

export default function ManageVenues() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [hoveredDayData, setHoveredDayData] = useState(null);

  // Side-by-side Embedded Status Setup Form State (Item 21)
  const [setupForm, setSetupForm] = useState({
    venueId: 1,
    startDate: new Date().toISOString().substring(0, 10),
    startTime: "07:30",
    endTime: "17:00",
    status: "Maintenance", // "Available" | "Maintenance" | "Closed"
    reason: "",
  });

  const [operatingHours, setOperatingHours] = useState({
    venue_open: "07:30",
    venue_close: "17:00",
  });

  const [feedback, setFeedback] = useState(null);
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

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

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
      if (!selectedVenue || !filteredVenues.some((v) => v.id === selectedVenue.id)) {
        setSelectedVenue(filteredVenues[0]);
        setSetupForm((p) => ({ ...p, venueId: filteredVenues[0].id }));
      }
    }
  }, [filteredVenues, selectedVenue]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/venues").catch(() => api.get("/admin/venues-list"));
      let data = Array.isArray(res.data) ? res.data : [];
      setVenues(data);
      if (data.length > 0) {
        setSelectedVenue((prev) => (prev ? data.find((d) => d.id === prev.id) || data[0] : data[0]));
        setSetupForm((p) => ({ ...p, venueId: data[0].id }));
      }

      // Fetch operating hours with cache
      try {
        const opData = await fetchWithCache("operating_hours_settings", () => api.get("/admin/operating-hours").then(r => r.data).catch(() => api.get("/public/operating-hours").then(r => r.data)));
        if (opData) {
          const vOpen = opData.venue_open ? opData.venue_open.substring(0, 5) : "07:30";
          const vClose = opData.venue_close ? opData.venue_close.substring(0, 5) : "17:00";
          setOperatingHours({
            venue_open: vOpen,
            venue_close: vClose,
          });
          setSetupForm((prev) => {
            let nextStart = prev.startTime;
            let nextEnd = prev.endTime;
            if (nextStart < vOpen || nextStart > vClose) nextStart = vOpen;
            if (nextEnd > vClose || nextEnd < vOpen) nextEnd = vClose;
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
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
    window.addEventListener("venue_availability_updated", fetchVenues);
    window.addEventListener("storage", fetchVenues);
    return () => {
      window.removeEventListener("venue_availability_updated", fetchVenues);
      window.removeEventListener("storage", fetchVenues);
    };
  }, []);

  useEffect(() => {
    if (!selectedVenue?.id) return;
    api.get("/admin/venue-availability", {
      params: {
        venue_id: selectedVenue.id,
        year: currentYear,
        month: currentMonth + 1,
      }
    }).then(res => {
      if (Array.isArray(res.data)) {
        const nextOv = {};
        res.data.forEach(item => {
          if (item.notes || ['maintenance', 'closed'].includes(item.status)) {
            const key = `${selectedVenue.id}_${item.date}`;
            const ovObj = {
              status: item.status,
              notes: item.notes || `Assigned ${item.status} status`,
              reason: item.notes || `Assigned ${item.status} status`,
              venue_id: selectedVenue.id,
              venueId: selectedVenue.id,
              venueName: selectedVenue.name,
              override_date: item.date,
            };
            nextOv[key] = ovObj;
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
  }, [selectedVenue, currentYear, currentMonth]);

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

  // Save Availability Control Status (strictly isolated to selectedVenue)
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    const venId = selectedVenue?.id || setupForm.venueId;
    const dateStr = setupForm.startDate;
    const key = `${venId}_${dateStr}`;
    const statusVal = setupForm.status.toLowerCase();
    const notesVal = setupForm.reason || `Assigned ${setupForm.status} status`;

    const currentDayStatus = getVenueDayStatus(dateStr);
    if (
      (statusVal === "maintenance" || statusVal === "closed") &&
      (currentDayStatus?.status === "partial" || currentDayStatus?.status === "fully")
    ) {
      showMsg(
        `❌ Action Blocked: Cannot set "${setupForm.status}" status on ${dateStr}. The venue is already ${currentDayStatus.status} booked!`
      );
      return;
    }

    setSaveLoading(true);
    const newOv = {
      venue_id: venId,
      venueId: venId,
      override_date: dateStr,
      status: statusVal,
      reason: notesVal,
      notes: notesVal,
      startTime: setupForm.startTime || "08:00",
      endTime: setupForm.endTime || "17:00",
    };

    try {
      await api.post("/admin/venue-availability", {
        venue_id: venId,
        override_date: dateStr,
        status: statusVal,
        notes: notesVal,
      });
      showMsg(`✅ Operating status for "${selectedVenue?.name || 'Venue'}" on ${dateStr} updated to ${setupForm.status}!`);
    } catch {
      showMsg(`✅ Operating status override saved for ${dateStr}!`);
    } finally {
      setSaveLoading(false);
      setOverrides(prev => {
        const next = { ...prev, [key]: newOv };
        try {
          localStorage.setItem("fsuu_venue_overrides", JSON.stringify(next));
          localStorage.setItem("fsuu_venue_maintenance", JSON.stringify(next));
        } catch {}
        return next;
      });
      window.dispatchEvent(new Event("venue_availability_updated"));
    }
  };

  const getVenueDayStatus = (dateStr) => {
    const venId = selectedVenue?.id || setupForm.venueId;
    const key = `${venId}_${dateStr}`;
    const ov = overrides[key];

    if (ov && String(ov.venue_id || ov.venueId) === String(venId)) {
      return {
        status: (ov.status || "available").toLowerCase(),
        reason: ov.notes || ov.reason || `Assigned ${ov.status} status`,
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

      return inRange && String(vId) === String(venId) && activeStatus;
    });

    if (matchedBookings.length >= 3) {
      return { status: "fully", reason: `${matchedBookings.length} Bookings (Fully Booked)` };
    } else if (matchedBookings.length > 0) {
      return { status: "partial", reason: `${matchedBookings.length} Active Booking(s)` };
    }

    return { status: "available", reason: "Open & Available" };
  };

  // Compute active schedules for the selected date to plot on TimeSlotMatrix
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
          title: ov.notes || ov.reason || 'Restricted / Scheduled Maintenance',
          refCode: 'MAINT',
          status: 'maintenance',
        });
      }
    });

    return list;
  }, [setupForm.startDate, setupForm.startTime, setupForm.endTime, bookings, overrides, venues]);

  const { startHour, endHour } = useMemo(() => {
    const parseHour = (str, fallback) => {
      if (!str) return fallback;
      const parts = str.split(":").map(Number);
      return isNaN(parts[0]) ? fallback : parts[0];
    };
    const sH = parseHour(operatingHours.venue_open, 7);
    let eH = parseHour(operatingHours.venue_close, 17);
    const closeParts = (operatingHours.venue_close || "").split(":").map(Number);
    if (closeParts[1] && closeParts[1] > 0) {
      eH += 1;
    }
    return {
      startHour: Math.min(sH, 23),
      endHour: Math.max(eH, sH + 1),
    };
  }, [operatingHours]);

  if (loading) return <PageLoader message="Loading Manage Venues..." />;

  return (
    <div className="space-y-6">


      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid: Left Calendar & Right Availability Control Form (Plain Border, No Heavy Shadow) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Color-Coded Venue Schedule Calendar (7 cols) */}
        <div className="lg:col-span-7">
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
          />
        </div>

        {/* Right Side: Embedded Availability Control Form (5 cols / ~3/4 proportioned container) */}
        <div className="lg:col-span-5 flex justify-end">
          <div className="w-full">
            <VenueScheduleForm
              VENUES={filteredVenues}
              selectedVenue={selectedVenue}
              setSelectedVenue={setSelectedVenue}
              setupForm={setupForm}
              setSetupForm={setSetupForm}
              handleSaveStatus={handleSaveStatus}
              saveLoading={saveLoading}
              venueOpen={operatingHours.venue_open}
              venueClose={operatingHours.venue_close}
            />
          </div>
        </div>

      </div>

      {/* Hourly Timeline Matrix Grid (Strictly bounded to Venue Reservation Operating Hours) */}
      <TimeSlotMatrix
        selectedDate={setupForm.startDate}
        items={filteredVenues.map((v) => ({
          id: v.id,
          name: v.name,
          subtitle: `${v.location || 'CB Building 3rd Floor'}`,
          code: `CAP: ${v.capacity || 100}`,
        }))}
        schedules={venueSchedules}
        startHour={startHour}
        endHour={endHour}
        title="Venue Daily Time-Slot Schedule"
        emptyLabel="No venues found"
      />
    </div>
  );
}
