import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  History, CheckCircle, Building2, PackageOpen, Search, Loader2,
  Eye, Pencil, CheckCircle2, X, AlertTriangle, ChevronLeft, ChevronRight, MoreVertical,
  ArrowUpDown, Download, ChevronDown, FileSpreadsheet, Layers, Trash2
} from "lucide-react";
import notify from "@/lib/notify";
import { PageLoader } from "@/components/ui/page-loader";
import { formatDate, formatTime, formatTimeRange } from "@/lib/dateUtils";
import HistoryTable from "./history/HistoryTable";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  exportVenueHistoryToCsv,
  exportEquipmentHistoryToCsv,
} from "./history/exportHistoryCsvHelper";
import {
  exportVenueHistoryToExcel,
  exportEquipmentHistoryToExcel,
  exportAllHistoryToExcel,
} from "./history/exportHistoryExcelHelper";
import AcademicTermSelect from "@/components/ui/AcademicTermSelect";
import FilterDropdown from "@/components/ui/FilterDropdown";
import ExportButton from "@/components/ui/ExportButton";
import ExportModal, { filterRecordsByBounds } from "@/components/ui/ExportModal";

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
        className="z-[9999] bg-white border border-slate-200 rounded-xl shadow-sm p-1.5 w-34 space-y-0.5 text-xs font-bold animate-in zoom-in-95"
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
  const { hasPermission, isSuperAdmin } = usePermissions();
  const context = useOutletContext();
  const location = useLocation();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [historyType, setHistoryType] = useState("venue"); // "venue" | "equipment" | "incidents"
  const [venueHistory, setVenueHistory] = useState([]);
  const [equipmentHistory, setEquipmentHistory] = useState([]);
  const [incidentsHistory, setIncidentsHistory] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [loading, setLoading] = useState(true);

  // Sorting: "completed_desc" = Newest, "completed_asc" = Oldest
  const [sortBy, setSortBy] = useState("completed_desc");

  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuEl, setActiveMenuEl] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, payload: null, title: "", message: "", variant: "warning", confirmLabel: "Confirm" });

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

  const fetchHistory = useCallback(async (opts = false) => {
    if (!hasPermission("history_log")) {
      setLoading(false);
      return;
    }
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent) setIsSyncing(true);
    try {
      const termParam = selectedTermId ? `&academic_term_id=${selectedTermId}` : "";
      const res = await api.get(`/general/history-log?type=all${termParam}`);
      const vb = res.data?.venue_bookings || [];
      const eb = res.data?.equipment_borrowings || [];
      const inc = res.data?.incidents || [];

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
      if (inc.length > 0) localStorage.setItem("fsuu_history_incidents", JSON.stringify(inc));

      setVenueHistory(mappedVb);
      setEquipmentHistory(mappedEb);
      setIncidentsHistory(inc);
    } catch {
      try {
        const localVb = JSON.parse(localStorage.getItem("fsuu_history_venue_bookings") || "[]");
        const localEb = JSON.parse(localStorage.getItem("fsuu_history_equipment_borrowings") || "[]");
        const localInc = JSON.parse(localStorage.getItem("fsuu_history_incidents") || "[]");
        setVenueHistory(localVb);
        setEquipmentHistory(localEb);
        setIncidentsHistory(localInc);
      } catch {
        setVenueHistory([]);
        setEquipmentHistory([]);
        setIncidentsHistory([]);
      }
    } finally {
      setLoading(false);
      if (!isSilent) setIsSyncing(false);
    }
  }, [selectedTermId]);

  useRealtimeSync(fetchHistory, { interval: 30000, deps: [selectedTermId] });

  // Deep-link from notification navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get("id") || location.state?.selectedId;
    const targetType = params.get("type") || location.state?.targetType;
    const targetRef = params.get("trk") || params.get("ref");

    if (targetType === "incident" || targetType === "incidents" || targetType === "damaged_unit" || targetType === "lost_unit" || targetType === "policy_violation") {
      setHistoryType("incidents");
    } else if (targetType === "equipment" || targetType === "equipment_borrow") {
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

  const handleDeleteHistory = (id, refCode, type) => {
    setConfirmModal({
      open: true,
      action: "disable",
      payload: { id, refCode, type },
      title: "Clear History Record",
      message: `Clear record "${refCode}" from your history view? All statistical reports, analytics, and audit logs remain permanently preserved.`,
      variant: "delete",
      confirmLabel: "Yes, Clear from History"
    });
  };

  const processDeleteHistory = async ({ id, refCode, type }) => {
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
      setFeedback(`Record "${refCode}" cleared from history.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // Rollback
      setVenueHistory(prevVenue);
      setEquipmentHistory(prevEquip);
      setFeedback(`Failed to clear "${refCode}" — changes reverted.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleClearAllHistory = () => {
    const targetLabel = historyType === "venue" ? "Venue Bookings" : "Equipment Borrowings";
    setConfirmModal({
      open: true,
      action: "clear_all",
      payload: { type: historyType },
      title: `Clear ${targetLabel} History`,
      message: `Are you sure you want to clear completed records in ${targetLabel} history? This removes completed items from this history view while permanently preserving all statistical reports, analytics, and database records.`,
      variant: "delete",
      confirmLabel: "Yes, Clear History"
    });
  };

  const processClearAllHistory = async ({ type }) => {
    try {
      await api.post(`/general/history-log/clear`, {
        type: type || historyType,
        academic_term_id: selectedTermId || null,
      });
      if (type === "venue") {
        setVenueHistory([]);
      } else if (type === "equipment") {
        setEquipmentHistory([]);
      } else {
        setVenueHistory([]);
        setEquipmentHistory([]);
      }
      notify.success("History Cleared", "Historical data has been successfully cleared.");
      fetchHistory(true);
    } catch (err) {
      console.error("Failed to clear history log:", err);
      notify.error("Clear Failed", "Could not clear history data. Please try again.");
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

  const filterIncidentRecord = (inc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const ref = (inc.reference_code || "").toLowerCase();
      const filer = (inc.filer_name || "").toLowerCase();
      const dept = (inc.department || inc.program_office || "").toLowerCase();
      const item = (inc.facility_or_item || "").toLowerCase();
      const label = (inc.incident_label || "").toLowerCase();
      const notes = (inc.notes || "").toLowerCase();
      const barcodes = Array.isArray(inc.flagged_units) ? inc.flagged_units.join(" ").toLowerCase() : "";
      if (!ref.includes(q) && !filer.includes(q) && !dept.includes(q) && !item.includes(q) && !label.includes(q) && !notes.includes(q) && !barcodes.includes(q)) {
        return false;
      }
    }
    return true;
  };

  const sortIncidentRecords = (list) => {
    return [...list].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (sortBy === "completed_asc") {
        return dateA.localeCompare(dateB);
      }
      return dateB.localeCompare(dateA); // Default: newest first
    });
  };

  const filteredVenues = useMemo(
    () => sortRecords(venueHistory.filter((b) => filterRecord(b, true)), true),
    [venueHistory, searchQuery, sortBy]
  );
  const filteredEquipment = useMemo(
    () => sortRecords(equipmentHistory.filter((b) => filterRecord(b, false)), false),
    [equipmentHistory, searchQuery, sortBy]
  );
  const filteredIncidents = useMemo(
    () => sortIncidentRecords(incidentsHistory.filter(filterIncidentRecord)),
    [incidentsHistory, searchQuery, sortBy]
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [historyType, searchQuery, sortBy, itemsPerPage]);

  const activeList = historyType === "venue"
    ? filteredVenues
    : filteredEquipment;
  const ITEMS_PER_PAGE = itemsPerPage;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE)), [activeList.length, ITEMS_PER_PAGE]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = useMemo(() => {
    return activeList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeList, startIndex, ITEMS_PER_PAGE]);

  // Export State & Handlers (shared ExportButton + ExportModal)
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const currentTermLabel = useMemo(() => {
    if (!selectedTermId) return "";
    const term = academicTerms.find((t) => String(t.id) === String(selectedTermId));
    return term?.name || "";
  }, [selectedTermId, academicTerms]);

  const handleExport = async ({ format, scope, bounds }) => {
    const venues = filterRecordsByBounds(filteredVenues, bounds);
    const equipment = filterRecordsByBounds(filteredEquipment, bounds);

    const hasRecords =
      scope === "venue" ? venues.length > 0 :
      scope === "equipment" ? equipment.length > 0 :
      venues.length + equipment.length > 0;

    if (!hasRecords) {
      notify.warning("No Records to Export", "No history records match the selected scope and timeframe.");
      return;
    }

    setIsExportingExcel(true);
    try {
      if (format === "csv") {
        if ((scope === "venue" || scope === "combined") && venues.length > 0) {
          exportVenueHistoryToCsv(venues, currentTermLabel);
        }
        if ((scope === "equipment" || scope === "combined") && equipment.length > 0) {
          exportEquipmentHistoryToCsv(equipment, currentTermLabel);
        }
        notify.success("Export Complete", "History records exported to CSV.");
      } else {
        if (scope === "venue") {
          await exportVenueHistoryToExcel(venues, currentTermLabel);
        } else if (scope === "equipment") {
          await exportEquipmentHistoryToExcel(equipment, currentTermLabel);
        } else {
          await exportAllHistoryToExcel(venues, equipment, currentTermLabel);
        }
        notify.success("Excel Export Complete", "History records exported to Excel (.xlsx).");
      }
      setShowExportModal(false);
    } catch (err) {
      console.error("History export error:", err);
      notify.error("Export Failed", `Failed to generate file: ${err?.message || "Unknown error"}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

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

  if (loading && venueHistory.length === 0 && equipmentHistory.length === 0) {
    return <PageLoader message="Loading History Log..." />;
  }

  return (
    <div className="space-y-6">

      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-white text-slate-900 text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm border border-slate-300 max-w-md">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Dropdown, Semester Filter, Sort & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Row 1: Category & Academic Term & Sort */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Log Dropdown */}
            <FilterDropdown
              value={historyType}
              onChange={setHistoryType}
              options={[
                { value: "venue", label: "Venue Bookings History" },
                { value: "equipment", label: "Equipment Borrowings History" },
              ]}
              icon={Layers}
              title="Select History Category"
            />

            {academicTerms.length > 0 && (
              <AcademicTermSelect
                terms={academicTerms}
                selectedId={selectedTermId}
                onSelect={(val) => setSelectedTermId(val)}
              />
            )}
          </div>

          {/* Right side: Sort Dropdown & Export Options */}
          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto shrink-0">
            {/* Sort Dropdown */}
            <FilterDropdown
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "completed_desc", label: "Newest" },
                { value: "completed_asc", label: "Oldest" },
              ]}
              icon={ArrowUpDown}
              title="Sort History Records"
            />

            {/* Shared Export Button (opens ExportModal) */}
            <ExportButton
              label="Export"
              onClick={() => setShowExportModal(true)}
              loading={isExportingExcel}
              disabled={filteredVenues.length + filteredEquipment.length === 0}
              title="Export History Log to Excel or CSV"
            />

            {/* Clear History Button (Preserves all Reports & DB) */}
            {(isSuperAdmin || hasPermission("history_log.clear") || hasPermission("history_log")) && (
              <button
                type="button"
                onClick={handleClearAllHistory}
                disabled={(historyType === "venue" ? filteredVenues.length : filteredEquipment.length) === 0}
                title={`Clear completed ${historyType === "venue" ? "venue" : "equipment"} history records (Reports remain preserved)`}
                className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} className="text-rose-600" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}
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
        handleDeleteHistory={handleDeleteHistory}
        onViewIncident={(inc) => {
          if (inc.source_type === "venue" || inc.source_record?.record_type === "venue") {
            setSelectedVenueModal(inc.source_record);
          } else {
            setSelectedEquipModal(inc.source_record);
          }
        }}
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

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={() => {
          setConfirmModal({ ...confirmModal, open: false });
          if (confirmModal.action === "disable") processDeleteHistory(confirmModal.payload);
          if (confirmModal.action === "clear_all") processClearAllHistory(confirmModal.payload);
        }}
        variant={confirmModal.variant}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
      />

      {/* Shared Export Modal — mounted on open so the scope defaults to the current category */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export History Log"
          subtitle="Choose a timeframe, format, and which history records to export."
          formats={["xlsx", "csv"]}
          defaultFormat="xlsx"
          scopeOptions={[
            { id: "venue", label: "Venue Bookings History" },
            { id: "equipment", label: "Equipment Borrowings History" },
            { id: "combined", label: "Combined (Venue + Equipment)" },
          ]}
          defaultScope={historyType}
          recordsByScope={{
            venue: filteredVenues,
            equipment: filteredEquipment,
            combined: { venues: filteredVenues, equipment: filteredEquipment },
          }}
          onExport={handleExport}
          isExporting={isExportingExcel}
        />
      )}
    </div>
  );
}
