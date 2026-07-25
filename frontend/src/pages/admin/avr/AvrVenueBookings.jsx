import { useState, useCallback, useMemo } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { useDebounce } from "@/hooks/useDebounce";
import { AppCard } from "@/components/ui/app-card";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Eye, CheckCircle, XCircle, Bell, Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X, Search } from "lucide-react";

const TABS = [
  { key: "pending",   label: "Pending Booking" },
  { key: "approved",  label: "Approval" },
  { key: "ongoing",   label: "Ongoing" },
  { key: "completed", label: "Post-Inspection" },
];

import { StatusBadge } from "@/components/ui/status-badge";

function DetailModal({ booking, onClose, onAction, actionLoading }) {
  const [remarks, setRemarks] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [showNotify, setShowNotify] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(booking);
  
  // Inspection Form State
  const [showInspection, setShowInspection] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    condition_notes: "", has_damage: false, damage_charge_amount: "", evidences: []
  });
  const [isInspecting, setIsInspecting] = useState(false);

  if (!booking) return null;

  const handleNotify = async () => {
    try {
      await api.post(`/avr-venue-bookings/${booking.id}/notify-missing`, { message: notifyMsg });
      alert("Notification sent to filer.");
      setShowNotify(false);
      onClose(); // Optional: close or refresh
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to send notification.");
    }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/avr-venue-bookings/${booking.id}`, editForm);
      alert("Booking details updated.");
      setIsEditing(false);
      onClose();
    } catch(e) {
      alert("Failed to update booking.");
    }
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    setIsInspecting(true);
    try {
      const formData = new FormData();
      formData.append("reference_type", "avr_venue_booking");
      formData.append("reference_id", booking.id);
      formData.append("inspection_type", "post_use");
      formData.append("condition_notes", inspectionData.condition_notes);
      formData.append("has_damage", inspectionData.has_damage ? 1 : 0);
      if (inspectionData.damage_charge_amount) formData.append("damage_charge_amount", inspectionData.damage_charge_amount);
      
      Array.from(inspectionData.evidences).forEach(file => formData.append("evidences[]", file));

      await api.post("/inspections", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await onAction(booking.id, "complete"); // mark booking as completed
    } catch (err) {
      alert(err.response?.data?.message ?? "Inspection failed to save.");
    } finally {
      setIsInspecting(false);
    }
  };
  const rows = [
    ["Tracking No.",  booking.reference_code ?? `VB-${String(booking.id).padStart(5,"0")}`],
    ["Date/Time Filed", booking.created_at ? new Date(booking.created_at).toLocaleString() : "—"],
    ["Requestor",     booking.requestor_name],
    ["Email",         booking.requestor_email],
    ["Contact",       booking.requestor_contact_number],
    ["Program/Office",booking.requestor_program_office],
    ["Identity Type", booking.requestor_identity_type],
    ["Classification",booking.booking_classification],
    ["Purpose",       booking.purpose],
    ["Event Type",    booking.event_type],
    ["Persons",       booking.number_of_persons],
    ["Venue",         booking.venue?.name],
    ["Start",         booking.start_datetime ? new Date(booking.start_datetime).toLocaleString() : "—"],
    ["End",           booking.end_datetime   ? new Date(booking.end_datetime).toLocaleString()   : "—"],
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Booking Details</h3>
            <StatusBadge status={booking.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <dl className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <dt className="w-36 text-slate-400 font-semibold flex-shrink-0">{k}</dt>
                <dd className="text-slate-800 font-medium">
                  {isEditing && k !== "Tracking No." && k !== "Date/Time Filed" && k !== "Venue" ? (
                    <input className="w-full px-2 border rounded" 
                      value={editForm[k.toLowerCase().replace(/[\/\s]/g,"_")] ?? v ?? ""} 
                      onChange={e => setEditForm({...editForm, [k.toLowerCase().replace(/[\/\s]/g,"_")]: e.target.value})} />
                  ) : (
                    v ?? "—"
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {isEditing && (
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-slate-200 rounded text-xs font-bold text-slate-700">Cancel</button>
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 rounded text-xs font-bold text-white">Save Changes</button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-blue-600 hover:underline">Edit Details</button>
            <span className="text-slate-300">|</span>
            {booking.documents?.find(d => d.document_type === 'endorsement_letter') ? (
              <button 
                onClick={async () => {
                  const doc = booking.documents.find(d => d.document_type === 'endorsement_letter');
                  try {
                    const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `Endorsement_Letter_${booking.reference_code}.pdf`); // Adjust extension as needed
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (e) {
                    alert("Failed to view endorsement letter.");
                  }
                }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View Endorsement Letter
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-400">No Endorsement Letter</span>
            )}
          </div>

          {/* Actions */}
          {booking.status === "pending" && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks (optional)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => onAction(booking.id, "approve", remarks)} disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                  {actionLoading === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                </button>
                <button onClick={() => onAction(booking.id, "reject", remarks)} disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                  {actionLoading === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                </button>
              </div>
              <button onClick={() => setShowNotify(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
                <Bell size={14} /> Notify — Missing Requirements
              </button>
              {showNotify && (
                <div className="space-y-2">
                  <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder="Message to filer..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={3} />
                  <button onClick={handleNotify} disabled={!notifyMsg.trim()}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                    Send Notification
                  </button>
                </div>
              )}
            </div>
          )}
          {booking.status === "approved" && (
            <div className="pt-2 border-t border-slate-100">
              <button onClick={() => onAction(booking.id, "set-ready")} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                {actionLoading === "set-ready" ? <Loader2 size={14} className="animate-spin" /> : null} Set as Ready
              </button>
            </div>
          )}
          {(booking.status === "ready" || booking.status === "in_use") && !showInspection && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-700">Mark as Ongoing</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" 
                    checked={booking.status === "in_use"}
                    onChange={(e) => {
                      if (e.target.checked) onAction(booking.id, "set-ongoing");
                      else onAction(booking.id, "set-ready");
                    }} 
                    disabled={!!actionLoading} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                </label>
              </div>

              <button onClick={() => setShowInspection(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                Ready to Post-Inspection
              </button>
            </div>
          )}

          {showInspection && (
            <form onSubmit={handleInspectionSubmit} className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Post-Inspection Report</h4>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Condition Notes</label>
                <textarea required rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none"
                  value={inspectionData.condition_notes} onChange={e => setInspectionData({...inspectionData, condition_notes: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_damage" className="rounded"
                  checked={inspectionData.has_damage} onChange={e => setInspectionData({...inspectionData, has_damage: e.target.checked})} />
                <label htmlFor="has_damage" className="text-sm font-bold text-slate-700">Issue / Damage Found?</label>
              </div>
              {inspectionData.has_damage && (
                <div className="space-y-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Damage Charge Amount (Optional)</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      value={inspectionData.damage_charge_amount} onChange={e => setInspectionData({...inspectionData, damage_charge_amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Upload Evidences (Max 5 images)</label>
                    <input type="file" multiple accept="image/*" className="w-full text-sm"
                      onChange={e => setInspectionData({...inspectionData, evidences: e.target.files})} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowInspection(false)} className="flex-1 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isInspecting} className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {isInspecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Submit Inspection
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AvrVenueBookings() {
  const [tab, setTab]           = useState("pending");
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch]     = useState("");
  const debouncedSearch         = useDebounce(search, 300);

  const cacheKey = `avr_venue_bookings_${tab}_${page}`;
  const { data, loading, error, refresh: fetchBookings } = useDataCache(
    cacheKey,
    `/avr-venue-bookings?page=${page}&status=${tab}`
  );
  const bookings = data?.data ?? [];
  const meta     = data?.meta ?? null;

  // 0ms RAM search filtering
  const filteredBookings = useMemo(() => {
    if (!debouncedSearch.trim()) return bookings;
    const q = debouncedSearch.toLowerCase();
    return bookings.filter(b =>
      (b.requestor_name || '').toLowerCase().includes(q) ||
      (b.reference_code || '').toLowerCase().includes(q) ||
      (b.venue?.name || '').toLowerCase().includes(q)
    );
  }, [bookings, debouncedSearch]);

  const fetchBookingsForAction = useCallback(() => fetchBookings(), [fetchBookings]);

  const handleAction = async (id, type, remarks) => {
    setActionLoading(type);
    try {
      await api.post(`/avr-venue-bookings/${id}/${type}`, { remarks: remarks || null });
      setSelected(null);
      fetchBookingsForAction();
    } catch (e) { alert(e.response?.data?.message ?? "Action failed."); }
    finally { setActionLoading(null); }
  };

  const switchTab = (key) => { setTab(key); setPage(1); setSearch(""); };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              AVR Reservations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Venue Booking Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review, approve, and track AVR venue reservation schedules
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-blue-600"} />
          Refresh List
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Control Bar: Filter Tabs & Search */}
      <AppCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-4 py-2 rounded-lg transition-all ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by filer, tracking code or venue..."
          className="w-full sm:w-72"
        />
      </AppCard>

      {/* Main Table AppCard */}
      <AppCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {["#", "Tracking No.", "Filer", "Type", "Venue", "Date", "Time", "Status", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-xs">No {tab} venue bookings found.</td></tr>
                ) : (
                  filteredBookings.map((b, i) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">{((page - 1) * 20) + i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{b.reference_code ?? `VB-${String(b.id).padStart(5,"0")}`}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-800 text-xs">{b.requestor_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{b.requestor_identity_type ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700">{b.venue?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{b.start_datetime ? new Date(b.start_datetime).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{b.start_datetime ? new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(b)} title="View details"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Page {meta.current_page} of {meta.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </AppCard>

      {selected && <DetailModal booking={selected} onClose={() => setSelected(null)} onAction={handleAction} actionLoading={actionLoading} />}
    </div>
  );
}
