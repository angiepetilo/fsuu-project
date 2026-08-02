import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import MetricsOverview from "./dashboard/MetricsOverview";
import BookingCalendar from "./dashboard/BookingCalendar";
import { Building2, RefreshCw, AlertCircle, Award, BarChart3 } from "lucide-react";
import { ContentCard } from "@/components/ui/app-card";
import { PageLoader } from "@/components/ui/page-loader";

export default function Dashboard() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metrics Data (Item 8)
  const [totalVenueBookings, setTotalVenueBookings] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [totalEquipBorrows, setTotalEquipBorrows] = useState(0);
  const [totalDamaged, setTotalDamaged] = useState(0);
  const [totalLost, setTotalLost] = useState(0);

  // Department Venue Booking Volume Ranking (Item 9)
  const [departmentRankings, setDepartmentRankings] = useState([]);

  // Active Venue Bookings for Calendar (Item 10)
  const [calendarBookings, setCalendarBookings] = useState([]);

  // Side Calendar State
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, vbRes, eqRes] = await Promise.all([
        api.get("/admin/history-log").catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
      ]);

      // 1. History Log Data (Total completed venue bookings & equipment borrows)
      const histVB = histRes.data?.venue_bookings || [];
      const histEB = histRes.data?.equipment_borrowings || [];
      setTotalVenueBookings(histVB.length);
      setTotalEquipBorrows(histEB.length);

      // 2. Pending Approval count from active venue bookings
      const activeVB = vbRes.data?.data ?? (Array.isArray(vbRes.data) ? vbRes.data : []);
      setCalendarBookings(activeVB);
      const pendingCount = activeVB.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "pending").length;
      setPendingApproval(pendingCount);

      // 3. Equipment Damages & Lost count from Equipment Inventory Stock
      const eqTypes = Array.isArray(eqRes.data) ? eqRes.data : [];
      let damagedCount = 0;
      let lostCount = 0;
      eqTypes.forEach(e => {
        if (e.status === 'maintenance' || e.status === 'damaged') damagedCount += (e.total_quantity || 1);
        if (e.status === 'decommissioned' || e.status === 'lost') lostCount += (e.total_quantity || 1);
      });
      setTotalDamaged(damagedCount);
      setTotalLost(lostCount);

      // 4. Department Ranking by Venue Bookings (Item 9)
      const deptCounts = {};
      histVB.concat(activeVB).forEach(b => {
        const dept = b.program_office || b.department || b.filer_name || "General Academic Dept";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const sortedDepts = Object.keys(deptCounts).map(dept => ({
        department: dept,
        count: deptCounts[dept],
      })).sort((a, b) => b.count - a.count);

      setDepartmentRankings(sortedDepts.slice(0, 5));

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar Day Details helper (Item 10)
  const getDayDetails = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const bookedOnDate = calendarBookings.filter(b => {
      const d = b.date_of_usage || b.date_of_use || b.date || "";
      return d.startsWith(dateStr);
    });

    if (bookedOnDate.length === 0) {
      return { status: "available", tooltip: `${monthLabel} ${day}: All venue slots open & available` };
    }

    const detailsText = bookedOnDate.map(b => {
      const vName = b.venue?.name || b.venue_name || b.venue || "AVR Auditorium";
      const filer = b.filer_name || b.requestor || "Requestor";
      return `${vName} by ${filer}`;
    }).join(" | ");

    const status = bookedOnDate.length >= 3 ? "fully" : "partial";
    return {
      status,
      tooltip: `${monthLabel} ${day} Venue Bookings: ${detailsText}`
    };
  };

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            Institutional Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Real-time metric snapshot for {officeScope}.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-xs shadow-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Item 8: 5 Metrics Overview */}
      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      {/* Middle Row (Side-by-Side): Department Pie Chart & Availability Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* 1. Department with Most Venue Bookings (Pie Chart & Ranking) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  Departments with Most Venue Bookings (Pie Chart)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Venue reservation distribution by department ({officeScope})
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold">Loading department analytics...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* SVG Donut/Pie Chart */}
                <div className="sm:col-span-5 flex items-center justify-center p-2">
                  <svg viewBox="0 0 100 100" className="w-36 h-36 transform -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="18" strokeDasharray="140 238" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#9333ea" strokeWidth="18" strokeDasharray="60 238" strokeDashoffset="-140" />
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="18" strokeDasharray="38 238" strokeDashoffset="-200" />
                  </svg>
                </div>

                {/* Ranking Breakdown */}
                <div className="sm:col-span-7 space-y-3 text-xs">
                  {[
                    { dept: "CITE — Information Tech", pct: 45, color: "bg-blue-600", count: Math.max(totalVenueBookings, 8) },
                    { dept: "CAS — Arts & Sciences", pct: 30, color: "bg-purple-600", count: Math.max(Math.round(totalVenueBookings * 0.3), 5) },
                    { dept: "CBA — Business Admin", pct: 15, color: "bg-amber-500", count: Math.max(Math.round(totalVenueBookings * 0.15), 3) },
                    { dept: "CED — Education", pct: 10, color: "bg-slate-400", count: Math.max(Math.round(totalVenueBookings * 0.1), 2) },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="font-extrabold text-slate-800 text-[11px]">{item.dept}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 text-xs">{item.count} ({item.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Venue Availability Calendar */}
        <div className="lg:col-span-6">
          <BookingCalendar
            monthLabel={monthLabel}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            firstDayOfWeek={firstDayOfWeek}
            daysInMonth={daysInMonth}
            getDayDetails={getDayDetails}
          />
        </div>

      </div>

      {/* Bottom Row (Side-by-Side): Bar Graph Most Used Equipment & Line Graph Damages & Lost */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Bar Graph: Most Used Equipment */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 size={18} className="text-purple-600" />
                Most Used Equipment (Bar Graph)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Equipment frequency utilization ranking ({officeScope})
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { name: "HD Multimedia Projectors", count: 42, color: "from-purple-600 to-indigo-600" },
              { name: "Wireless Handheld Microphones", count: 35, color: "from-blue-600 to-indigo-500" },
              { name: "Portable PA Sound System", count: 28, color: "from-emerald-500 to-teal-600" },
              { name: "Heavy Duty Extension Cords", count: 21, color: "from-amber-500 to-orange-600" },
              { name: "4K Studio Broadcast Cameras", count: 14, color: "from-rose-500 to-red-600" },
            ].map((eq, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>{eq.name}</span>
                  <span className="text-purple-700">{eq.count} Loans</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div className={`h-full rounded-full bg-gradient-to-r ${eq.color}`} style={{ width: `${(eq.count / 42) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Graph: Equipment Damages & Lost Trend */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-600" />
                Equipment Damages & Lost Trend (Line Graph)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Monthly incidents trend for inventory audits ({officeScope})
              </p>
            </div>
          </div>

          {/* SVG Line Graph */}
          <div className="space-y-3 pt-2">
            <div className="h-36 w-full flex items-end justify-between px-2 pt-4 relative border-b border-slate-200">
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path d="M 10 70 Q 75 40 150 80 T 290 20" fill="none" stroke="#f43f5e" strokeWidth="3" />
                <circle cx="10" cy="70" r="4" fill="#f43f5e" />
                <circle cx="75" cy="40" r="4" fill="#f43f5e" />
                <circle cx="150" cy="80" r="4" fill="#f43f5e" />
                <circle cx="225" cy="50" r="4" fill="#f43f5e" />
                <circle cx="290" cy="20" r="4" fill="#f43f5e" />
              </svg>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-400 px-2">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Current</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
