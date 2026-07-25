import { useDataCache } from "@/hooks/useDataCache";
import { Link } from "react-router-dom";
import { AppCard, AppCardIcon } from "@/components/ui/app-card";
import { CardSkeleton } from "@/components/ui/skeletons";
import {
  Building2, PackageOpen, Wrench, Clock, CheckCircle,
  RefreshCw, AlertCircle, ArrowRight, TrendingUp, AlertTriangle
} from "lucide-react";

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600 font-medium truncate max-w-[160px]">{label}</span>
        <span className="text-xs font-bold text-slate-800">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AvrDashboard() {
  const { data: stats, loading, error, refresh: fetchStats } = useDataCache('avr_dashboard_stats', '/dashboard/stats');

  const qs = stats?.quick_stats ?? {};
  const top = stats?.top_equipment ?? [];
  const programs = stats?.programs_with_violations ?? [];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Audio-Visual Resources
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            AVR Manager Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time overview of venue reservations, equipment loans, and inventory health
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-blue-600"} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stat Cards Overview using minimal metric containers */}
      {loading ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Pending Venue</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.pending_bookings ?? 0}</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Pending Borrow</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.pending_borrowings ?? 0}</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Available Units</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.available_equipment ?? 0}</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Damaged Units</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.damage_reports ?? 0}</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Overdue</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.overdue_returns ?? 0}</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">Done Today</p>
            <p className="font-mono text-2xl font-black text-slate-900 mt-1 tracking-tight">{qs.completed_today ?? 0}</p>
          </div>
        </div>
      )}

      {/* Analytics & Violations Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Borrowed Equipment */}
        <AppCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="font-extrabold text-slate-900 text-sm">Top Borrowed Equipment</h2>
            </div>
            <Link to="/avr/reports" className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1">
              Full Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-6 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded-lg animate-pulse" />)
            ) : top.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-6">No borrowing data recorded yet.</p>
            ) : (
              top.map((eq, i) => {
                const colors = ["bg-blue-600", "bg-indigo-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600"];
                const maxCount = top[0]?.count ? parseInt(top[0].count) : 1;
                const count = parseInt(eq.count) || parseInt(eq.count?.replace(" borrows", "")) || 0;
                return <ProgressBar key={i} label={eq.name} value={count} total={maxCount} color={colors[i % colors.length]} />;
              })
            )}
          </div>
        </AppCard>

        {/* Late Returns / Violations Table */}
        <AppCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h2 className="font-extrabold text-slate-900 text-sm">Late Returns & Violations</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Late</th>
                  <th className="px-4 py-3 text-left">Violations</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : programs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-xs">No violations recorded.</td></tr>
                ) : (
                  programs.map((p, i) => {
                    const badge = p.status === "Watch List"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : p.status === "Warning"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{p.program}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{p.late}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{p.violations}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge}`}>{p.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AppCard>

      </div>

    </div>
  );
}
