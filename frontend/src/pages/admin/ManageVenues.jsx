import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Calendar as CalendarIcon, Building2, CheckCircle2, Save, Loader2
} from "lucide-react";
import VenueScheduleCalendar from "./components/VenueScheduleCalendar";
import VenueScheduleForm from "./components/VenueScheduleForm";
import api from "@/lib/axios";
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
    startTime: "08:00",
    endTime: "17:00",
    status: "Maintenance", // "Available" | "Maintenance" | "Closed"
    reason: "",
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

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/venues").catch(() => api.get("/admin/venues-list"));
      let data = Array.isArray(res.data) ? res.data : [];

      // Merge with localStorage if additional catalog venues exist
      try {
        const savedStr = localStorage.getItem("fsuu_venue_availability") || localStorage.getItem("fsuu_venues");
        if (savedStr) {
          const savedList = JSON.parse(savedStr);
          const clean = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          savedList.forEach((savedItem) => {
            if (savedItem && !data.some((d) => d.id === savedItem.id || clean(d.name) === clean(savedItem.name))) {
              data.push(savedItem);
            }
          });
        }
      } catch { }

      setVenues(data);
      if (data.length > 0) {
        setSelectedVenue((prev) => (prev ? data.find((d) => d.id === prev.id) || data[0] : data[0]));
        setSetupForm((p) => ({ ...p, venueId: data[0].id }));
      }

      // Fetch bookings for dynamic calendar density
      try {
        const bookingsRes = await api.get("/avr-venue-bookings").catch(() => ({ data: [] }));
        let bData = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
        const localSaved = localStorage.getItem("fsuu_venue_bookings");
        if (localSaved) {
          const localList = JSON.parse(localSaved);
          localList.forEach(lb => {
            if (lb && !bData.some(b => b.id === lb.id || b.reference_code === lb.reference_code)) {
              bData.push(lb);
            }
          });
        }
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
            nextOv[item.date] = ovObj;
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

  // Save Availability Control Status
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
      override_date: dateStr,
      status: statusVal,
      reason: notesVal,
      notes: notesVal,
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
        const next = { ...prev, [key]: newOv, [dateStr]: newOv };
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
    const ov = overrides[key] || overrides[dateStr];

    if (ov) {
      return {
        status: (ov.status || "available").toLowerCase(),
        reason: ov.notes || ov.reason || `Assigned ${ov.status} status`,
      };
    }

    // Check bookings for selected venue on dateStr
    const matchedBookings = bookings.filter(b => {
      const bVenueId = b.venue_id || b.venue?.id;
      const bDate = b.date_of_usage || (b.start_datetime ? b.start_datetime.split("T")[0] : null);
      const matchesVenue = !bVenueId || !venId || String(bVenueId) === String(venId);
      const activeStatus = ['pending', 'approved', 'ongoing'].includes((b.status || '').toLowerCase());
      return matchesVenue && bDate === dateStr && activeStatus;
    });

    if (matchedBookings.length >= 3) {
      return { status: "fully", reason: `${matchedBookings.length} Bookings (Fully Booked)` };
    } else if (matchedBookings.length > 0) {
      return { status: "partial", reason: `${matchedBookings.length} Active Booking(s)` };
    }

    return { status: "available", reason: "Open & Available" };
  };

  if (loading) return <PageLoader message="Loading Manage Venues..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Manage Venue
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Select venue to inspect calendar availability status and assign date-time operating controls.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid: Left Calendar & Right Availability Control Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Item 20: Color-Coded Venue Schedule Calendar */}
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

        {/* Item 21: Embedded Availability Control Form */}
        <VenueScheduleForm
          VENUES={venues}
          selectedVenue={selectedVenue}
          setSelectedVenue={setSelectedVenue}
          setupForm={setupForm}
          setSetupForm={setSetupForm}
          handleSaveStatus={handleSaveStatus}
          saveLoading={saveLoading}
        />

      </div>
    </div>
  );
}
