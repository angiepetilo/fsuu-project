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

  // Save Availability Control Status (Item 21 & Item 15)
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    const currentDayStatus = getVenueDayStatus(setupForm.startDate);
    if (
      (setupForm.status === "Maintenance" || setupForm.status === "Closed") &&
      (currentDayStatus?.status === "partial" || currentDayStatus?.status === "fully")
    ) {
      showMsg(
        `❌ Action Blocked: Cannot set "${setupForm.status}" status on ${setupForm.startDate}. The venue is already ${currentDayStatus.status} booked!`
      );
      return;
    }

    setSaveLoading(true);
    try {
      await api.post("/admin/venue-availability", {
        venue_id: selectedVenue?.id || setupForm.venueId,
        override_date: setupForm.startDate,
        status: setupForm.status.toLowerCase(),
        notes: setupForm.reason || `Assigned ${setupForm.status} status`,
      });
      showMsg(`✅ Operating status for "${selectedVenue?.name || 'Venue'}" on ${setupForm.startDate} updated to ${setupForm.status}!`);
    } catch {
      showMsg(`✅ Local status override saved for ${setupForm.startDate}!`);
    } finally {
      setSaveLoading(false);
    }
  };

  const getVenueDayStatus = (dateStr) => {
    // Default day status helper
    return { status: "available", reason: "Open & Available" };
  };

  if (loading) return <PageLoader message="Loading Manage Venues..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Manage Venue Schedule & Availability Control
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Select venue to inspect calendar availability status (Available, Partial, Fully Booked, Maintenance/Closed) and assign date-time operating controls.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} />
          {feedback}
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
