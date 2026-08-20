import { useState, useEffect } from "react";
import { useOutletContext, useLocation, Link } from "react-router-dom";
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

const DEPT_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2"];
const DEPT_BG_COLORS = ["bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-purple-600", "bg-cyan-600"];

export default function Dashboard() {
  const context = useOutletContext();
  const location = useLocation();
  const { user } = useAuth();

  const isSysadRoute = location.pathname.startsWith("/sysad");
  const userRole = typeof user?.role === "object" ? (user?.role?.name || "admin") : (user?.role || "admin");
  const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin" || context?.isSuperAdmin === true || isSysadRoute;
  const isStaff = userRole === "staff";

  // SysAd Dashboard aggregates data across ALL offices by default
  const officeScope = isSuperAdmin ? (context?.selectedOffice || "All Offices") : (context?.adminOffice || context?.selectedOffice || "All Offices");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/admin/offices")
        .then(res => setOffices(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
        .catch(() => setOffices([]));
    }
  }, [isSuperAdmin]);

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

  // Active Venue Bookings across ALL Venues for Calendar & Staff Tasks
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
      const [histRes, vbRes, eqRes, ebRes, dmgRes, overridesRes] = await Promise.all([
        api.get("/admin/history-log").catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
        api.get("/avr-equipment-borrowings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-damages").catch(() => ({ data: { total_damaged_count: 0, total_lost_count: 0 } })),
        api.get("/public/venue-overrides").catch(() => ({ data: [] })),
      ]);

      const selectedOfficeId = context?.selectedOfficeId;
      const selectedOfficeName = context?.selectedOffice || officeScope;

      const matchesOffice = (item) => {
        if (!selectedOfficeId || selectedOfficeId === "all") {
          if (!isSuperAdmin && officeScope !== "All Offices") {
            const name = item.office_name || item.office?.name || item.office || "";
            return name.toLowerCase().includes(officeScope.toLowerCase());
          }
          return true;
        }
        const offId = item.office_id || item.office?.id || item.venue?.office_id || item.items?.[0]?.equipment_type?.office_id;
        const offName = item.office_name || item.office?.name || item.venue?.office?.name;
        if (offId) return String(offId) === String(selectedOfficeId);
        if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
          return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
        }
        return true;
      };

      // 1. History Log Data
      let histVB = (histRes.data?.venue_bookings || []).filter(matchesOffice);
      let histEB = (histRes.data?.equipment_borrowings || []).filter(matchesOffice);
      setTotalVenueBookings(histVB.length);
      setTotalEquipBorrows(histEB.length);

      // 2. Active Venue Bookings
      const rawVb = vbRes.data?.data || vbRes.data || [];
      let activeVB = (Array.isArray(rawVb) ? rawVb : []).filter(matchesOffice);
      
      const rawOverrides = overridesRes.data || [];
      const formattedOverrides = (Array.isArray(rawOverrides) ? rawOverrides : []).map(o => ({
        date_of_usage: o.override_date ? o.override_date.split("T")[0] : "",
        status: o.status || "maintenance",
        venue_name: o.venue?.name || "Facility",
        filer_name: o.notes || "System Override",
      }));
      
      setCalendarBookings([...activeVB, ...formattedOverrides]);

      const pendingVBCount = activeVB.filter(b => {
        const s = (b.status || b.tracking_number?.status || "").toLowerCase();
        return s === "pending";
      }).length;

      // 3. Active Equipment Borrowings
      const rawEb = ebRes.data?.data || ebRes.data || [];
      let activeEB = (Array.isArray(rawEb) ? rawEb : []).filter(matchesOffice);
      const pendingEBCount = activeEB.filter(b => {
        const s = (b.status || b.tracking_number?.status || "").toLowerCase();
        return s === "pending";
      }).length;
      setPendingEquipBorrowings(pendingEBCount);
      setPendingApproval(pendingVBCount + pendingEBCount);

      // 4. Equipment Stock
      const eqCatalog = (Array.isArray(eqRes.data) ? eqRes.data : []).filter(matchesOffice);
      const dmgData = dmgRes.data || {};
      const damagedCount = typeof dmgData.total_damaged_count === 'number' && dmgData.total_damaged_count > 0 && (!selectedOfficeId || selectedOfficeId === "all")
        ? dmgData.total_damaged_count
        : eqCatalog.reduce((sum, e) => sum + (e.damaged_count || 0), 0);
      const lostCount = typeof dmgData.total_lost_count === 'number' && dmgData.total_lost_count > 0 && (!selectedOfficeId || selectedOfficeId === "all")
        ? dmgData.total_lost_count
        : eqCatalog.reduce((sum, e) => sum + (e.lost_count || 0), 0);
      setTotalDamaged(damagedCount);
      setTotalLost(lostCount);

      // 5. Staff Tasks
      const tasks = [];
      activeVB.slice(0, 5).forEach((b, idx) => {
        const s = (b.status || b.tracking_number?.status || "").toLowerCase();
        const ref = b.reference_code || b.tracking_number?.reference_code || `TRK-AVR${b.id}`;
        const filer = b.filer_name || b.requestor || "FSUU Filer";
        const vName = b.venue_name || b.venue?.name || "AVR Facility";
        const tRange = `${b.time_start || "08:00"} - ${b.time_end || "17:00"}`;

        if (s === "pending") {
          tasks.push({
            id: `vb-task-${b.id || idx}`,
            tracking_no: ref,
            borrower: filer,
            equipment: vName,
            time: tRange,
            task: "Verify Reservation Request",
            action_label: "Review",
            link: isSysadRoute ? "/sysad/venue-bookings" : "/admin/venue-bookings",
          });
        } else if (s === "ongoing" || s === "on-going") {
          tasks.push({
            id: `vb-task-${b.id || idx}`,
            tracking_no: ref,
            borrower: filer,
            equipment: vName,
            time: tRange,
            task: "Inspect Returned Venue",
            action_label: "Inspect",
            link: isSysadRoute ? "/sysad/venue-bookings" : "/admin/venue-bookings",
          });
        }
      });
      setStaffTasks(tasks);

      // 6. Department Bookings Distribution
      const deptCounts = {};
      [...histVB, ...activeVB].forEach(b => {
        const dept = (b.program_office || b.department || "General Dept").trim();
        if (dept) deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const sortedDepts = Object.entries(deptCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      const totalAllBookings = sortedDepts.reduce((sum, d) => sum + d.count, 0) || 1;
      const finalDepts = sortedDepts.map(d => ({
        ...d,
        pct: Math.round((d.count / totalAllBookings) * 100)
      }));
      setTopBookedDepartments(finalDepts);

      // 7. Violations by Department (Aggregated)
      const violationCounts = {};
      histVB.filter(b => (b.status || "").toLowerCase() === "damaged" || Boolean(b.has_damage) || Boolean(b.violation)).forEach(b => {
        const dept = (b.program_office || b.department || "General Dept").trim();
        if (dept) violationCounts[dept] = (violationCounts[dept] || 0) + 1;
      });
      const sortedViolations = Object.entries(violationCounts)
        .map(([dept, count]) => ({ dept, count }))
        .sort((a, b) => b.count - a.count);
      setTopViolatingDepartments(sortedViolations);

      try {
        localStorage.setItem("fsuu_cache_admin_dashboard", JSON.stringify({
          totalVenueBookings: histVB.length,
          pendingApproval: pendingVBCount + pendingEBCount,
          pendingEquipBorrowings: pendingEBCount,
          totalEquipBorrows: histEB.length,
          totalDamaged: damagedCount,
          totalLost: lostCount,
          topBookedDepartments: finalDepts,
          topViolatingDepartments: sortedViolations,
        }));
      } catch { }

    } catch {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [officeScope, context?.selectedOfficeId, context?.selectedOffice]);

  // Calendar Day Details helper — all booking statuses mark calendar days
  const getDayDetails = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const bookedOnDate = calendarBookings.filter(b => {
      const d = b.date_of_usage || b.date_of_use || b.date || "";
      // Include ALL statuses so completed/cancelled/rejected still mark calendar days
      return d.startsWith(dateStr);
    });

    if (bookedOnDate.length === 0) {
      return { status: "available", hasEvent: false, tooltip: `${monthLabel} ${day}: All venue slots open` };
    }

    let dominantStatus = "available";
    let statusClass = "border border-slate-300 bg-white text-slate-900";

    if (bookedOnDate.some(b => ["ongoing", "on-going"].includes((b.status || "").toLowerCase()))) {
      dominantStatus = "ongoing";
      statusClass = "border-blue-600 bg-blue-600 text-white";
    } else if (bookedOnDate.some(b => ["reserved", "approved"].includes((b.status || "").toLowerCase()))) {
      dominantStatus = "reserved";
      statusClass = "border-indigo-600 bg-indigo-600 text-white";
    } else if (bookedOnDate.some(b => ["pending"].includes((b.status || "").toLowerCase()))) {
      dominantStatus = "pending";
      statusClass = "border-amber-500 bg-amber-500 text-white";
    } else if (bookedOnDate.some(b => ["maintenance", "closed", "damaged"].includes((b.status || "").toLowerCase()))) {
      dominantStatus = "maintenance";
      statusClass = "border-slate-700 bg-slate-700 text-white";
    } else if (bookedOnDate.every(b => ["completed", "done", "returned"].includes((b.status || "").toLowerCase()))) {
      return { status: "available", hasEvent: false, tooltip: `${monthLabel} ${day}: All venue slots open` };
    } else {
      dominantStatus = "event";
      statusClass = "border-rose-600 bg-white text-rose-600";
    }

    const detailsText = bookedOnDate.map(b => {
      const vName = b.venue?.name || b.venue_name || b.venue || "AVR";
      const filer = b.filer_name || b.requestor || "Filer";
      return `${vName} (${filer})`;
    }).join(" | ");

    return {
      status: dominantStatus,
      statusClass,
      hasEvent: true,
      tooltip: `${monthLabel} ${day}: ${detailsText}`
    };
  };

  if (loading) return <PageLoader message="Loading Dashboard..." />;

  // Staff Specific Dashboard View
  if (isStaff) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AVR Staff Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Assigned operational tasks and schedule status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick Shift Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Quick Shift Actions</h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">4 Operational Tasks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/admin/venue-bookings"
              className="bg-white hover:bg-slate-50 transition-all p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 group cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700">
                <Building2 size={16} />
              </div>
              <span className="font-bold text-slate-900 text-xs">Venue Verification</span>
            </Link>

            <Link
              to="/admin/equipment-borrowings"
              className="bg-white hover:bg-slate-50 transition-all p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 group cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700">
                <Box size={16} />
              </div>
              <span className="font-bold text-slate-900 text-xs">Equipment Release</span>
            </Link>

            <Link
              to="/admin/equipment-borrowings"
              className="bg-white hover:bg-slate-50 transition-all p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 group cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700">
                <Award size={16} />
              </div>
              <span className="font-bold text-slate-900 text-xs">Post Inspect</span>
            </Link>

            <Link
              to="/admin/reports"
              className="bg-white hover:bg-slate-50 transition-all p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 group cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700">
                <PackageOpen size={16} />
              </div>
              <span className="font-bold text-slate-900 text-xs">Inventory Check</span>
            </Link>
          </div>
        </div>

        {/* Today's Pending Tasks Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Today's Pending Tasks</h3>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {staffTasks.length} Live Tasks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 px-3">TRACKING NO.</th>
                  <th className="pb-2.5 px-3">BORROWER</th>
                  <th className="pb-2.5 px-3">EQUIPMENT / VENUE</th>
                  <th className="pb-2.5 px-3">TIME</th>
                  <th className="pb-2.5 px-3">TASK</th>
                  <th className="pb-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {staffTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                      No pending tasks assigned for today's shift.
                    </td>
                  </tr>
                ) : (
                  staffTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{t.tracking_no}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{t.borrower}</td>
                      <td className="py-3 px-3 text-slate-800 font-mono">{t.equipment}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono whitespace-nowrap">{t.time}</td>
                      <td className="py-3 px-3 text-slate-700">{t.task}</td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={t.link}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border border-slate-900 bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          {t.action_label}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isSuperAdmin ? "System Administrator Overview" : "Dashboard Overview"}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Real-time facility utilization, reservation analytics & inventory overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="py-2.5 px-4 border-t border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 bg-white">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* 5 Top Stat Cards with Semantic Values and Accents */}
      <MetricsOverview
        totalVenueBookings={totalVenueBookings}
        pendingApproval={pendingApproval}
        totalEquipBorrows={totalEquipBorrows}
        totalDamaged={totalDamaged}
        totalLost={totalLost}
      />

      {/* 3 Widgets Grid: Department Rankings | Violations | Schedule Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* 1. Department with Most Venue Bookings (Multi-Color Semantic Donut) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              Department with Most Venue Bookings
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Reservation distribution across departments
            </p>
          </div>

          {topBookedDepartments.length > 0 ? (
            <div className="flex items-center justify-center gap-6 py-4 my-auto w-full">
              {/* Pie Chart Metric */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                  {(() => {
                    let cumulativePercent = 0;
                    const r = 35; // Radius of pie
                    const cx = 50;
                    const cy = 50;
                    
                    function getCoords(percent, radius) {
                      const angle = percent * 2 * Math.PI - Math.PI / 2;
                      return [
                        Math.cos(angle) * radius + cx,
                        Math.sin(angle) * radius + cy
                      ];
                    }
                    
                    // Filter out 0% slices to avoid rendering issues
                    const validDepts = topBookedDepartments.filter(d => (d.pct || 0) > 0);
                    
                    return validDepts.map((dept, idx) => {
                      const pct = (dept.pct || 0) / 100;
                      const startPercent = cumulativePercent;
                      cumulativePercent += pct;
                      const endPercent = cumulativePercent;
                      
                      const [startX, startY] = getCoords(startPercent, r);
                      const [endX, endY] = getCoords(endPercent, r);
                      const largeArcFlag = pct > 0.5 ? 1 : 0;
                      
                      const pathData = [
                        `M ${cx} ${cy}`,
                        `L ${startX} ${startY}`,
                        `A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `Z`
                      ].join(' ');

                      const isFull = pct === 1;
                      
                      // Label positioning
                      const midPercent = startPercent + pct / 2;
                      const [lineStartX, lineStartY] = getCoords(midPercent, r);
                      const [lineEndX, lineEndY] = getCoords(midPercent, r + 8);
                      
                      const isRight = lineEndX >= cx;
                      const textX = isRight ? lineEndX + 2 : lineEndX - 2;
                      const textAnchor = isRight ? "start" : "end";

                      const color = DEPT_COLORS[idx % DEPT_COLORS.length];

                      return (
                        <g key={idx}>
                          {isFull ? (
                            <circle cx={cx} cy={cy} r={r} fill={color} />
                          ) : (
                            <path d={pathData} fill={color} />
                          )}
                          
                          {/* Connecting line */}
                          <polyline
                            points={`${lineStartX},${lineStartY} ${lineEndX},${lineEndY}`}
                            fill="none"
                            stroke={color}
                            strokeWidth="1"
                          />
                          
                          {/* Label (Count) */}
                          <text
                            x={textX}
                            y={lineEndY + 2.5}
                            fill="#475569"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor={textAnchor}
                          >
                            {dept.count}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>

              {/* Department Legend */}
              <div className="flex flex-col gap-2">
                {topBookedDepartments.slice(0, 4).map((dept, idx) => {
                  const dotBg = DEPT_BG_COLORS[idx % DEPT_BG_COLORS.length];
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[120px]">
                        {dept.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold my-auto">
              No venue bookings recorded yet.
            </div>
          )}
        </div>

        {/* 2. Department with Most Violation (Semantic Color Bar Chart) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              Department with Most Violation
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Reported breaches from verified inspection records
            </p>
          </div>

          {topViolatingDepartments.length > 0 ? (
            <div className="h-44 w-full flex items-end justify-around gap-2 pt-3 px-1 my-auto">
              {topViolatingDepartments.slice(0, 4).map((v, idx) => {
                const maxV = Math.max(...topViolatingDepartments.map(d => d.count), 1);
                const heightPct = Math.max(18, Math.round((v.count / maxV) * 100));
                const barColor = v.count >= 3 ? "bg-rose-500" : (v.count >= 1 ? "bg-amber-500" : "bg-blue-600");
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                    <span className="text-[10px] font-mono font-bold text-rose-600">{v.count}</span>
                    <div className="w-full max-w-[32px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end justify-center h-24">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${barColor}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-600 truncate max-w-[60px] text-center" title={v.dept}>
                      {v.dept}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold my-auto">
              <span className="font-mono text-emerald-600 font-bold">● Clean Record</span>
              <p className="text-[11px] text-slate-400 mt-0.5">No policy violations recorded across offices.</p>
            </div>
          )}
        </div>

        {/* 3. Schedule Calendar Widget */}
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
    </div>
  );
}
