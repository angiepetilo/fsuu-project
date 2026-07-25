import { useState, useMemo } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { useDebounce } from "@/hooks/useDebounce";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Loader2, AlertCircle, RefreshCw, Send, FileBarChart2, ChevronLeft, ChevronRight, Search } from "lucide-react";

function BarChart({ data, valueKey = "total", labelKey = "program", color = "bg-blue-500", maxLabel = 8 }) {
  if (!data?.length) return <p className="text-slate-400 text-sm text-center py-6">No data available.</p>;
  const max = Math.max(...data.map(d => d[valueKey])) || 1;
  return (
    <div className="space-y-2.5">
      {data.slice(0, maxLabel).map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">{d[labelKey] || "Other"}</span>
            <span className="text-xs font-bold text-slate-800">{d[valueKey]}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${(d[valueKey] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBar({ label, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-slate-700">{count}</span>
      <div className="h-20 w-8 bg-slate-100 rounded-lg flex flex-col justify-end overflow-hidden">
        <div className="bg-rose-400 rounded-lg transition-all duration-700" style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function AvrReports() {
  const [page, setPage]           = useState(1);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail]         = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending]     = useState(false);
  const [search, setSearch]       = useState("");
  const debouncedSearch           = useDebounce(search, 300);

  const { data, loading, error, refresh: fetchReports } = useDataCache(
    `avr_reports_${page}`,
    `/avr/reports?page=${page}`
  );

  // 0ms RAM filtering on records table
  const allRecords = data?.records?.data ?? [];
  const filteredRecords = useMemo(() => {
    if (!debouncedSearch.trim()) return allRecords;
    const q = debouncedSearch.toLowerCase();
    return allRecords.filter(r =>
      (r.filer || r.requestor_name || '').toLowerCase().includes(q) ||
      (r.tracking_no || r.reference_code || '').toLowerCase().includes(q) ||
      (r.program || '').toLowerCase().includes(q)
    );
  }, [allRecords, debouncedSearch]);

  const sendEmail = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      await api.post("/avr/reports/email", { to: email, subject: "AVR System Report", body: emailBody || undefined });
      alert("Report sent to " + email);
      setEmailOpen(false); setEmail(""); setEmailBody("");
    } catch (e) { alert(e.response?.data?.message ?? "Failed to send."); }
    finally { setSending(false); }
  };

  const trends = data?.damage_trends ?? [];
  const maxTrend = Math.max(...trends.map(t => t.count), 1);
  const records = data?.records;

  const STATUS_COLORS = {
    "Returned":          "bg-emerald-50 text-emerald-700",
    "Returned w/ Damage":"bg-red-50 text-red-700",
    "In Use":            "bg-blue-50 text-blue-700",
    "Overdue":           "bg-orange-50 text-orange-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">Borrowing statistics and detailed records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReports} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setEmailOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20">
            <Send size={14} /> Share via Email
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"><AlertCircle size={18} />{error}</div>}

      {loading && !data
        ? <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={22} className="animate-spin mr-2" />Loading reports…</div>
        : (
          <>
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Borrowings by Program */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <FileBarChart2 size={16} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900 text-sm">Borrowings by Program</h2>
                </div>
                <div className="p-5">
                  <BarChart data={data?.borrowings_by_program} valueKey="total" labelKey="program" color="bg-blue-500" />
                </div>
              </div>

              {/* Top 5 Equipment */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                  <FileBarChart2 size={16} className="text-purple-600" />
                  <h2 className="font-bold text-slate-900 text-sm">Top 5 Borrowed Equipment</h2>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    {(data?.top_5_equipment ?? []).map((eq, i) => {
                      const colors = ["bg-blue-500","bg-indigo-500","bg-violet-500","bg-purple-500","bg-fuchsia-500"];
                      const max = data?.top_5_equipment?.[0]?.total || 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center flex-shrink-0">{eq.rank}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-700 font-medium">{eq.name}</span>
                              <span className="text-xs font-bold text-slate-800">{eq.total}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${colors[i]}`} style={{ width: `${(eq.total / max) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!(data?.top_5_equipment?.length) && <p className="text-slate-400 text-sm text-center py-4">No data.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Damage Trends */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <FileBarChart2 size={16} className="text-rose-500" />
                <h2 className="font-bold text-slate-900 text-sm">Damage Trends — Last 6 Months</h2>
              </div>
              <div className="p-5">
                <div className="flex items-end justify-around gap-3">
                  {trends.map((t, i) => <MiniBar key={i} label={t.month} count={t.count} maxCount={maxTrend} />)}
                  {!trends.length && <p className="text-slate-400 text-sm text-center py-4 w-full">No damage records.</p>}
                </div>
              </div>
            </div>

            {/* Borrowing Records */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <FileBarChart2 size={16} className="text-slate-500" />
                <h2 className="font-bold text-slate-900 text-sm">Borrowing Records</h2>
                {records && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">{records.total}</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["#","Tracking No.","Program/Borrower","Type","Equipment","Date","Return Status","Condition"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(records?.data ?? []).map((r) => (
                      <tr key={r.no} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400">{r.no}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{r.tracking_no}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{r.program}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.type}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[140px]">{r.equipment || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.start || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[r.return_status] ?? "bg-slate-100 text-slate-600"}`}>{r.return_status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold"
                          style={{ color: r.condition === "Damaged" ? "#dc2626" : r.condition === "Good" ? "#059669" : "#94a3b8" }}>
                          {r.condition}
                        </td>
                      </tr>
                    ))}
                    {!(records?.data?.length) && <tr><td colSpan={8} className="text-center py-10 text-slate-400">No borrowing records.</td></tr>}
                  </tbody>
                </table>
              </div>
              {records && records.last_page > 1 && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Page {records.current_page} of {records.last_page}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
                    <button onClick={() => setPage(p => Math.min(records.last_page, p + 1))} disabled={page === records.last_page} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      }

      {/* Email Modal */}
      {emailOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg">Share Report via Email</h3>
              <button onClick={() => setEmailOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><span className="text-lg">×</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Recipient Email <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="recipient@example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Message (optional)</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={3} placeholder="Additional notes..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEmailOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={sendEmail} disabled={sending || !email.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {sending && <Loader2 size={14} className="animate-spin" />} <Send size={13} /> Send Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
