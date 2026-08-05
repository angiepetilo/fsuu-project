import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  History, RefreshCw, CheckCircle, Building2, PackageOpen, Search, Loader2,
  Eye, Trash2, Pencil, CheckCircle2, X, AlertTriangle
} from "lucide-react";
import VenueBookingDetailModal from "./components/VenueBookingDetailModal";
import EquipmentBorrowDetailModal from "./components/EquipmentBorrowDetailModal";
import { PageLoader } from "@/components/ui/page-loader";

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

const formatTimeRange = (start, end) => {
  if (!start && !end) return "08:00 AM - 05:00 PM";
  return `${start || "08:00 AM"} - ${end || "05:00 PM"}`;
};

function StatusBadge({ status }) {
  const map = {
    approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    completed: "bg-purple-100 text-purple-700 border border-purple-200",
    rejected: "bg-rose-100 text-rose-700 border border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
    damaged: "bg-rose-100 text-rose-800 border border-rose-300 font-bold",
    lost: "bg-red-900 text-white border border-red-950 font-black",
    solved: "bg-emerald-600 text-white border border-emerald-700 font-black",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status || "completed"}
    </span>
  );
}

export default function HistoryLog() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [historyType, setHistoryType] = useState("venue"); // "venue" | "equipment"
  const [venueHistory, setVenueHistory] = useState([]);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

  // View Details Modal State
  const [selectedVenueModal, setSelectedVenueModal] = useState(null);
  const [selectedEquipModal, setSelectedEquipModal] = useState(null);

  // Edit Status / Solved Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("completed");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/history-log?type=${historyType}`);
      const vb = res.data?.venue_bookings || [];
      const eb = res.data?.equipment_borrowings || [];

      // Include locally saved solved items
      const savedSolved = JSON.parse(localStorage.getItem("fsuu_solved_history_ids") || "[]");

      const mappedVb = vb.map((item) =>
        savedSolved.includes(`venue_${item.id}`) ? { ...item, status: "solved" } : item
      );
      const mappedEb = eb.map((item) =>
        savedSolved.includes(`equip_${item.id}`) ? { ...item, status: "solved" } : item
      );

      setVenueHistory(mappedVb);
      setEquipmentHistory(mappedEb);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [historyType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteHistory = async (id, refCode, type) => {
    if (confirm(`Archive history record "${refCode}"? Soft-delete will apply.`)) {
      try {
        if (type === "venue") {
          await api.delete(`/admin/history-log/venue/${id}`);
          setVenueHistory((prev) => prev.filter((v) => v.id !== id));
        } else {
          await api.delete(`/admin/history-log/equipment/${id}`);
          setEquipmentHistory((prev) => prev.filter((e) => e.id !== id));
        }
        setFeedback(`✅ Record "${refCode}" archived (soft-deleted).`);
        setTimeout(() => setFeedback(null), 3000);
      } catch {
        alert("Failed to soft-delete history record.");
      }
    }
  };

  const handleOpenEdit = (record, type) => {
    setEditingRecord({ ...record, recordType: type });
    setEditStatus(record.status || "completed");
    setEditNotes(record.notes || record.remarks || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditLoading(true);

    const isVenue = editingRecord.recordType === "venue";
    const recordKey = `${isVenue ? "venue" : "equip"}_${editingRecord.id}`;

    // Mark as solved if selected
    if (editStatus === "solved") {
      const savedSolved = JSON.parse(localStorage.getItem("fsuu_solved_history_ids") || "[]");
      if (!savedSolved.includes(recordKey)) {
        savedSolved.push(recordKey);
        localStorage.setItem("fsuu_solved_history_ids", JSON.stringify(savedSolved));
      }
    }

    if (isVenue) {
      setVenueHistory((prev) =>
        prev.map((item) =>
          item.id === editingRecord.id ? { ...item, status: editStatus, notes: editNotes } : item
        )
      );
    } else {
      setEquipmentHistory((prev) =>
        prev.map((item) =>
          item.id === editingRecord.id ? { ...item, status: editStatus, notes: editNotes } : item
        )
      );
    }

    try {
      await api.post(`/admin/history-log/update-status`, {
        id: editingRecord.id,
        type: editingRecord.recordType,
        status: editStatus,
        notes: editNotes,
      });
    } catch {
      // Local fallback saved
    } finally {
      setEditLoading(false);
      setEditingRecord(null);
      setFeedback(`✅ Status for "${editingRecord.reference_code || editingRecord.id}" updated to ${editStatus.toUpperCase()}!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Search filtering — only show records marked as complete / solved
  const filteredVenues = venueHistory.filter((b) => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `TRK-AVR${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    const status = (b.status || b.tracking_number?.status || "").toLowerCase();
    const isCompleted = status === "completed" || status === "solved" || status === "done";
    return isCompleted && (!searchQuery || ref.includes(q) || name.includes(q));
  });

  const filteredEquipment = equipmentHistory.filter((b) => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `EQUIP-REQ-${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    const status = (b.status || b.tracking_number?.status || "").toLowerCase();
    const isCompleted = status === "completed" || status === "solved" || status === "done";
    return isCompleted && (!searchQuery || ref.includes(q) || name.includes(q));
  });


  if (loading && venueHistory.length === 0 && equipmentHistory.length === 0) {
    return <PageLoader message="Loading History Log..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="text-blue-600" size={24} />
            Institutional Audit History Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete historical records of completed venue reservations and equipment loan activities.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle size={16} /> {feedback}
        </div>
      )}

      {/* Category Dropdown & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Select History Category Log:</label>
          <select
            value={historyType}
            onChange={(e) => setHistoryType(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
          >
            <option value="venue">Venue Bookings History</option>
            <option value="equipment">Equipment Borrowings History</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search ref # or requestor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Venue Bookings Table */}
      {historyType === "venue" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {["#", "Track Number", "Requestor", "Department", "Venue", "Date", "Time", "Status", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Loader2 size={18} className="animate-spin inline mr-2" /> Loading history...
                    </td>
                  </tr>
                ) : filteredVenues.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      No venue booking history records found.
                    </td>
                  </tr>
                ) : (
                  filteredVenues.map((b, idx) => {
                    const refCode = b.reference_code || b.tracking_number || `TRK-AVR${b.id}`;
                    const requestor = b.filer_name || b.requestor || "FSUU Filer";
                    const department = b.program_office || b.department || "Academic Dept";
                    const venueName = b.venue_name || b.venue || "AVR Auditorium 1";
                    const usageDate = formatDate(b.date_of_usage || b.date);
                    const timeRange = formatTimeRange(b.time_start, b.time_end);

                    return (
                      <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">{refCode}</td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-900">{requestor}</td>
                        <td className="px-4 py-3.5 text-slate-700">{department}</td>
                        <td className="px-4 py-3.5 font-bold text-blue-700">{venueName}</td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{usageDate}</td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{timeRange}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.status || "completed"} />
                        </td>
                        <td className="px-4 py-3.5 flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedVenueModal(b)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View Exact Booking Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(b, "venue")}
                            className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Edit Status / Mark Solved"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(b.id, refCode, "venue")}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Soft Delete History Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Borrowings Table */}
      {historyType === "equipment" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {["#", "Track Number", "Requestor", "Department", "Equipment", "Quantity", "Date", "Time", "Status", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      <Loader2 size={18} className="animate-spin inline mr-2" /> Loading history...
                    </td>
                  </tr>
                ) : filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      No equipment borrowing history records found.
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((b, idx) => {
                    const refCode = b.reference_code || b.tracking_number || `EQUIP-REQ-${b.id}`;
                    const requestor = b.filer_name || b.requestor || "FSUU Filer";
                    const department = b.program_office || b.department || "Academic Dept";
                    const equipment = b.equipment_name || b.equipment || "Epson Digital Projector HD";
                    const quantity = b.quantity || b.qty || 1;
                    const usageDate = formatDate(b.date_of_usage || b.date);
                    const timeRange = formatTimeRange(b.time_start, b.time_end);

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
                        <td className="px-4 py-3.5">
                          <StatusBadge status={b.status || "completed"} />
                        </td>
                        <td className="px-4 py-3.5 flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedEquipModal(b)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View Exact Borrowing Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(b, "equipment")}
                            className="p-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 cursor-pointer"
                            title="Edit Status / Mark Solved"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(b.id, refCode, "equipment")}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Soft Delete History Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit History Record Status Modal (Supports marking as 'Solved') */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Record Status ({editingRecord.reference_code || editingRecord.tracking_number || editingRecord.id})
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Update Record Status *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                >
                  <option value="completed">Completed</option>
                  <option value="solved">Solved (Fine / Damage Settled)</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                  <option value="approved">Approved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Status Notes / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Fine settled by requestor or equipment replaced..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {editLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Full Detail Modals Triggered on Eye View */}
      {selectedVenueModal && (
        <VenueBookingDetailModal
          selected={selectedVenueModal}
          setSelected={setSelectedVenueModal}
          formatDate={formatDate}
          formatTimeRange={formatTimeRange}
          feedbackMessage={null}
          showRejectForm={false}
          setShowRejectForm={() => {}}
          rejectionComments=""
          setRejectionComments={() => {}}
          handleAction={() => {}}
          actionLoading={null}
          inspectionStatus="clean"
          setInspectionStatus={() => {}}
          violationNotes=""
          setViolationNotes={() => {}}
          evidencePhoto={null}
          setEvidencePhoto={() => {}}
          showNotifyModal={false}
          setShowNotifyModal={() => {}}
          notifyReason=""
          setNotifyReason={() => {}}
        />
      )}

      {selectedEquipModal && (
        <EquipmentBorrowDetailModal
          selected={selectedEquipModal}
          setSelected={setSelectedEquipModal}
          formatDate={formatDate}
          showNotifyModal={false}
          setShowNotifyModal={() => {}}
          notifyReason=""
          setNotifyReason={() => {}}
          handleSendNotification={() => {}}
          handleAction={() => {}}
          actionLoading={null}
        />
      )}
    </div>
  );
}
