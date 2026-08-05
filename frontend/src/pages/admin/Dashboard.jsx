import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import MetricsOverview from "./dashboard/MetricsOverview";
import BookingCalendar from "./dashboard/BookingCalendar";
import {
  Building2, RefreshCw, AlertCircle, Award, BarChart3,
  UserCog, PackageOpen, Box, Sparkles, ArrowRight, FileText,
  LayoutDashboard, Filter
} from "lucide-react";
import { ContentCard } from "@/components/ui/app-card";
import { PageLoader } from "@/components/ui/page-loader";

export default function Dashboard() {
  const context = useOutletContext();
  const { user } = useAuth();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const userRole = typeof user?.role === "object" ? (user?.role?.name || "admin") : (user?.role || "admin");
  const isSuperAdmin = userRole === "super_admin" || context?.isSuperAdmin === true;
  const isStaff = userRole === "staff";
  const userPermissions = user?.permissions || [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metrics Data
  const [totalVenueBookings, setTotalVenueBookings] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [pendingEquipBorrowings, setPendingEquipBorrowings] = useState(0);
  const [totalEquipBorrows, setTotalEquipBorrows] = useState(0);
  const [totalDamaged, setTotalDamaged] = useState(0);
  const [totalLost, setTotalLost] = useState(0);

  // Dynamic Real Analytics Calculations
  const [topBookedDepartments, setTopBookedDepartments] = useState([]);
  const [mostUsedEquipment, setMostUsedEquipment] = useState([]);
  const [topViolatingDepartments, setTopViolatingDepartments] = useState([]);

  // Active Venue Bookings for Calendar & Staff Tasks
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [staffTasks, setStaffTasks] = useState([]);

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
      const [histRes, vbRes, eqRes, ebRes] = await Promise.all([
        api.get("/admin/history-log").catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
        api.get("/avr-equipment-borrowings").catch(() => ({ data: { data: [] } })),
      ]);

      // 1. History Log Data
      const histVB = histRes.data?.venue_bookings || [];
      const histEB = histRes.data?.equipment_borrowings || [];
      setTotalVenueBookings(histVB.length);
      setTotalEquipBorrows(histEB.length);

      // 2. Active Venue Bookings
      const activeVB = vbRes.data?.data ?? (Array.isArray(vbRes.data) ? vbRes.data : []);
      setCalendarBookings(activeVB);
      const pendingCount = activeVB.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "pending").length;
      setPendingApproval(pendingCount);

      // 3. Active Equipment Borrowings
      const activeEB = ebRes.data?.data ?? (Array.isArray(ebRes.data) ? ebRes.data : []);
      const pendingEBCount = activeEB.filter(b => (b.status || b.tracking_number?.status || "").toLowerCase() === "pending").length;
      setPendingEquipBorrowings(pendingEBCount);

      // 4. Equipment Status Counts
      const eqTypes = Array.isArray(eqRes.data) ? eqRes.data : [];
      let damagedCount = 0;
      let lostCount = 0;
      eqTypes.forEach(e => {
        if (e.status === 'maintenance' || e.status === 'damaged') damagedCount += (e.total_quantity || 1);
        if (e.status === 'decommissioned' || e.status === 'lost') lostCount += (e.total_quantity || 1);
      });
      setTotalDamaged(damagedCount);
      setTotalLost(lostCount);

      // 5. Staff Tasks
      const dynamicTasks = [];
      activeEB.forEach(b => {
        const st = (b.status || b.tracking_number?.status || "").toLowerCase();
        let taskName = "Release Equipment";
        let actionLabel = "Process Claim";
        let actionBg = "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200";

        if (st === "ongoing" || st === "approved") {
          taskName = "Inspect Return";
          actionLabel = "Inspect";
          actionBg = "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200";
        } else if (st === "overdue") {
          taskName = "Overdue Follow-up";
          actionLabel = "Follow-up";
          actionBg = "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200";
        }

        dynamicTasks.push({
          id: `eb-${b.id}`,
          tracking_no: b.tracking_number?.code || b.tracking_code || `EQ-${b.id}`,
          borrower: b.requestor_name || b.filer_name || b.user?.name || b.borrower_name || "Borrower",
          equipment: b.equipment_type?.eq_name || b.equipment_name || "Equipment Items",
          time: b.date_of_use || (b.created_at ? b.created_at.substring(0, 10) : "Today"),
          task: taskName,
          action_label: actionLabel,
          action_bg: actionBg,
          link: "/admin/equipment-borrowing",
        });
      });

      activeVB.forEach(b => {
        const st = (b.status || b.tracking_number?.status || "").toLowerCase();
        if (st === "pending") {
          dynamicTasks.push({
            id: `vb-${b.id}`,
            tracking_no: b.tracking_number?.code || b.tracking_code || `AVR-${b.id}`,
            borrower: b.requestor_name || b.filer_name || b.user?.name || "Requestor",
            equipment: b.venue?.name || b.venue_name || "AVR Auditorium",
            time: b.date_of_use || (b.created_at ? b.created_at.substring(0, 10) : "Today"),
            task: "Verify Venue Booking",
            action_label: "Review Venue",
            action_bg: "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200",
            link: "/admin/venue-bookings",
          });
        }
      });
      setStaffTasks(dynamicTasks);

      // 6. Calculate Department Rankings by Venue Bookings (Real Database Data)
      const deptCounts = {};
      const allVBSource = [...histVB, ...activeVB];
      allVBSource.forEach(b => {
        const dept = (b.program_office || b.department || b.user?.department || b.filer_name || "CITE").toUpperCase();
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const totalVB = Object.values(deptCounts).reduce((a, b) => a + b, 0);
      const sortedDepts = Object.entries(deptCounts).map(([name, count]) => ({
        name,
        count,
        pct: totalVB > 0 ? Math.round((count / totalVB) * 100) : 0,
      })).sort((a, b) => b.count - a.count);
      setTopBookedDepartments(sortedDepts);

      // 7. Calculate Most Used Equipment (Real Database Data)
      const equipCounts = {};
      const allEBSource = [...histEB, ...activeEB];
      allEBSource.forEach(e => {
        const eqName = e.equipment_name || e.equipment_type?.eq_name || e.equipment_category || e.details || "AV Equipment";
        equipCounts[eqName] = (equipCounts[eqName] || 0) + 1;
      });

      const sortedEquip = Object.entries(equipCounts).map(([name, count]) => ({
        name,
        count,
      })).sort((a, b) => b.count - a.count);
      setMostUsedEquipment(sortedEquip);

      // 8. Calculate Department Violations (Real Database Data from Reports/Breaches)
      const violationCounts = {};
      const allRecords = [...allVBSource, ...allEBSource];
      allRecords.forEach(r => {
        if (r.has_violation || r.violation || (r.status || "").toLowerCase().includes("damaged") || (r.status || "").toLowerCase().includes("lost") || (r.status || "").toLowerCase().includes("breach")) {
          const dept = (r.program_office || r.department || r.user?.department || "CITE").toUpperCase();
          violationCounts[dept] = (violationCounts[dept] || 0) + 1;
        }
      });

      const sortedViolations = Object.entries(violationCounts).map(([dept, count]) => ({
        dept,
        count,
      })).sort((a, b) => b.count - a.count);
      setTopViolatingDepartments(sortedViolations);

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calendar Day Details helper
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

  // Render Staff Specific Dashboard View (Matching Image 1 Prototype)
  if (isStaff) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AVR Staff Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Your assigned tasks for today's shift.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-extrabold text-xs shadow-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* 4 Top Metric Cards (Image 1 Placement) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: PENDING CLAIMS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING CLAIMS
            </span>
            <div className="mt-3">
              <span className="text-3xl font-black text-amber-600 leading-none">
                {pendingEquipBorrowings}
              </span>
              <p className="text-xs text-slate-400 font-semibold mt-1">Equipment to release</p>
            </div>
          </div>

          {/* Card 2: OVERDUE RETURNS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              OVERDUE RETURNS
            </span>
            <div className="mt-3">
              <span className="text-3xl font-black text-rose-600 leading-none">
                {totalLost}
              </span>
              <p className="text-xs text-slate-400 font-semibold mt-1">Follow-up required</p>
            </div>
          </div>

          {/* Card 3: COMPLETED TODAY */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              COMPLETED TODAY
            </span>
            <div className="mt-3">
              <span className="text-3xl font-black text-emerald-600 leading-none">
                {totalVenueBookings + totalEquipBorrows}
              </span>
              <p className="text-xs text-slate-400 font-semibold mt-1">Borrowings & venue bookings</p>
            </div>
          </div>

          {/* Card 4: PENDING VENUE APPROVAL */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING VENUE APPROVAL
            </span>
            <div className="mt-3">
              <span className="text-3xl font-black text-blue-600 leading-none">
                {pendingApproval}
              </span>
              <p className="text-xs text-slate-400 font-semibold mt-1">Venue requests awaiting action</p>
            </div>
          </div>
        </div>

        {/* Quick Actions (Sleek Plain Design, Normal Text Weight) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action 1: Process Claim */}
            <Link
              to="/admin/equipment-borrowing"
              className="bg-[#f3f4fd] hover:bg-[#e8ebfc] transition-all p-5 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Box size={22} />
              </div>
              <span className="font-semibold text-slate-800 text-xs">Process Claim</span>
            </Link>

            {/* Action 2: Process Return */}
            <Link
              to="/admin/equipment-borrowing"
              className="bg-[#f3f4fd] hover:bg-[#e8ebfc] transition-all p-5 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RefreshCw size={20} />
              </div>
              <span className="font-semibold text-slate-800 text-xs">Process Return</span>
            </Link>

            {/* Action 3: Post Inspect */}
            <Link
              to="/admin/history-log"
              className="bg-[#f3f4fd] hover:bg-[#e8ebfc] transition-all p-5 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 size={20} />
              </div>
              <span className="font-semibold text-slate-800 text-xs">Post Inspect</span>
            </Link>

            {/* Action 4: Inventory Check */}
            <Link
              to="/admin/reports"
              className="bg-[#f3f4fd] hover:bg-[#e8ebfc] transition-all p-5 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center gap-2.5 group cursor-pointer text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PackageOpen size={20} />
              </div>
              <span className="font-semibold text-slate-800 text-xs">Inventory Check</span>
            </Link>
          </div>
        </div>

        {/* Today's Pending Tasks Table (Live Backend Data) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Today's Pending Tasks</h3>
            <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {staffTasks.length} Live Tasks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-2">TRACKING NO.</th>
                  <th className="pb-3 px-2">BORROWER</th>
                  <th className="pb-3 px-2">EQUIPMENT / VENUE</th>
                  <th className="pb-3 px-2">TIME</th>
                  <th className="pb-3 px-2">TASK</th>
                  <th className="pb-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {staffTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No pending tasks assigned for today's shift.
                    </td>
                  </tr>
                ) : (
                  staffTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-2 font-mono font-bold text-slate-700">{t.tracking_no}</td>
                      <td className="py-3 px-2 font-extrabold text-slate-900">{t.borrower}</td>
                      <td className="py-3 px-2 text-slate-800">{t.equipment}</td>
                      <td className="py-3 px-2 text-slate-500 font-mono">{t.time}</td>
                      <td className="py-3 px-2 text-slate-700">{t.task}</td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          to={t.link}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all border ${t.action_bg}`}
                        >
                          <Box size={13} /> {t.action_label}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" size={26} />
            Institutional Dashboard Overview
          </h1>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
            {officeScope}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Office Filter Dropdown for Super Admin */}
          {(isSuperAdmin || userRole === "super_admin") && (
            <div className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-xs flex items-center gap-2">
              <Filter size={15} className="text-amber-500 ml-1" />
              <select
                value={context?.selectedOffice || selectedOffice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (context?.setSelectedOffice) context.setSelectedOffice(val);
                  setSelectedOffice(val);
                }}
                className="bg-transparent text-slate-900 text-xs font-extrabold focus:outline-none cursor-pointer pr-2"
              >
                <option value="All Offices">All Offices (Combined)</option>
                <option value="FSUU Main Campus AVR Office">FSUU Main Campus AVR Office</option>
                <option value="FSUU Morelos Campus AVR Office">FSUU Morelos Campus AVR Office</option>
              </select>
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-extrabold text-xs shadow-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 5 Expanded Metrics Cards */}
      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      {/* Middle Row Grid (3 Columns): Departments Most Booked | Department Violations | Small Compact Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* 1. Departments with Most Venue Bookings */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Departments with Most Venue Bookings</span>
            </h3>
          </div>

          {topBookedDepartments.length > 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 my-auto">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    stroke="#2563eb"
                    strokeWidth="4"
                    strokeDasharray="100 100"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-slate-900 leading-none">{totalVenueBookings}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Bookings</span>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                {topBookedDepartments.slice(0, 4).map((dept, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-600" />
                      <span className="font-extrabold text-slate-900">{dept.name}</span>
                    </div>
                    <div className="font-black text-slate-800 text-xs">
                      {dept.pct}% <span className="text-slate-400 font-medium">({dept.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold my-auto">
              No venue bookings recorded yet.
            </div>
          )}
        </div>

        {/* 2. Department with Most Violations (Bar Graph) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600" />
                Department with Most Violations
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Reported breaches from Venue Booking Reports
              </p>
            </div>
          </div>

          {topViolatingDepartments.length > 0 ? (
            <div className="space-y-3 pt-1 my-auto">
              {topViolatingDepartments.map((v, idx) => {
                const maxV = Math.max(...topViolatingDepartments.map(d => d.count), 1);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>{v.dept}</span>
                      <span className="text-amber-700">{v.count} Violation{v.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${(v.count / maxV) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs font-semibold my-auto space-y-1">
              <p className="font-bold text-slate-800">No Violations Recorded</p>
              <p className="text-[11px] text-slate-400 font-normal">
                No venue booking or equipment violations found in report history.
              </p>
            </div>
          )}
        </div>

        {/* 3. Small Size Compact Calendar Widget */}
        <div className="lg:col-span-4">
          <BookingCalendar
            monthLabel={monthLabel}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            firstDayOfWeek={firstDayOfWeek}
            daysInMonth={daysInMonth}
            getDayDetails={getDayDetails}
            calMonth={calMonth}
            setCalMonth={setCalMonth}
            calYear={calYear}
            setCalYear={setCalYear}
          />
        </div>

      </div>

      {/* Bottom Row Grid (2 Columns): Most Used Equipment | Equipment Damages & Lost Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (6 cols): Most Used Equipment (Bar Graph) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-600" />
                Most Used Equipment (Bar Graph)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Calculated borrowing frequency from history log
              </p>
            </div>
          </div>

          {mostUsedEquipment.length > 0 ? (
            <div className="space-y-3 pt-1">
              {mostUsedEquipment.map((eq, idx) => {
                const maxEq = Math.max(...mostUsedEquipment.map(d => d.count), 1);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>{eq.name}</span>
                      <span className="text-purple-700">{eq.count} Loans</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600" style={{ width: `${(eq.count / maxEq) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs font-semibold space-y-1">
              <p className="font-bold text-slate-800">No Equipment Released</p>
              <p className="text-[11px] text-slate-400 font-normal">
                No equipment borrowing history recorded yet.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (6 cols): Equipment Damages & Lost Trend (Line Graph) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600" />
                Equipment Damages & Lost Trend
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Monthly incidents calculated from inventory & audit logs
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-32 w-full flex items-end justify-between px-2 pt-4 relative border-b border-slate-200">
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                {totalDamaged + totalLost > 0 ? (
                  <>
                    <path d="M 10 90 Q 75 80 150 70 T 290 30" fill="none" stroke="#f43f5e" strokeWidth="3" />
                    <circle cx="10" cy="90" r="4" fill="#f43f5e" />
                    <circle cx="75" cy="80" r="4" fill="#f43f5e" />
                    <circle cx="150" cy="70" r="4" fill="#f43f5e" />
                    <circle cx="225" cy="50" r="4" fill="#f43f5e" />
                    <circle cx="290" cy="30" r="4" fill="#f43f5e" />
                  </>
                ) : (
                  <>
                    <path d="M 10 95 L 290 95" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 4" />
                    <circle cx="290" cy="95" r="4" fill="#10b981" />
                  </>
                )}
              </svg>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-2">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Current ({totalDamaged + totalLost})</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

