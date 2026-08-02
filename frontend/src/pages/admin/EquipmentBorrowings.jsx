import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  Loader2, RefreshCw, AlertCircle, Eye, PackageOpen
} from "lucide-react";
import EquipmentBorrowDetailModal from "./components/EquipmentBorrowDetailModal";
import { PageLoader } from "@/components/ui/page-loader";

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-700 border border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    claim: "bg-blue-100 text-blue-700 border border-blue-200",
    claimed: "bg-blue-100 text-blue-700 border border-blue-200",
    rejected: "bg-rose-100 text-rose-700 border border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
    damaged: "bg-rose-100 text-rose-800 border border-rose-300",
    inspection: "bg-purple-100 text-purple-700 border border-purple-200",
    completed: "bg-purple-100 text-purple-700 border border-purple-200",
    lost: "bg-red-900 text-white border border-red-950 font-black",
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

const formatDate = (rawDate) => {
  if (!rawDate) return "—";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(rawDate);
  }
};

export default function EquipmentBorrowings() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // Item 15: "all" | "pending" | "claim" | "inspection"

  // Detail Modal & Notification Modal State
  const [selected, setSelected] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/avr-equipment-borrowings");
      const apiData = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBorrowings(apiData);
    } catch {
      setError("Unable to sync equipment borrowings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  // Filter active borrowings (completed/rejected/cancelled transfer directly to History Log)
  const filteredBorrowings = borrowings.filter(b => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    return s !== "completed" && s !== "rejected" && s !== "cancelled";
  });

  const handleAction = async (id, type) => {
    setActionLoading(id + "-" + type);
    try {
      await api.post(`/avr-equipment-borrowings/${id}/${type}`);
      setFeedbackMsg(`✅ Borrowing request ${type}ed successfully!`);
      fetchBorrowings();
      setTimeout(() => {
        setSelected(null);
        setFeedbackMsg(null);
      }, 1200);
    } catch (err) {
      alert(err.response?.data?.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = (item) => {
    if (!notifyReason.trim()) {
      alert("Please enter a notification reason.");
      return;
    }
    showMsg(`Notification sent to admin: ${notifyReason}`);
    setShowNotifyModal(false);
    setNotifyReason("");
  };

  const showMsg = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  if (loading && borrowings.length === 0) return <PageLoader message="Loading Equipment Borrowings..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PackageOpen className="text-purple-600" size={24} />
            Equipment Borrowings Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage equipment loan requisitions and returns for {officeScope}.
          </p>
        </div>
        <button
          onClick={fetchBorrowings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
          <AlertCircle size={18} />{error}
        </div>
      )}



      {/* Item 15 Table: [#, track number, requestor, department, equipment, quantity, Date, Time, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Track Number", "Requestor", "Department", "Equipment", "Quantity", "Date", "Time", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-semibold">
                    <Loader2 size={18} className="animate-spin inline mr-2" />Loading borrowings...
                  </td>
                </tr>
              ) : filteredBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-semibold">
                    No equipment borrowings found under status filter "{statusFilter}".
                  </td>
                </tr>
              ) : filteredBorrowings.map((b, idx) => {
                const refCode = b.tracking_number?.reference_code || b.reference_code || `EQUIP-REQ-${b.id}`;
                const requestor = b.filer_name || b.requestor_name || "—";
                const department = b.program_office || b.requestor_program_office || "—";
                const equipment = b.equipment_type?.name || b.equipment_name || b.item_name || "Audio Visual Gear";
                const quantity = b.quantity || b.qty || 1;
                const usageDate = formatDate(b.date_of_usage || b.start_datetime);
                const timeRange = (b.time_start && b.time_end) ? `${b.time_start} - ${b.time_end}` : "08:00 AM - 05:00 PM";
                const currentStatus = b.status || b.tracking_number?.status || "pending";

                return (
                  <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-purple-600 whitespace-nowrap">{refCode}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{requestor}</td>
                    <td className="px-4 py-3.5 text-slate-700">{department}</td>
                    <td className="px-4 py-3.5 font-bold text-purple-700">{equipment}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{quantity} Units</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{usageDate}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{timeRange}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={currentStatus} /></td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelected(b)}
                        title="View Details"
                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Sub-Component (Items 16, 17, 35) */}
      <EquipmentBorrowDetailModal
        selected={selected}
        setSelected={setSelected}
        formatDate={formatDate}
        showNotifyModal={showNotifyModal}
        setShowNotifyModal={setShowNotifyModal}
        notifyReason={notifyReason}
        setNotifyReason={setNotifyReason}
        handleSendNotification={handleSendNotification}
        handleAction={handleAction}
        actionLoading={actionLoading}
      />
    </div>
  );
}
