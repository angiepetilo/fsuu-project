import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  History, RefreshCw, CheckCircle, Building2, PackageOpen, Search, Loader2,
  Eye, Trash2, AlertCircle
} from "lucide-react";
import VenueBookingDetailModal from "./components/VenueBookingDetailModal";
import EquipmentBorrowDetailModal from "./components/EquipmentBorrowDetailModal";

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
    damaged: "bg-rose-100 text-rose-800 border border-rose-300",
    lost: "bg-red-900 text-white border border-red-950 font-black",
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

  const [historyType, setHistoryType] = useState("venue"); // Item 26: "venue" | "equipment"
  const [venueHistory, setVenueHistory] = useState([]);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Selected Detail Modal State (Item 28)
  const [selectedVenueModal, setSelectedVenueModal] = useState(null);
  const [selectedEquipModal, setSelectedEquipModal] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/history-log?type=${historyType}`);
      const vb = res.data?.venue_bookings || [];
      const eb = res.data?.equipment_borrowings || [];
      setVenueHistory(vb);
      setEquipmentHistory(eb);
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
          setVenueHistory(prev => prev.filter(v => v.id !== id));
        } else {
          await api.delete(`/admin/history-log/equipment/${id}`);
          setEquipmentHistory(prev => prev.filter(e => e.id !== id));
        }
        setFeedback(`✅ Record "${refCode}" archived (soft-deleted).`);
        setTimeout(() => setFeedback(null), 3000);
      } catch {
        alert("Failed to soft-delete history record.");
      }
    }
  };

  // Search filtering
  const filteredVenues = venueHistory.filter(b => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `TRK-AVR${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    return !searchQuery || ref.includes(q) || name.includes(q);
  });

  const filteredEquipment = equipmentHistory.filter(b => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `EQUIP-REQ-${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    return !searchQuery || ref.includes(q) || name.includes(q);
  });

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

      {/* Item 26: Dropdown Selector for Venue Bookings vs Equipment Borrowings */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Select History Category Log:</label>
          <select
            value={historyType}
            onChange={(e) => setHistoryType(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
          >
            <option value="venue">🏛️ Venue Bookings History</option>
            <option value="equipment">📦 Equipment Borrowings History</option>
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

      {/* Item 27: Venue Bookings Table */}
      {historyType === "venue" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {["#", "Track Number", "Requestor", "Department", "Venue", "Date", "Time", "Status", "Action"].map(h => (
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
                    const refCode = b.reference_code || `TRK-AVR${b.id}`;
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
                        <td className="px-4 py-3.5"><StatusBadge status={b.status || "completed"} /></td>
                        {/* Item 28 Action: Eye View & Delete Icons */}
                        <td className="px-4 py-3.5 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedVenueModal(b)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View History Details"
                          >
                            <Eye size={14} />
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

      {/* Item 27: Equipment Borrowings Table */}
      {historyType === "equipment" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {["#", "Track Number", "Requestor", "Department", "Equipment", "Quantity", "Date", "Time", "Status", "Action"].map(h => (
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
                    const refCode = b.reference_code || `EQUIP-REQ-${b.id}`;
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
                        <td className="px-4 py-3.5"><StatusBadge status={b.status || "completed"} /></td>
                        {/* Item 28 Action: Eye View & Delete Icons */}
                        <td className="px-4 py-3.5 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedEquipModal(b)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View History Details"
                          >
                            <Eye size={14} />
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

      {/* Item 28: Existing Detail Modals Triggered on Eye View */}
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
