import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import api from "@/lib/axios";
import { MetricCard, ContentCard } from "@/components/ui/app-card";
import { Tooltip } from "@/components/ui/tooltip";
import SysadMetricsGrid from "./components/SysadMetricsGrid";
import SysadCalendarWidget from "./components/SysadCalendarWidget";
import SysadActivityTable from "./components/SysadActivityTable";
import SysadDetailModal from "./components/SysadDetailModal";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Building2, PackageOpen, Clock, AlertTriangle, AlertCircle,
  ShieldCheck, Globe, Filter, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Eye, RefreshCw, X, CheckCircle2,
  PieChart, Tag, MapPin, User, Mail, Phone, FileText, LayoutDashboard
} from "lucide-react";

export default function SysadDashboard() {
  const { selectedOffice, setSelectedOffice } = useOutletContext();
  const [timeRange, setTimeRange] = useState("Today");
  const [loading, setLoading] = useState(false);

  // Table Filter: "All" | "Venue" | "Equipment"
  const [typeFilter, setTypeFilter] = useState("All");

  // Selected Record for Details Modal
  const [viewingRecord, setViewingRecord] = useState(null);

  // Side Calendar State (Default to August 2026 for active events display)
  const today = new Date();
  const initialMonth = (today.getFullYear() === 2026 && today.getMonth() === 6) ? 7 : today.getMonth();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(initialMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "short", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");

  const [allVenueBookings, setAllVenueBookings] = useState([]);
  const [activityRecords, setActivityRecords] = useState([]);
  const [campusOffices, setCampusOffices] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_campus_offices");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
      api.get("/avr-equipment-borrowings").catch(() => ({ data: { data: [] } })),
      api.get("/public/offices").catch(() => ({ data: [] })),
    ]).then(([vbRes, ebRes, offRes]) => {
      const vbData = vbRes.data?.data ?? (Array.isArray(vbRes.data) ? vbRes.data : []);
      const ebData = ebRes.data?.data ?? (Array.isArray(ebRes.data) ? ebRes.data : []);
      if (Array.isArray(offRes.data) && offRes.data.length > 0) {
        setCampusOffices(offRes.data);
      }

      setAllVenueBookings(vbData.map(b => ({
        id: b.id,
        venue: { name: b.venue?.name || b.venue_name || "AVR Room", location: b.venue?.location || b.location || "Campus Venue" },
        filer_name: b.filer_name || b.requestor || "FSUU Filer",
        date_of_usage: b.date_of_usage || b.date || "",
        time_start: b.time_start || "08:00:00",
        time_end: b.time_end || "10:00:00",
        status: b.tracking_number?.status?.toLowerCase() || b.status?.toLowerCase() || "approved",
        office: b.venue?.office?.name || b.office || b.office_name || "General Office",
      })));

      const records = [
        ...vbData.map(b => ({
          id: `VB-${b.id}`,
          refNo: b.reference_code || `VB-${b.id}`,
          type: "Venue",
          requestor: b.filer_name || b.name || "FSUU Filer",
          department: b.program_office || b.department || "Academic Dept",
          details: b.venue?.name || b.venue_name || "AVR Auditorium",
          date: b.date_of_usage || "",
          status: b.tracking_number?.status || b.status || "Approved",
          office: b.venue?.office?.name || b.office || b.office_name || "General Office",
          purpose: b.purpose || "Campus Event",
          contact: b.contact_number || "N/A",
          email: b.email || "N/A",
        })),
        ...ebData.map(e => ({
          id: `EB-${e.id}`,
          refNo: e.reference_code || `EB-${e.id}`,
          type: "Equipment",
          requestor: e.borrower_name || e.name || "FSUU Borrower",
          department: e.department || e.office || "Academic Dept",
          details: e.equipment_category || "AV Equipment",
          date: e.date_needed || "",
          status: e.status || "Approved",
          office: e.office?.name || e.office || e.office_name || "General Office",
          purpose: e.purpose || "Classroom Presentation",
          contact: e.contact_number || "N/A",
          email: e.email || "N/A",
        })),
      ];

      setActivityRecords(records);
    }).finally(() => setLoading(false));
  }, []);

  // Filtering Logic
  const filteredTableRecords = activityRecords.filter((rec) => {
    const matchOffice =
      selectedOffice === "All Offices" || rec.office === selectedOffice;

    const matchType =
      typeFilter === "All" ||
      (typeFilter === "Venue" && rec.type === "Venue") ||
      (typeFilter === "Equipment" && rec.type === "Equipment");

    return matchOffice && matchType;
  });

  // Dynamic Metric Calculations from database records
  const totalVenueCount = filteredTableRecords.filter((r) => r.type === "Venue").length;
  const pendingCount = filteredTableRecords.filter((r) => (r.status || "").toLowerCase().includes("pending")).length;
  const totalEquipmentCount = filteredTableRecords.filter((r) => r.type === "Equipment").length;
  const damagedCount = filteredTableRecords.filter((r) => (r.status || "").toLowerCase().includes("damaged")).length;
  const lostCount = filteredTableRecords.filter((r) => (r.status || "").toLowerCase().includes("lost")).length;

  // Calculate department booking breakdown dynamically from database activity records
  const deptCounts = {};
  filteredTableRecords.forEach((rec) => {
    const dept = rec.department || "General";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const totalRecs = filteredTableRecords.length || 1;
  const palette = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

  const topBookedDepartments = Object.entries(deptCounts).map(([name, count], i) => ({
    code: name.slice(0, 4).toUpperCase(),
    name,
    count,
    pct: Math.round((count / totalRecs) * 100),
    color: palette[i % palette.length],
  }));

  const getDayDetails = (dayNum) => {
    const formattedDay = `${calYear}-${pad(calMonth + 1)}-${pad(dayNum)}`;
    const dayBookings = allVenueBookings.filter((b) => b.date_of_usage === formattedDay);
    if (dayBookings.length === 0) {
      return { status: "available", tooltip: `Day ${dayNum}: Available for reservation` };
    } else if (dayBookings.length >= 3) {
      return { status: "fully", tooltip: `Day ${dayNum}: Fully Reserved (${dayBookings.length} events)` };
    } else {
      return { status: "partial", tooltip: `Day ${dayNum}: Partially Booked (${dayBookings.length} event)` };
    }
  };

  if (loading) return <PageLoader message="Loading System Dashboard..." />;

  return (
    <div className="space-y-6">

      {/* Top Header Bar & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutDashboard className="text-blue-600" size={24} />
              System Dashboard Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
              {selectedOffice}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Global management, combined analytics, office reports & inventory filter
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-xs flex items-center gap-2">
            <Filter size={15} className="text-amber-500 ml-1" />
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-extrabold focus:outline-none cursor-pointer pr-2"
            >
              <option value="All Offices">All Offices (Combined)</option>
              {campusOffices.map((office) => (
                <option key={office.id || office.code} value={office.name}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
            {["Today", "Weekly", "Monthly"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === t
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setLoading(true)}
            className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
            title="Refresh System Analytics"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Top Row: Metrics & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <SysadMetricsGrid
            loading={loading}
            selectedOffice={selectedOffice}
            totalVenueCount={totalVenueCount}
            pendingCount={pendingCount}
            totalEquipmentCount={totalEquipmentCount}
            damagedCount={damagedCount}
            lostCount={lostCount}
            filteredTableRecords={filteredTableRecords}
            topBookedDepartments={topBookedDepartments}
          />
        </div>

        {/* Compact Side Venue Availability Calendar Widget (5 cols) */}
        <SysadCalendarWidget
          monthLabel={monthLabel}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          firstDayOfWeek={firstDayOfWeek}
          daysInMonth={daysInMonth}
          getDayDetails={getDayDetails}
        />
      </div>

      {/* Bottom Row: Full-Width Activity Table */}
      <SysadActivityTable
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        filteredTableRecords={filteredTableRecords}
        setViewingRecord={setViewingRecord}
      />

      {/* View Details Modal Sub-Component */}
      <SysadDetailModal
        viewingRecord={viewingRecord}
        setViewingRecord={setViewingRecord}
      />
    </div>
  );
}
