import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import {
  History, RefreshCw, CheckCircle, Building2, PackageOpen, Search, Loader2,
  Eye, Pencil, CheckCircle2, X, AlertTriangle, ChevronLeft, ChevronRight, RotateCcw, MoreVertical,
  ArrowUpDown
} from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { formatDate, formatTime, formatTimeRange } from "@/lib/dateUtils";
import HistoryTable from "./history/HistoryTable";

const VenueBookingDetailModal = lazy(() => import("./components/VenueBookingDetailModal"));
const EquipmentBorrowDetailModal = lazy(() => import("./components/EquipmentBorrowDetailModal"));
const HistoryEditModal = lazy(() => import("./history/HistoryEditModal"));

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

import { usePermissions } from "@/hooks/usePermissions";

export default function HistoryLog() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();
  const location = useLocation();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [historyType, setHistoryType] = useState("venue"); // "venue" | "equipment"
  const [venueHistory, setVenueHistory] = useState([]);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [loading, setLoading] = useState(true);

  // Sorting: "completed_desc" = Newest, "completed_asc" = Oldest
  const [sortBy, setSortBy] = useState("completed_desc");

  if (!hasPermission("history_log")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <History size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view the History & Audit Trail.
        </p>
      </div>
    );
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuEl, setActiveMenuEl] = useState(null);

  // Fetch academic terms list once
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const res = await api.get("/general/academic-terms");
        if (res.data?.terms) {
          setAcademicTerms(res.data.terms);
          if (res.data.active_term?.id && !selectedTermId) {
            setSelectedTermId(String(res.data.active_term.id));
          }
        }
      } catch (err) {
        console.error("Failed to load academic terms in HistoryLog:", err);
      }
    };
    loadTerms();
  }, []);

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
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const termParam = selectedTermId ? `&academic_term_id=${selectedTermId}` : "";
      const res = await api.get(`/general/history-log?type=all${termParam}`);
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
      setIsSyncing(false);
    }
  }, [selectedTermId]);

  useEffect(() => {
    fetchHistory();

    const handleLiveSync = () => {
      fetchHistory(true);
    };

    window.addEventListener("equipment_inventory_updated", handleLiveSync);
    return () => {
      window.removeEventListener("equipment_inventory_updated", handleLiveSync);
    };
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
        await api.post(`/general/history-log/undo`, { id, type });
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
    if (!confirm(`Disable history record "${refCode}"? It will be hidden from the list.`)) return;
    // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────────────────────────────────
    const prevVenue = venueHistory;
    const prevEquip = equipmentHistory;
    if (type === "venue") {
      setVenueHistory(prev => prev.filter(v => v.id !== id));
    } else {
      setEquipmentHistory(prev => prev.filter(e => e.id !== id));
    }
    try {
      if (type === "venue") {
        await api.delete(`/general/history-log/venue/${id}`);
      } else {
        await api.delete(`/general/history-log/equipment/${id}`);
      }
      setFeedback(`Record "${refCode}" disabled.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // Rollback
      setVenueHistory(prevVenue);
      setEquipmentHistory(prevEquip);
      setFeedback(`Failed to disable "${refCode}" — changes reverted.`);
      setTimeout(() => setFeedback(null), 3000);
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
      await api.post(`/general/history-log/update-status`, {
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

  const selectedOfficeId = context?.selectedOfficeId;

  const activeStatuses = ["pending", "approved", "ongoing", "on-going", "post-inspection", "reserved"];

  // Search and historical status filtering
  const filterRecord = (b, isVenue) => {
    const s = (b.status || b.tracking_number?.status || "").toLowerCase();
    const isHistorical = !activeStatuses.includes(s);
    if (!isHistorical) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const ref = (b.reference_code || (isVenue ? `TRK-AVR${b.id}` : `EQUIP-REQ-${b.id}`)).toLowerCase();
      const name = (b.filer_name || b.requestor || "").toLowerCase();
      const dept = (b.program_office || b.department || "").toLowerCase();
      if (!ref.includes(q) && !name.includes(q) && !dept.includes(q)) return false;
    }

    return true;
  };

  const sortRecords = (list, isVenue) => {
    return [...list].sort((a, b) => {
      const dateA = a.updated_at || a.created_at || (isVenue ? a.date_of_usage : a.borrow_date) || "";
      const dateB = b.updated_at || b.created_at || (isVenue ? b.date_of_usage : b.borrow_date) || "";
      if (sortBy === "completed_asc") {
        return dateA.localeCompare(dateB);
      }
      return dateB.localeCompare(dateA); // Default: newest first
    });
  };

  const filteredVenues = sortRecords(venueHistory.filter((b) => filterRecord(b, true)), true);
  const filteredEquipment = sortRecords(equipmentHistory.filter((b) => filterRecord(b, false)), false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [historyType, searchQuery, sortBy, itemsPerPage]);

  const activeList = historyType === "venue" ? filteredVenues : filteredEquipment;
  const ITEMS_PER_PAGE = itemsPerPage;

  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = activeList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading && venueHistory.length === 0 && equipmentHistory.length === 0) {
    return <PageLoader message="Loading History Log..." />;
  }

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => fetchHistory(false)}
          disabled={loading || isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-white text-slate-900 text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xl border border-slate-300 max-w-md">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Dropdown, Semester Filter, Sort & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Row 1: Category & Academic Term & Sort */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Category Log:</label>
              <select
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="venue">Venue Bookings History</option>
                <option value="equipment">Equipment Borrowings History</option>
              </select>
            </div>

            {academicTerms.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Semester:</label>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="">All Academic Terms (TiDB Archive)</option>
                  {academicTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_active ? "(Active)" : "(Archived)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} /> SORT:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="completed_desc">Newest</option>
              <option value="completed_asc">Oldest</option>
            </select>
          </div>
        </div>

        {/* Row 2: Search Input */}
        <div className="pt-2 border-t border-slate-100">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search ref # or requestor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render History Table Component */}
      <HistoryTable
        historyType={historyType}
        loading={loading}
        filteredRecords={historyType === "venue" ? filteredVenues : filteredEquipment}
        paginatedList={paginatedList}
        startIndex={startIndex}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        activeMenuEl={activeMenuEl}
        setActiveMenuEl={setActiveMenuEl}
        ActionMenuPopover={ActionMenuPopover}
        formatDate={formatDate}
        formatTimeRange={formatTimeRange}
        setSelectedVenueModal={setSelectedVenueModal}
        setSelectedEquipModal={setSelectedEquipModal}
        handleOpenEdit={handleOpenEdit}
        handleUndoHistory={handleUndoHistory}
        handleDeleteHistory={handleDeleteHistory}
      />

      <Suspense fallback={null}>
        {editingRecord && (
          <HistoryEditModal
            editingRecord={editingRecord}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            editNotes={editNotes}
            setEditNotes={setEditNotes}
            editLoading={editLoading}
            onClose={() => setEditingRecord(null)}
            onSave={handleSaveEdit}
          />
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
      </Suspense>
    </div>
  );
}
