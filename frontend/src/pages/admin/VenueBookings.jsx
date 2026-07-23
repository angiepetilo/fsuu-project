import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";

function StatusBadge({ status }) {
  const map = {
    pending:   "bg-amber-100 text-amber-700 border border-amber-200",
    approved:  "bg-emerald-100 text-emerald-700 border border-emerald-200",
    rejected:  "bg-red-100 text-red-700 border border-red-200",
    cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function VenueBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState(null); // detail modal
  const [remarks, setRemarks] = useState("");
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'cancel'

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/avr-venue-bookings?page=${page}`);
      setBookings(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch {
      setError("Failed to load venue bookings.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleAction = async (bookingId, type) => {
    setActionLoading(bookingId + "-" + type);
    try {
      await api.post(`/avr-venue-bookings/${bookingId}/${type}`, { remarks: remarks || null });
      await fetchBookings();
      setSelected(null);
      setRemarks("");
      setActionType(null);
    } catch (err) {
      alert(err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Venue Bookings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage AVR and SCO venue reservation requests</p>
        </div>
        <button onClick={fetchBookings} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Ref #", "Requestor", "Email", "Venue", "Date", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" />Loading…
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No venue bookings found.</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{b.reference_code ?? "#" + b.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{b.requestor_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{b.requestor_email}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{b.venue?.name ?? b.venue_id}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{b.start_datetime?.split(" ")[0] ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {b.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(b.id, "approve")}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50"
                            title="Approve"
                          >
                            {actionLoading === b.id + "-approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          </button>
                          <button
                            onClick={() => handleAction(b.id, "reject")}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-all disabled:opacity-50"
                            title="Reject"
                          >
                            {actionLoading === b.id + "-reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
