import { useState, useEffect } from "react";
import { Loader2, Table as TableIcon, BarChart2 } from "lucide-react";
import api from "@/lib/axios";

export default function DashboardAnalyticsCharts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAsTable, setViewAsTable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/general/dashboard/analytics-charts")
      .then((res) => {
        if (isMounted && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard analytics charts:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-3 shadow-xs min-h-[220px]">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading utilization analytics & charts...</p>
      </div>
    );
  }

  if (!data) return null;

  const demographics = data.demographics || [];
  const departments = data.departments || [];
  const statuses = data.statuses || [];
  const timeBands = data.timeBands || [];

  // Donut SVG Calculations
  const totalDemo = demographics.reduce((sum, d) => sum + d.count, 0) || 1;
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
                  {totalDemo}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Total</span>
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
                    <span className="text-[10px] font-mono font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[50px] inline-block origin-top-left -rotate-35"
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
                    <span className="text-[10px] font-mono font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <span className="text-[10.5px] font-mono font-bold text-slate-600 dark:text-slate-300 mb-1 group-hover:scale-110 transition-transform">
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
