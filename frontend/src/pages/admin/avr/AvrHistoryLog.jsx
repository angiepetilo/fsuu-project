import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { History, Loader2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const STATUS_COLORS = {
  pending:                "bg-amber-50 text-amber-700 border-amber-200",
  approved:               "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:               "bg-red-50 text-red-700 border-red-200",
  cancelled:              "bg-slate-100 text-slate-500 border-slate-200",
  completed:              "bg-blue-50 text-blue-700 border-blue-200",
  completed_with_damage:  "bg-red-50 text-red-700 border-red-200",
  in_use:                 "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status?.replace(/_/g," ")}
    </span>
  );
}

export default function AvrHistoryLog() {
  const [page, setPage]       = useState(1);
  const [typeFilter, setTypeFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [programFilter, setProgramFilter] = useState("");

  const params = new URLSearchParams({ page, ...(typeFilter && { type: typeFilter }), ...(statusFilter && { status: statusFilter }), ...(programFilter && { program: programFilter }), ...(dateFrom && { date_from: dateFrom }), ...(dateTo && { date_to: dateTo }) }).toString();
  const { data: historyData, loading, error, refresh: fetchHistory } = useDataCache(`avr_history_${params}`, `/avr/history-log?${params}`);
  const { data: programsData } = useDataCache('public_programs', '/programs');

  const records = historyData?.data ?? [];
  const meta = historyData ?? null;
  const programs = programsData ?? [];

  const reset = () => { setTypeFilter(""); setStatusFilter(""); setProgramFilter(""); setDateFrom(""); setDateTo(""); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">History Log</h1>
          <p className="text-sm text-slate-400 mt-0.5">All processed venue bookings and equipment borrowings</p>
        </div>
        <button onClick={fetchHistory} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"><AlertCircle size={18} />{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
          <option value="">All Types</option>
          <option value="venue">Venue Booking</option>
          <option value="equipment">Equipment Borrowing</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
          <option value="">All Statuses</option>
          {["pending","approved","rejected","cancelled","completed","completed_with_damage","in_use"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g," ")}</option>
          ))}
        </select>
        <select value={programFilter} onChange={e => { setProgramFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 bg-white">
          <option value="">All Programs/Offices</option>
          {programs.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        {(typeFilter || statusFilter || programFilter || dateFrom || dateTo) && (
          <button onClick={reset} className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-700 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <History size={16} className="text-slate-500" />
          <span className="font-bold text-slate-900 text-sm">All Records</span>
          {meta && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">{meta.total}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["#","Tracking No.","Filer","Type","Venue / Equipment","Date","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Loader2 size={18} className="animate-spin inline mr-2" />Loading…</td></tr>
                : records.length === 0
                  ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No records found.</td></tr>
                  : records.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400">{((page - 1) * 20) + i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{r.tracking_no}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{r.filer}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${r.type === "Venue Booking" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[160px]">{r.venue || r.equipment || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {r.start ? new Date(r.start).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Page {meta.current_page} of {meta.last_page} — {meta.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
