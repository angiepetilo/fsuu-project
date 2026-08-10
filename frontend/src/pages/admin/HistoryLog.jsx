import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import {
  History, RefreshCw, CheckCircle, Building2, PackageOpen, Search, Loader2,
  Eye, Trash2, Pencil, CheckCircle2, X, AlertTriangle, ChevronLeft, ChevronRight, RotateCcw, MoreVertical
} from "lucide-react";
import VenueBookingDetailModal from "./components/VenueBookingDetailModal";
import EquipmentBorrowDetailModal from "./components/EquipmentBorrowDetailModal";
import { PageLoader } from "@/components/ui/page-loader";

function ActionMenuPopover({ buttonEl, isOpen, onClose, children }) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      const menuWidth = 135;
      const menuHeight = 160;

      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < menuHeight && rect.top > menuHeight;

      const top = openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4;
      const left = Math.max(10, rect.right - menuWidth);

      setCoords({ top, left });
    }
  }, [isOpen, buttonEl]);

  if (!isOpen || !buttonEl) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] cursor-default bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        style={{
          position: "fixed",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
        className="z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 w-34 space-y-0.5 text-xs font-bold animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
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

const formatTime = (timeStr) => {
  if (!timeStr) return "08:00 AM";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return "08:00 AM - 05:00 PM";
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export default function HistoryLog() {
  const context = useOutletContext();
  const location = useLocation();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [historyType, setHistoryType] = useState("venue"); // "venue" | "equipment"
  const [venueHistory, setVenueHistory] = useState([]);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuEl, setActiveMenuEl] = useState(null);

  // View Details Modal State & Inspection Record States
  const [selectedVenueModal, setSelectedVenueModal] = useState(null);
  const [selectedEquipModal, setSelectedEquipModal] = useState(null);
  const [historyInspectionStatus, setHistoryInspectionStatus] = useState("clean");
  const [historyViolationNotes, setHistoryViolationNotes] = useState("");
  const [historyEvidencePhoto, setHistoryEvidencePhoto] = useState(null);

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

      if (mappedVb.length > 0) localStorage.setItem("fsuu_history_venue_bookings", JSON.stringify(mappedVb));
      if (mappedEb.length > 0) localStorage.setItem("fsuu_history_equipment_borrowings", JSON.stringify(mappedEb));

      setVenueHistory(mappedVb);
      setEquipmentHistory(mappedEb);
    } catch {
      try {
        const localVb = JSON.parse(localStorage.getItem("fsuu_history_venue_bookings") || "[]");
        const localEb = JSON.parse(localStorage.getItem("fsuu_history_equipment_borrowings") || "[]");
        setVenueHistory(localVb);
        setEquipmentHistory(localEb);
      } catch {
        setVenueHistory([]);
        setEquipmentHistory([]);
      }
    } finally {
      setLoading(false);
    }
  }, [historyType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Deep-link from notification navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("id") || location.state?.selectedId;
    const targetType = params.get("type") || location.state?.targetType;
    const targetRef = params.get("trk") || params.get("ref");

    if (targetType === "equipment" || targetType === "equipment_borrow") {
      setHistoryType("equipment");
      if ((targetId || targetRef) && equipmentHistory.length > 0) {
        const match = equipmentHistory.find(e => 
          (targetId && String(e.id) === String(targetId)) ||
          (targetRef && (e.reference_code === targetRef || e.tracking_number?.reference_code === targetRef))
        );
        if (match) setSelectedEquipModal(match);
      }
    } else if (targetType === "venue" || targetType === "venue_booking") {
      setHistoryType("venue");
      if ((targetId || targetRef) && venueHistory.length > 0) {
        const match = venueHistory.find(v => 
          (targetId && String(v.id) === String(targetId)) ||
          (targetRef && (v.reference_code === targetRef || v.tracking_number?.reference_code === targetRef))
        );
        if (match) setSelectedVenueModal(match);
      }
    }
  }, [location.search, location.state, venueHistory, equipmentHistory]);

  const handleUndoHistory = async (id, refCode, type) => {
    if (confirm(`Restore record "${refCode}" back to active ON-GOING status?`)) {
      try {
        await api.post(`/admin/history-log/undo`, { id, type });
        if (type === "venue") {
          setVenueHistory((prev) => prev.filter((v) => v.id !== id));
        } else {
          setEquipmentHistory((prev) => prev.filter((e) => e.id !== id));
        }
        setFeedback(`Record "${refCode}" restored back to ON-GOING status.`);
        setTimeout(() => setFeedback(null), 3000);
      } catch {
        alert("Failed to restore history record.");
      }
    }
  };

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
        setFeedback(`Record "${refCode}" archived.`);
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
      setFeedback(`Status for "${editingRecord.reference_code || editingRecord.id}" updated to ${editStatus.toUpperCase()}!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Search filtering — ONLY show completed, solved, done, damaged, or violation history records
  const filteredVenues = venueHistory.filter((b) => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `TRK-AVR${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    const status = (b.status || b.tracking_number?.status || "").toLowerCase();
    const isCompletedOrDamaged = status === "completed" || status === "solved" || status === "done" || status === "damaged" || status === "violation";
    return isCompletedOrDamaged && (!searchQuery || ref.includes(q) || name.includes(q));
  });

  const filteredEquipment = equipmentHistory.filter((b) => {
    const q = searchQuery.toLowerCase();
    const ref = (b.reference_code || `EQUIP-REQ-${b.id}`).toLowerCase();
    const name = (b.filer_name || b.requestor || "").toLowerCase();
    const status = (b.status || b.tracking_number?.status || "").toLowerCase();
    const isCompletedOrDamaged = status === "completed" || status === "solved" || status === "done" || status === "damaged" || status === "lost" || status === "violation";
    return isCompletedOrDamaged && (!searchQuery || ref.includes(q) || name.includes(q));
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [historyType, searchQuery]);

  const activeList = historyType === "venue" ? filteredVenues : filteredEquipment;
  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = activeList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading && venueHistory.length === 0 && equipmentHistory.length === 0) {
    return <PageLoader message="Loading History Log..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            History Log
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Complete historical records of completed venue reservations and equipment loan activities.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-white text-slate-900 text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xl border border-slate-300 max-w-md">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Dropdown & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Category Log :</label>
          <select
            value={historyType}
            onChange={(e) => setHistoryType(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-slate-400 cursor-pointer"
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
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Venue Bookings Table */}
      {historyType === "venue" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  {["#", "Track Number", "Requestor", "Department", "Venue", "Date", "Time", "Outcome", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
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
                    <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                      No venue booking history records found.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((b, idx) => {
                    const refCode = b.reference_code || b.tracking_number || `TRK-AVR${b.id}`;
                    const requestor = b.filer_name || b.requestor || "FSUU Filer";
                    const department = b.program_office || b.department || "Academic Dept";
                    const venueName = b.venue_name || b.venue || "AVR Auditorium 1";
                    const usageDate = formatDate(b.date_of_usage || b.date);
                    const timeRange = formatTimeRange(b.time_start, b.time_end);
                    const displayIndex = startIndex + idx + 1;
                    const isBreach = (b.status || "").toLowerCase() === "damaged" || Boolean(b.has_damage) || Boolean(b.violation);

                    return (
                      <tr key={`history-log-${historyType}-${b.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono">{displayIndex}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">{refCode}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{requestor}</td>
                        <td className="px-4 py-3 text-slate-700">{department}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">{venueName}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{usageDate}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{timeRange}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isBreach ? (
                            <span className="font-mono text-xs font-bold text-rose-600 uppercase">
                              ● Damaged
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                              ● Good
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (activeMenuId === `v-${b.id}`) {
                                setActiveMenuId(null);
                                setActiveMenuEl(null);
                              } else {
                                setActiveMenuId(`v-${b.id}`);
                                setActiveMenuEl(e.currentTarget);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>

                          <ActionMenuPopover
                            isOpen={activeMenuId === `v-${b.id}`}
                            buttonEl={activeMenuEl}
                            onClose={() => { setActiveMenuId(null); setActiveMenuEl(null); }}
                          >
                            <button
                              type="button"
                              onClick={() => { setSelectedVenueModal(b); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Eye size={13} className="text-slate-600" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleOpenEdit(b, historyType); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Pencil size={13} className="text-slate-600" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleUndoHistory(b.id, refCode, historyType); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <RotateCcw size={13} className="text-slate-600" /> Undo
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleDeleteHistory(b.id, refCode, historyType); setActiveMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </ActionMenuPopover>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredVenues.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 text-xs font-semibold text-slate-600">
              <div>
                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVenues.length)}</span> of{" "}
                <span className="font-bold text-slate-900">{filteredVenues.length}</span> records
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono mr-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equipment Borrowings Table */}
      {historyType === "equipment" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  {["#", "Track Number", "Requestor", "Department", "Equipment", "Quantity", "Date", "Time", "Outcome", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
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
                    <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                      No equipment borrowing history records found.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((b, idx) => {
                    const refCode = b.reference_code || b.tracking_number || `EQUIP-REQ-${b.id}`;
                    const requestor = b.filer_name || b.requestor || "FSUU Filer";
                    const department = b.program_office || b.department || "Academic Dept";
                    const equipment = b.equipment_name || b.equipment || "Epson Digital Projector HD";
                    const quantity = b.quantity || b.qty || 1;
                    const usageDate = formatDate(b.date_of_usage || b.date);
                    const timeRange = formatTimeRange(b.time_start, b.time_end);
                    const displayIndex = startIndex + idx + 1;
                    const isBreach = (b.status || "").toLowerCase() === "damaged" || (b.status || "").toLowerCase() === "lost" || Boolean(b.has_damage) || Boolean(b.violation);

                    return (
                      <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-mono">{displayIndex}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">{refCode}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{requestor}</td>
                        <td className="px-4 py-3 text-slate-700">{department}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">{equipment}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{quantity} Units</td>
                        <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{usageDate}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">{timeRange}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isBreach ? (
                            <span className="font-mono text-xs font-bold text-rose-600 uppercase">
                              ● Damaged
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                              ● Good
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (activeMenuId === `e-${b.id}`) {
                                setActiveMenuId(null);
                                setActiveMenuEl(null);
                              } else {
                                setActiveMenuId(`e-${b.id}`);
                                setActiveMenuEl(e.currentTarget);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>

                          <ActionMenuPopover
                            isOpen={activeMenuId === `e-${b.id}`}
                            buttonEl={activeMenuEl}
                            onClose={() => { setActiveMenuId(null); setActiveMenuEl(null); }}
                          >
                            <button
                              type="button"
                              onClick={() => { setSelectedEquipModal(b); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Eye size={13} className="text-slate-600" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleOpenEdit(b, "equipment"); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Pencil size={13} className="text-slate-600" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleUndoHistory(b.id, refCode, "equipment"); setActiveMenuId(null); setActiveMenuEl(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <RotateCcw size={13} className="text-slate-600" /> Undo
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleDeleteHistory(b.id, refCode, "equipment"); setActiveMenuId(null); }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-bold"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </ActionMenuPopover>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredEquipment.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-white border-t border-slate-200 text-xs font-semibold text-slate-600">
              <div>
                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredEquipment.length)}</span> of{" "}
                <span className="font-bold text-slate-900">{filteredEquipment.length}</span> records
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono mr-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit History Record Status Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Pencil size={16} className="text-slate-600" />
                Edit Record Status ({editingRecord.reference_code || editingRecord.tracking_number || editingRecord.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg border border-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Update Record Status *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:border-slate-400"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Notes / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Fine settled by requestor or equipment replaced..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {editLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
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
          isHistoryView={true}
          formatDate={formatDate}
          formatTimeRange={formatTimeRange}
          feedbackMessage={null}
          showRejectForm={false}
          setShowRejectForm={() => {}}
          rejectionComments=""
          setRejectionComments={() => {}}
          handleAction={() => {}}
          actionLoading={null}
          inspectionStatus={historyInspectionStatus}
          setInspectionStatus={setHistoryInspectionStatus}
          violationNotes={historyViolationNotes}
          setViolationNotes={setHistoryViolationNotes}
          evidencePhoto={historyEvidencePhoto}
          setEvidencePhoto={setHistoryEvidencePhoto}
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
