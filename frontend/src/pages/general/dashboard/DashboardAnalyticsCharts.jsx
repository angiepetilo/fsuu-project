import { useState, useEffect, useMemo } from "react";
import { Table as TableIcon, BarChart2 } from "lucide-react";
import api from "@/lib/axios";

export default function DashboardAnalyticsCharts({
  topBookedDepartments = [],
  venueBookings = [],
  equipBorrowings = [],
  totalVenueBookings = 0,
  totalEquipBorrows = 0,
  pendingApproval = 0,
  postInspectionPending = 0,
}) {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fsuu_cache_dashboard_charts") || "null");
    } catch {
      return null;
    }
  });
  const [viewAsTable, setViewAsTable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/general/dashboard/analytics-charts")
      .then((res) => {
        if (isMounted && res.data && !res.data.error) {
          setData(res.data);
          try {
            localStorage.setItem("fsuu_cache_dashboard_charts", JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {
        // Fallback computed from Dashboard props is used automatically
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackData = useMemo(() => {
    const allRecords = [
      ...(Array.isArray(venueBookings) ? venueBookings : []),
      ...(Array.isArray(equipBorrowings) ? equipBorrowings : []),
    ];

    // 1. Demographics
    const roleCounts = {
      Students: 0,
      Faculty: 0,
      Staff: 0,
      "Student Assistants": 0,
    };
    allRecords.forEach((r) => {
      const cls = String(r.classification || r.role || "student").trim().toLowerCase();
      if (cls.includes("faculty") || cls.includes("teacher") || cls.includes("prof")) {
        roleCounts.Faculty += 1;
      } else if (cls.includes("assistant") || cls.includes("external") || cls.includes("guest")) {
        roleCounts["Student Assistants"] += 1;
      } else if (cls.includes("staff") || cls.includes("employee") || cls.includes("admin")) {
        roleCounts.Staff += 1;
      } else {
        roleCounts.Students += 1;
      }
    });

    const totalCombined = (Number(totalVenueBookings) || 0) + (Number(totalEquipBorrows) || 0);
    if (allRecords.length === 0 && totalCombined > 0) {
      roleCounts.Students = totalCombined;
    }

    const roleTotal = Math.max(
      1,
      Object.values(roleCounts).reduce((a, b) => a + b, 0)
    );
    const roleColors = {
      Students: "#1E3A8A",
      Faculty: "#2563EB",
      Staff: "#64748B",
      "Student Assistants": "#0D9488",
    };
    const demographics = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
      percentage: Math.round((count / roleTotal) * 1000) / 10,
      color: roleColors[role],
    }));

    // 2. Departments
    let departments = (topBookedDepartments || []).map((d) => ({
      name: d.name || d.dept || "General",
      count: Number(d.count ?? d.bookings ?? 0),
    }));
    if (departments.length === 0 && allRecords.length > 0) {
      const deptMap = {};
      allRecords.forEach((r) => {
        const dept = String(r.program_office || r.department || "General").trim();
        if (dept) deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      departments = Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    // 3. Statuses
    const stCounts = {
      approved: 0,
      inUse: 0,
      completed: 0,
      late: 0,
      cancelled: 0,
    };
    allRecords.forEach((r) => {
      const st = String(r.status || r.tracking_status || "pending").trim().toLowerCase();
      if (st === "approved") stCounts.approved += 1;
      else if (["on-going", "ongoing", "borrowed", "released", "in-use", "in_use", "post-inspection"].includes(st)) stCounts.inUse += 1;
      else if (["completed", "returned"].includes(st)) stCounts.completed += 1;
      else if (st.includes("late")) stCounts.late += 1;
      else if (["cancelled", "rejected"].includes(st)) stCounts.cancelled += 1;
    });
    if (allRecords.length === 0 && totalCombined > 0) {
      stCounts.inUse = Number(postInspectionPending) || 0;
      stCounts.approved = Number(pendingApproval) || 0;
      stCounts.completed = Math.max(0, totalCombined - stCounts.inUse - stCounts.approved);
    }
    const statuses = [
      { status: "Approved", count: stCounts.approved },
      { status: "Released / In-Use", count: stCounts.inUse },
      { status: "Completed / Returned", count: stCounts.completed },
      { status: "Late Returns", count: stCounts.late },
      { status: "Cancelled", count: stCounts.cancelled },
    ];

    // 4. Time Bands
    const slots = [
      { band: "7:00 AM - 9:00 AM", short: "7-9 AM", start: 7, end: 9, bookings: 0, units: 0 },
      { band: "9:00 AM - 11:00 AM", short: "9-11 AM", start: 9, end: 11, bookings: 0, units: 0 },
      { band: "11:00 AM - 1:00 PM", short: "11-1 PM", start: 11, end: 13, bookings: 0, units: 0 },
      { band: "1:00 PM - 3:00 PM", short: "1-3 PM", start: 13, end: 15, bookings: 0, units: 0 },
      { band: "3:00 PM - 5:00 PM", short: "3-5 PM", start: 15, end: 17, bookings: 0, units: 0 },
      { band: "5:00 PM - 8:00 PM", short: "5-8 PM", start: 17, end: 20, bookings: 0, units: 0 },
    ];
    let totalInBands = 0;
    allRecords.forEach((r) => {
      const raw = String(r.time_start || "");
      if (!raw) return;
      const m = raw.match(/(\d{1,2}):(\d{2})/);
      if (!m) return;
      let hr = parseInt(m[1], 10);
      if (/pm/i.test(raw) && hr < 12) hr += 12;
      if (/am/i.test(raw) && hr === 12) hr = 0;
      for (const s of slots) {
        if (hr >= s.start && hr < s.end) {
          s.bookings += 1;
          s.units += 1;
          totalInBands += 1;
          break;
        }
      }
    });
    const denom = Math.max(1, totalInBands);
    const timeBands = slots.map((s) => ({
      band: s.band,
      short: s.short,
      bookings: s.bookings,
      units: s.units,
      percentage: Math.round((s.bookings / denom) * 1000) / 10,
    }));

    return { demographics, departments, statuses, timeBands };
  }, [
    topBookedDepartments,
    venueBookings,
    equipBorrowings,
    totalVenueBookings,
    totalEquipBorrows,
    pendingApproval,
    postInspectionPending,
  ]);

  const demographics =
    data?.demographics?.length && data.demographics.some((d) => d.count > 0)
      ? data.demographics
      : fallbackData.demographics;
  const departments =
    data?.departments?.length > 0 ? data.departments : fallbackData.departments;
  const statuses =
    data?.statuses?.length && data.statuses.some((s) => s.count > 0)
      ? data.statuses
      : fallbackData.statuses;
  const timeBands =
    data?.timeBands?.length && data.timeBands.some((t) => t.bookings > 0)
      ? data.timeBands
      : fallbackData.timeBands;

  // Donut SVG Calculations
  const totalDemoSum = demographics.reduce((sum, d) => sum + d.count, 0);
  const totalDemo = totalDemoSum || 1;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Max department count for bar scaling
  const maxDept = Math.max(...departments.map((d) => d.count), 1);

  // Max status count for bar scaling
  const maxStatus = Math.max(...statuses.map((s) => s.count), 1);

  // Max time band count for bar scaling
  const maxTimeBand = Math.max(...timeBands.map((t) => t.bookings), 1);

  return (
    <div className="space-y-4">
      {/* Top Row: 3 Visual Charts (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chart 1: Donut Chart - Borrower Demographics */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
              Borrower Demographics / Roles
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Distribution by applicant classification</p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="24"
                  className="dark:stroke-slate-800"
                />
                {demographics.map((item, idx) => {
                  const strokeDash = (item.count / totalDemo) * circumference;
                  const offset = accumulatedOffset;
                  accumulatedOffset += strokeDash;
                  return (
                    <circle
                      key={idx}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={item.color || "#2563EB"}
                      strokeWidth="24"
                      strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                      strokeDashoffset={-offset}
                      className="transition-all duration-700 ease-out"
                    />
                  );
                })}
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono leading-none">
                  {totalDemoSum}
                </span>
                <span className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-4">
              {demographics.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                    {d.role} ({d.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Vertical Bar Chart (Rotated Labels) - College Utilization */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
              Department / College Utilization
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Top reservation volume by academic unit</p>
          </div>

          <div className="my-auto py-2">
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200 dark:border-slate-800">
              {departments.slice(0, 6).map((dept, i) => {
                const heightPct = Math.max(8, Math.round((dept.count / maxDept) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-mono font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {dept.count}
                    </span>
                    <div
                      className="w-full max-w-[28px] bg-blue-900 dark:bg-blue-800 hover:bg-blue-700 rounded-t-xs transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Rotated Labels (Matching Screenshot 2) */}
            <div className="flex justify-between gap-2 px-1 pt-2 h-14">
              {departments.slice(0, 6).map((dept, i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <span
                    className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[50px] inline-block origin-top-left -rotate-35"
                    title={dept.name}
                  >
                    {dept.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Operational Status Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
              Operational Status Distribution
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Tracking and loan lifecycle summary</p>
          </div>

          <div className="my-auto py-2">
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200 dark:border-slate-800">
              {statuses.map((st, i) => {
                const heightPct = Math.max(8, Math.round((st.count / maxStatus) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-mono font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {st.count}
                    </span>
                    <div
                      className="w-full max-w-[28px] bg-blue-900 dark:bg-blue-800 hover:bg-blue-700 rounded-t-xs transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Bottom Labels */}
            <div className="flex justify-between gap-2 px-1 pt-2">
              {statuses.map((st, i) => (
                <div key={i} className="flex-1 text-center">
                  <span
                    className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400 block truncate"
                    title={st.status}
                  >
                    {st.status.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Peak Hourly Usage Bands with "View as table" toggle (Matching Screenshot 2) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight">
              Peak Hourly Usage Bands
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Reservation distribution across standard university class blocks
            </p>
          </div>

          <button
            type="button"
            onClick={() => setViewAsTable(!viewAsTable)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
          >
            {viewAsTable ? (
              <>
                <BarChart2 size={14} />
                <span>View as chart</span>
              </>
            ) : (
              <>
                <TableIcon size={14} />
                <span>View as table</span>
              </>
            )}
          </button>
        </div>

        {!viewAsTable ? (
          /* Chart View */
          <div>
            <div className="h-44 flex items-end justify-between gap-3 pt-4 px-4 border-b border-slate-200 dark:border-slate-800">
              {timeBands.map((t, idx) => {
                const heightPct = Math.max(6, Math.round((t.bookings / maxTimeBand) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mb-1 group-hover:scale-110 transition-transform">
                      {t.bookings}
                    </span>
                    <div
                      className="w-full max-w-[52px] bg-blue-900 dark:bg-blue-800 hover:bg-blue-700 rounded-t-xs transition-all duration-500 shadow-2xs"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Time Slot Labels */}
            <div className="flex justify-between gap-3 px-4 pt-2.5">
              {timeBands.map((t, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {t.short}
                  </span>
                  <span className="text-[9.5px] text-slate-400 hidden sm:block font-medium">
                    {t.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto text-xs animate-in fade-in duration-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Time Band</th>
                  <th className="py-2.5 px-4 text-center">Total Bookings</th>
                  <th className="py-2.5 px-4 text-center">Equipment Units Loaned</th>
                  <th className="py-2.5 px-4 text-right">Percentage Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {timeBands.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {t.band}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {t.bookings}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">{t.units}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      {t.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
