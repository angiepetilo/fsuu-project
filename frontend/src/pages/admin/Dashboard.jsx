import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import { MetricCard, ContentCard } from "@/components/ui/app-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Building2, PackageOpen, Clock, AlertTriangle,
  ArrowRight, RefreshCw, AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight
} from "lucide-react";

export default function Dashboard() {
  const context = useOutletContext();

  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [equipmentDamages, setEquipmentDamages] = useState({ total_damaged_count: 0, damaged_units: [] });
  const [timeRange, setTimeRange] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Side Calendar State
  const today = new Date();
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

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "short", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");

  const [departmentAnalytics, setDepartmentAnalytics] = useState({ rule_violations: [], late_returns: [] });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vbRes, ebRes, edRes, daRes] = await Promise.all([
        api.get("/avr-venue-bookings").catch(() => ({ data: { data: [] } })),
        api.get("/avr-equipment-borrowings").catch(() => ({ data: { data: [] } })),
        api.get("/admin/equipment-damages").catch(() => ({ data: { total_damaged_count: 0, damaged_units: [] } })),
        api.get("/admin/department-analytics").catch(() => ({ data: { rule_violations: [], late_returns: [] } })),
      ]);
      setVenueBookings(vbRes.data?.data ?? []);
      setEquipmentBorrowings(ebRes.data?.data ?? []);
      setEquipmentDamages(edRes.data ?? { total_damaged_count: 0, damaged_units: [] });
      setDepartmentAnalytics(daRes.data ?? { rule_violations: [], late_returns: [] });
    } catch (err) {
      setError("Unable to sync dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalVenue        = venueBookings.length;
  const pendingVenue      = venueBookings.filter(b => (b.status || "").toLowerCase() === "pending").length;
  const pendingBorrow     = equipmentBorrowings.filter(b => (b.status || "").toLowerCase() === "pending").length;
  const totalPending      = pendingVenue + pendingBorrow;
  const totalEquipment    = equipmentBorrowings.length;
  const totalDamaged      = equipmentDamages.total_damaged_count ?? 0;

  // Function to compute date status & hover details for calendar
  const getDayDetails = (day) => {
    const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    const bookedOnDate = venueBookings.filter(b => (b.date_of_usage && b.date_of_usage.startsWith(dateStr)) || b.date_of_use === dateStr);
    
    if (bookedOnDate.length === 0) {
      return { status: "available", tooltip: `${monthLabel} ${day}: All venue slots open & available` };
    }

    const detailsText = bookedOnDate.map(b => {
      const vName = b.venue?.name || "AVR 1";
      const tRange = (b.time_start && b.time_end) ? `${b.time_start.substring(0,5)} - ${b.time_end.substring(0,5)}` : "8:00 AM - 12:00 PM";
      return `${vName} (${tRange})`;
    }).join(", ");

    const status = bookedOnDate.length >= 3 ? "fully" : "partial";
    return {
      status,
      tooltip: `${monthLabel} ${day} — Reserved: ${detailsText}`
    };
  };

  const getDayStatus = (day) => getDayDetails(day).status;

  return (
    <div className="space-y-8">

      {/* Top Header & Time-Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-slate-800 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time snapshot of venue reservations, equipment borrows, and branch activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Pill Filters */}
          <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1">
            {["Today", "This Week", "This Month", "This Year"].map((range) => {
              const active = timeRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150
                    ${active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }
                  `}
                >
                  {range}
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold shadow-xs">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="TOTAL VENUE BOOKINGS"
          value={loading ? "..." : totalVenue}
          subtitle={`All recorded (${timeRange.toLowerCase()})`}
          trend
          icon={Building2}
        />
        <MetricCard
          title="PENDING APPROVALS"
          value={loading ? "..." : totalPending}
          subtitle={`Requires action (${timeRange.toLowerCase()})`}
          icon={Clock}
        />
        <MetricCard
          title="TOTAL EQUIPMENT BORROWS"
          value={loading ? "..." : totalEquipment}
          subtitle={`Active requests (${timeRange.toLowerCase()})`}
          trend
          icon={PackageOpen}
        />
        <MetricCard
          title="TOTAL EQUIPMENT DAMAGES"
          value={loading ? "..." : totalDamaged}
          subtitle="Damaged gear & reports"
          icon={AlertTriangle}
        />
      </div>

      {/* Layout Grid: Left Tables & Right Side Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left Column: Recent Bookings & Borrows Tables (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Table 1: Departments with Most Rule Violations */}
          <ContentCard
            title="Departments with Most Rule Violations"
            subtitle="Organizations with venue booking non-compliance & equipment damage reports"
            className="p-0"
          >
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">Loading violation analytics...</div>
              ) : departmentAnalytics.rule_violations.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">No department rule violations recorded.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        Department / Org
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Total non-compliance reports for venue reservations">
                          <span>VENUE VIOLATIONS</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Total damaged gear reports for equipment borrows">
                          <span>EQUIPMENT DAMAGES</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Combined total of venue & equipment violations">
                          <span>TOTAL BREACHES</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Calculated department risk level rating">
                          <span>RISK STATUS</span>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentAnalytics.rule_violations.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 truncate max-w-[150px]">
                          {item.department}
                        </td>
                        <td className="px-4 py-3.5 text-blue-700 font-extrabold text-sm">
                          {item.venue_violations}
                        </td>
                        <td className="px-4 py-3.5 text-amber-700 font-extrabold text-sm">
                          {item.equipment_violations}
                        </td>
                        <td className="px-4 py-3.5 text-rose-700 font-extrabold text-sm">
                          {item.total_violations}
                        </td>
                        <td className="px-4 py-3.5">
                          <Tooltip text={`${item.total_violations} total violations recorded for ${item.department}`}>
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase cursor-help ${
                              item.risk === "High Risk" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                              item.risk === "Moderate"  ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              item.risk === "Watch List"? "bg-purple-100 text-purple-700 border border-purple-200" :
                                                          "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {item.risk}
                            </span>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ContentCard>

          {/* Table 2: Departments with Most Late Equipment Returns */}
          <ContentCard
            title="Departments with Most Late Returns"
            subtitle="Organizations exceeding equipment return deadlines"
            className="p-0"
          >
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">Loading return analytics...</div>
              ) : departmentAnalytics.late_returns.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs font-semibold">No late equipment returns recorded.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Department / Org</th>
                      <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Total times equipment was returned past deadline">
                          <span>LATE RETURNS</span>
                        </Tooltip>
                      </th>
                      <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Average duration past scheduled return time">
                          <span>AVG DELAY</span>
                        </Tooltip>
                      </th>
                      <th className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        <Tooltip text="Overdue penalty severity rating">
                          <span>PENALTY STATUS</span>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentAnalytics.late_returns.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 truncate max-w-[180px]">
                          {item.department}
                        </td>
                        <td className="px-5 py-3.5 text-rose-700 font-extrabold text-sm">
                          {item.late_returns}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-semibold">
                          {item.avg_delay}
                        </td>
                        <td className="px-5 py-3.5">
                          <Tooltip text={`${item.late_returns} late returns recorded for ${item.department}`}>
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase cursor-help ${
                              item.status === "Critical"  ? "bg-rose-100 text-rose-700 border border-rose-200" :
                              item.status === "High Risk" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              item.status === "Moderate"  ? "bg-purple-100 text-purple-700 border border-purple-200" :
                                                            "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {item.status}
                            </span>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ContentCard>

        </div>

        {/* ── Right Column: Small Side Calendar Widget (4 cols) ── */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon size={16} className="text-blue-600" />
              Venue Availability Calendar
            </h3>
            <span className="text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {monthLabel}
            </span>
          </div>

          {/* Month Controls */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-slate-800">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const info = getDayDetails(day);

              let badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
              if (info.status === "partial") badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
              if (info.status === "fully") badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";

              return (
                <Tooltip key={day} text={info.tooltip}>
                  <div
                    className={`aspect-square w-full flex flex-col items-center justify-center rounded-lg border text-[11px] font-bold transition-all cursor-help ${badgeStyle}`}
                  >
                    <span>{day}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      info.status === "fully" ? "bg-rose-500" : info.status === "partial" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                  </div>
                </Tooltip>
              );
            })}
          </div>

          {/* Legend Badges */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
            </span>
            <span className="flex items-center gap-1 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Fully Booked
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
