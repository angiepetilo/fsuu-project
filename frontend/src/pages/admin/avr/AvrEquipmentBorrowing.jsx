import { useState, useCallback, useMemo } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { useDebounce } from "@/hooks/useDebounce";
import { AppCard } from "@/components/ui/app-card";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Eye, CheckCircle, XCircle, Bell, Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X, ScanLine } from "lucide-react";

const TABS = [
  { key: "pending", label: "Pending Claim" },
  { key: "in_use",  label: "Release / Return" },
  { key: "completed", label: "Post-Inspection" },
];

const STATUS_COLORS = {
  pending:                "bg-amber-50 text-amber-700 border-amber-200",
  approved:               "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_use:                 "bg-blue-50 text-blue-700 border-blue-200",
  completed:              "bg-slate-100 text-slate-600 border-slate-200",
  completed_with_damage:  "bg-red-50 text-red-700 border-red-200",
  rejected:               "bg-red-50 text-red-700 border-red-200",
  cancelled:              "bg-slate-100 text-slate-500 border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function BarcodeEntry({ item, borrowingId, onAssigned }) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigned, setAssigned] = useState(item.units?.length > 0);

  const handleAssign = async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    try {
      await api.post(`/avr-equipment-borrowings/${borrowingId}/items/${item.id}/assign`, { barcode });
      setAssigned(true);
      onAssigned?.();
    } catch (e) {
      alert(e.response?.data?.message ?? "Assignment failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className={`rounded-xl p-3 border ${assigned ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-700">{item.equipmentType?.name ?? "Equipment"}</p>
        <span className="text-xs text-slate-400">Qty: {item.quantity_requested}</span>
      </div>
      {item.units?.map(u => (
        <div key={u.id} className="text-xs text-emerald-700 font-mono font-bold mb-1">Assigned: {u.unit?.barcode ?? u.barcode}</div>
      ))}
      {!assigned && (
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <ScanLine size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={barcode} onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAssign()}
              placeholder="Enter barcode..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10" />
          </div>
          <button onClick={handleAssign} disabled={loading || !barcode.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60">
            {loading ? <Loader2 size={12} className="animate-spin" /> : "Assign"}
          </button>
        </div>
      )}
    </div>
  );
}

function DetailModal({ borrowing, onClose, onAction, actionLoading, onRefresh }) {
  const [remarks, setRemarks] = useState("");
  const [showNotify, setShowNotify] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");

  if (!borrowing) return null;

  const rows = [
    ["Tracking No.",   borrowing.reference_code ?? `EB-${String(borrowing.id).padStart(5,"0")}`],
    ["Requestor",      borrowing.requestor_name],
    ["Email",          borrowing.requestor_email],
    ["Program/Office", borrowing.requestor_program_office],
    ["Identity Type",  borrowing.requestor_identity_type],
    ["Purpose",        borrowing.purpose],
    ["Place of Use",   borrowing.place_of_use],
    ["Inside Campus",  borrowing.used_inside_campus ? "Yes" : "No"],
    ["Start",          borrowing.start_datetime ? new Date(borrowing.start_datetime).toLocaleString() : "—"],
    ["End",            borrowing.end_datetime   ? new Date(borrowing.end_datetime).toLocaleString()   : "—"],
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Borrowing Details</h3>
            <StatusBadge status={borrowing.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <dl className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm">
                <dt className="w-36 text-slate-400 font-semibold flex-shrink-0">{k}</dt>
                <dd className="text-slate-800 font-medium">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>

          {/* Equipment Items with Barcode Entry */}
          {borrowing.items?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Equipment Requested</p>
              {borrowing.items.map(item => (
                <BarcodeEntry key={item.id} item={item} borrowingId={borrowing.id} onAssigned={onRefresh} />
              ))}
              <p className="text-[11px] text-slate-400 italic">Scan or enter barcode to assign a specific unit before approving.</p>
            </div>
          )}

          {/* Endorsement Letter */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-400 font-semibold w-36">Endorsement</span>
            {borrowing.documents?.find(d => d.document_type === 'endorsement_letter') ? (
              <button 
                onClick={async () => {
                  const doc = borrowing.documents.find(d => d.document_type === 'endorsement_letter');
                  try {
                    const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `Endorsement_Letter_${borrowing.reference_code}.pdf`); // Adjust extension as needed
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (e) {
                    alert("Failed to view endorsement letter.");
                  }
                }}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View Endorsement Letter
              </button>
            ) : (
              <span className="text-sm font-medium text-slate-400">No Endorsement Letter</span>
            )}
          </div>

          {/* Actions */}
          {borrowing.status === "pending" && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks (optional)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" rows={2} />
              <div className="flex gap-2">
                <button onClick={() => onAction(borrowing.id, "approve", remarks)} disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                  {actionLoading === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve
                </button>
                <button onClick={() => onAction(borrowing.id, "reject", remarks)} disabled={!!actionLoading}
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
                  <button disabled={!notifyMsg.trim()} className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                    Send Notification
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AvrEquipmentBorrowing() {
  const [tab, setTab]               = useState("pending");
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch]         = useState("");
  const debouncedSearch             = useDebounce(search, 300);

  const { data, loading, error, refresh: fetchBorrowings } = useDataCache(
    `avr_equipment_borrowings_${tab}_${page}`,
    `/avr-equipment-borrowings?page=${page}&status=${tab}`
  );

  const borrowings = data?.data ?? [];
  const meta       = data?.meta ?? null;

  const filteredBorrowings = useMemo(() => {
    if (!debouncedSearch.trim()) return borrowings;
    const q = debouncedSearch.toLowerCase();
    return borrowings.filter(b =>
      (b.requestor_name || '').toLowerCase().includes(q) ||
      (b.reference_code || '').toLowerCase().includes(q)
    );
  }, [borrowings, debouncedSearch]);

  const handleAction = async (id, type, remarks) => {
    setActionLoading(type);
    try {
      await api.post(`/avr-equipment-borrowings/${id}/${type}`, { remarks: remarks || null });
      setSelected(null);
      fetchBorrowings();
    } catch (e) { alert(e.response?.data?.message ?? "Action failed."); }
    finally { setActionLoading(null); }
  };

  const openDetail = async (b) => {
    try {
      const { data } = await api.get(`/avr-equipment-borrowings/${b.id}`);
      setSelected(data);
    } catch { setSelected(b); }
  };

  const switchTab = (key) => { setTab(key); setPage(1); setSearch(""); };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Equipment Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Equipment Borrowing Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Process equipment checkout, barcode assignment, returns, and inspection
          </p>
        </div>

        <button
          onClick={fetchBorrowings}
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

      {/* Controls: Tabs & Search */}
      <AppCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by requestor or tracking code..."
          className="w-full sm:w-72"
        />
      </AppCard>

      {/* Main Table */}
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
                  {["#", "Tracking No.", "Filer", "Type", "Equipment", "Date", "Time", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBorrowings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-xs">No {tab.replace("_"," ")} borrowings found.</td></tr>
                ) : (
                  filteredBorrowings.map((b, i) => {
                    const equipment = b.items?.map(it => it.equipmentType?.name).filter(Boolean).join(", ") ?? "—";
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400">{((page - 1) * 20) + i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{b.reference_code ?? `EB-${String(b.id).padStart(5,"0")}`}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-800 text-xs">{b.requestor_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{b.requestor_identity_type ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-700 truncate max-w-[140px] font-medium">{equipment}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{b.start_datetime ? new Date(b.start_datetime).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{b.start_datetime ? new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(b)} title="Manage borrowing"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

      {selected && (
        <DetailModal borrowing={selected} onClose={() => setSelected(null)}
          onAction={handleAction} actionLoading={actionLoading}
          onRefresh={async () => { const { data } = await api.get(`/avr-equipment-borrowings/${selected.id}`); setSelected(data); }} />
      )}
    </div>
  );
}
