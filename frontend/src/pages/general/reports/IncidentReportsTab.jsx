import { useState, useMemo, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { formatDate } from "@/lib/dateUtils";
import EvidenceLightboxModal from "@/pages/general/components/booking-modal/EvidenceLightboxModal";

export default function IncidentReportsTab({
  venueBookings = [],
  equipmentBorrowings = [],
  equipmentUnits = [],
  onRefresh,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [lightboxPhotos, setLightboxPhotos] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetType, setTargetType] = useState("equipment_unit");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  
  // Dynamic equipment units list (can add another dropdown and remove)
  const [selectedUnitEntries, setSelectedUnitEntries] = useState([
    { unitId: "", condition: "Damaged" }
  ]);

  const [reportType, setReportType] = useState("Incident Report");
  const [condition, setCondition] = useState("Damaged");
  const [violationType, setViolationType] = useState("Damage");
  const [notes, setNotes] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidencePreviews, setEvidencePreviews] = useState([]);

  // Fetch all reports from backend
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/inspections");
      const list = Array.isArray(res.data) ? res.data : [];
      setReports(list);
    } catch (err) {
      console.error("Failed to load incident reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Real-time update listeners
  useEffect(() => {
    const handleSync = () => fetchReports();
    window.addEventListener("equipment_updated", handleSync);
    window.addEventListener("equipment_inventory_updated", handleSync);
    return () => {
      window.removeEventListener("equipment_updated", handleSync);
      window.removeEventListener("equipment_inventory_updated", handleSync);
    };
  }, [fetchReports]);

  // Dynamic unit entries handlers
  const handleAddUnitEntry = () => {
    setSelectedUnitEntries((prev) => [...prev, { unitId: "", condition: "Damaged" }]);
  };

  const handleRemoveUnitEntry = (index) => {
    if (selectedUnitEntries.length > 1) {
      setSelectedUnitEntries((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleUnitEntryChange = (index, field, value) => {
    setSelectedUnitEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (typeFilter !== "all" && item.target_type !== typeFilter) {
        return false;
      }

      if (conditionFilter !== "all") {
        const c = String(item.condition || "").toLowerCase();
        const v = String(item.violation_type || "").toLowerCase();
        const n = String(item.notes || "").toLowerCase();
        const isDam = c.includes("damage") || v.includes("damage") || n.includes("damage");
        const isL = c.includes("lost") || v.includes("lost") || n.includes("lost");
        const isVio = Boolean(item.violation_type) || c.includes("violation") || n.includes("violation");

        if (conditionFilter === "damaged" && !isDam) return false;
        if (conditionFilter === "lost" && !isL) return false;
        if (conditionFilter === "violation" && !isVio) return false;
        if (conditionFilter === "good" && (isDam || isL || isVio)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const refMatch = String(item.target_code || "").toLowerCase().includes(q);
        const nameMatch = String(item.target_name || "").toLowerCase().includes(q);
        const filerMatch = String(item.target_filer || "").toLowerCase().includes(q);
        const notesMatch = String(item.notes || "").toLowerCase().includes(q);
        const inspectorMatch = String(item.inspected_by_name || "").toLowerCase().includes(q);
        const violationMatch = String(item.violation_type || "").toLowerCase().includes(q);
        if (!refMatch && !nameMatch && !filerMatch && !notesMatch && !inspectorMatch && !violationMatch) {
          return false;
        }
      }

      return true;
    });
  }, [reports, typeFilter, conditionFilter, searchQuery]);

  // Counters
  const stats = useMemo(() => {
    let venueCount = 0;
    let borrowCount = 0;
    let unitCount = 0;
    let damagedCount = 0;
    let lostCount = 0;

    reports.forEach((r) => {
      if (r.target_type === "venue_booking") venueCount++;
      else if (r.target_type === "equipment_borrow") borrowCount++;
      else if (r.target_type === "equipment_unit") unitCount++;

      const c = String(r.condition || "").toLowerCase();
      const v = String(r.violation_type || "").toLowerCase();
      const n = String(r.notes || "").toLowerCase();
      if (c.includes("damage") || v.includes("damage") || n.includes("damage")) damagedCount++;
      else if (c.includes("lost") || v.includes("lost") || n.includes("lost")) lostCount++;
    });

    return {
      total: reports.length,
      venueCount,
      borrowCount,
      unitCount,
      damagedCount,
      lostCount,
    };
  }, [reports]);

  // Handle Photo selection
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setEvidenceFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setEvidencePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (idx) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit new report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      notify.error("Description Required", "Please provide a detailed description of the incident.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (targetType === "equipment_unit") {
        const validEntries = selectedUnitEntries.filter((entry) => Boolean(entry.unitId));
        if (validEntries.length === 0) {
          notify.error("Selection Required", "Please select at least one equipment unit.");
          setIsSubmitting(false);
          return;
        }

        // Submit for each selected equipment unit
        for (const entry of validEntries) {
          const formData = new FormData();
          formData.append("reference_id", entry.unitId);
          formData.append("inspectable_id", entry.unitId);
          formData.append("reference_type", "equipment_unit");
          formData.append("inspectable_type", "equipment_unit");
          formData.append("inspection_type", reportType);
          formData.append("condition", entry.condition || "Damaged");
          formData.append("violation_type", violationType);
          formData.append("notes", notes.trim());

          evidenceFiles.forEach((file) => {
            formData.append("evidence_photos[]", file);
          });

          await api.post("/inspections", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      } else {
        if (!selectedTargetId) {
          notify.error("Selection Required", `Please select a target ${targetType.replace('_', ' ')} record.`);
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append("reference_id", selectedTargetId);
        formData.append("inspectable_id", selectedTargetId);
        formData.append("reference_type", targetType);
        formData.append("inspectable_type", targetType);
        formData.append("inspection_type", reportType);
        formData.append("condition", condition);
        formData.append("violation_type", violationType);
        formData.append("notes", notes.trim());

        evidenceFiles.forEach((file) => {
          formData.append("evidence_photos[]", file);
        });

        await api.post("/inspections", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      notify.success("Report Submitted", "Incident report saved successfully.");
      setShowCreateModal(false);
      setNotes("");
      setEvidenceFiles([]);
      setEvidencePreviews([]);
      setSelectedTargetId("");
      setSelectedUnitEntries([{ unitId: "", condition: "Damaged" }]);

      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try { localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString()); } catch {}

      fetchReports();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit report. Please try again.";
      notify.error("Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Target options for booking / borrowing
  const targetOptions = useMemo(() => {
    if (targetType === "venue_booking") {
      return (venueBookings || []).map((vb) => ({
        id: vb.id,
        label: `${vb.reference_code || `TRK-VB-${vb.id}`} — ${vb.venue_name || vb.venue?.name || 'Venue'} (${vb.applicant_name || vb.filer_name || 'Applicant'}) • ${formatDate(vb.reservation_date || vb.date_of_usage)}`,
      }));
    }
    if (targetType === "equipment_borrow") {
      return (equipmentBorrowings || []).map((eb) => ({
        id: eb.id,
        label: `${eb.reference_code || eb.tracking_number?.reference_code || `TRK-EB-${eb.id}`} — ${eb.applicant_name || eb.filer_name || eb.requestor || 'Borrower'} • ${formatDate(eb.date_of_usage || eb.start_datetime)}`,
      }));
    }
    return [];
  }, [targetType, venueBookings, equipmentBorrowings]);

  // Unit lookup helper to auto display condition
  const getUnitCondition = useCallback((unitId) => {
    if (!unitId) return null;
    const matched = (equipmentUnits || []).find((u) => String(u.id) === String(unitId));
    if (!matched) return null;
    return matched.condition || matched.raw_condition || matched.status || "Good";
  }, [equipmentUnits]);

  // Condition & Status badge renderer for both Venue Bookings and Equipment Borrowings
  const renderConditionStatus = (item) => {
    const cond = String(item.condition || "").toLowerCase();
    const violation = String(item.violation_type || "").trim();
    const notesLower = String(item.notes || "").toLowerCase();

    // Damage check (via violation_type, condition, or notes)
    const isDamage = cond.includes("damage") || violation.toLowerCase().includes("damage") || notesLower.includes("damage");

    // Lost check
    const isLost = cond.includes("lost") || violation.toLowerCase().includes("lost") || notesLower.includes("lost");

    // Late / Overtime check
    const isLate = Boolean(item.is_late || item.timeliness === "late" || violation.toLowerCase().includes("late") || violation.toLowerCase().includes("overtime"));

    // Equipment unit breakdown if present
    let unitSummary = null;
    if (item.unit_conditions) {
      try {
        const uConds = typeof item.unit_conditions === "string" ? JSON.parse(item.unit_conditions) : item.unit_conditions;
        const values = Array.isArray(uConds) ? uConds.map(u => typeof u === "object" ? u.condition : u) : Object.values(uConds);
        const damagedCount = values.filter(v => String(v).toLowerCase().includes("damage")).length;
        const lostCount = values.filter(v => String(v).toLowerCase().includes("lost")).length;
        if (damagedCount > 0 || lostCount > 0) {
          unitSummary = [damagedCount > 0 && `${damagedCount} Damaged`, lostCount > 0 && `${lostCount} Lost`].filter(Boolean).join(", ");
        }
      } catch {}
    }

    if (isDamage) {
      const label = violation && violation.toLowerCase().includes("damage") ? violation : (item.target_type === "venue_booking" ? "Property Damaged" : "Damaged");
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 w-fit">
            {label}
          </span>
          {unitSummary && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{unitSummary}</span>}
        </div>
      );
    }

    if (isLost) {
      const label = violation && violation.toLowerCase().includes("lost") ? violation : "Lost";
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 w-fit">
            {label}
          </span>
          {unitSummary && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{unitSummary}</span>}
        </div>
      );
    }

    if (isLate) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 w-fit">
          {violation || "Late Return"}
        </span>
      );
    }

    if (violation && violation !== "None") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 w-fit">
          {violation}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 w-fit">
        {item.target_type === "venue_booking" ? "Satisfactory / Clean" : "Good Condition"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Badges (Flat Design) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reports</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Venue Bookings</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.venueCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Equipment Borrows</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.borrowCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Equipment Units</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.unitCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Damaged & Lost</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {stats.damagedCount + stats.lostCount}
          </p>
        </div>
      </div>

      {/* Action & Filter Toolbar (Flat Design) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="min-w-[240px] flex-1 md:flex-initial">
            <input
              type="text"
              placeholder="Search reference, notes, unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Target Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="venue_booking">Venue Bookings</option>
            <option value="equipment_borrow">Equipment Borrowings</option>
            <option value="equipment_unit">Equipment Units</option>
          </select>

          {/* Condition Filter (Single Word Options) */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all">All Conditions</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
            <option value="violation">Violation</option>
            <option value="good">Good</option>
          </select>
        </div>

        {/* Primary Action Button (Flat Design, Plain Text) */}
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setSelectedUnitEntries([{ unitId: "", condition: "Damaged" }]);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 w-full md:w-auto text-center"
        >
          File Report
        </button>
      </div>

      {/* Main Table Area (Flat Design) */}
      <div id="printable-report-area" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Target Item</th>
                <th className="py-3 px-4">Condition / Status</th>
                <th className="py-3 px-4">Reporter</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Evidence</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    Loading reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    No incident or damage reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((item, idx) => {
                  const photos = Array.isArray(item.evidence_photos) ? item.evidence_photos : (item.evidence_photo ? [item.evidence_photo] : []);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block text-xs">
                          {formatDate(item.inspected_at || item.created_at)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.inspected_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {item.target_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[240px]">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block truncate" title={item.target_code}>
                          {item.target_code || `REF-#${item.id}`}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5" title={item.target_name}>
                          {item.target_name || "General Facility / Item"}
                        </span>
                        {item.target_filer && (
                          <span className="text-[10px] text-slate-400 font-medium block truncate">
                            by {item.target_filer}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderConditionStatus(item)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.inspected_by_name || "Staff"}
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2" title={item.notes}>
                          {item.notes || "No notes logged."}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {photos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxPhotos(photos);
                              setLightboxIndex(0);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            {photos.length} Photo{photos.length > 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(item)}
                          className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                        >
                          View
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

      {/* ── WRITE / FILE NEW REPORT MODAL (Side-by-Side Design, Plain Text, Flat Design, No Icons) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 space-y-5 my-8">
            {/* Header (No Icon, Flat Design) */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  File Incident, Damage, or Inspection Report
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Record physical damages, missing equipment components, or policy violations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-base font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-5">
              {/* Category Selector (Plain Text Buttons, Flat) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Report Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("equipment_unit");
                      setSelectedTargetId("");
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer text-center ${
                      targetType === "equipment_unit"
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Equipment Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("venue_booking");
                      setSelectedTargetId("");
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer text-center ${
                      targetType === "venue_booking"
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Venue Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("equipment_borrow");
                      setSelectedTargetId("");
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer text-center ${
                      targetType === "equipment_borrow"
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Equipment Borrow
                  </button>
                </div>
              </div>

              {/* Side-by-Side Form Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* ── LEFT COLUMN: Target Selection & Condition ── */}
                <div className="space-y-4">
                  {targetType === "equipment_unit" ? (
                    /* Equipment Units: Multiple dropdown rows with add/remove and auto-displaying condition */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Equipment Units ({selectedUnitEntries.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddUnitEntry}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          + Add Unit Dropdown
                        </button>
                      </div>

                      {selectedUnitEntries.map((entry, idx) => {
                        const currentCond = getUnitCondition(entry.unitId);

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500 uppercase">
                                Unit #{idx + 1}
                              </span>
                              {selectedUnitEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnitEntry(idx)}
                                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {/* Dropdown for equipment unit */}
                            <select
                              required
                              value={entry.unitId}
                              onChange={(e) => handleUnitEntryChange(idx, "unitId", e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                              <option value="">— Select equipment unit —</option>
                              {(equipmentUnits || []).map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.serial_number || u.barcode} — {u.name || u.equipment_type?.name || 'Unit'} ({u.category || 'General'})
                                </option>
                              ))}
                            </select>

                            {/* Side-by-side: Auto displayed current condition & Report condition */}
                            <div className="grid grid-cols-2 gap-2 pt-1 items-center">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                  Current Status
                                </span>
                                <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {currentCond ? currentCond : "Not selected"}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                  Report Condition
                                </span>
                                <select
                                  value={entry.condition}
                                  onChange={(e) => handleUnitEntryChange(idx, "condition", e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                                >
                                  <option value="Damaged">Damaged</option>
                                  <option value="Lost">Lost</option>
                                  <option value="Under Repair">Under Repair</option>
                                  <option value="Violation">Violation</option>
                                  <option value="Good">Good</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Venue Booking or Equipment Borrow Target */
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                          Select {targetType.replace('_', ' ')} Record
                        </label>
                        <select
                          required
                          value={selectedTargetId}
                          onChange={(e) => setSelectedTargetId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 cursor-pointer"
                        >
                          <option value="">— Select {targetType.replace('_', ' ')} record —</option>
                          {targetOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                            Condition
                          </label>
                          <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            <option value="Damaged">Damaged</option>
                            <option value="Lost">Lost</option>
                            <option value="Under Repair">Under Repair</option>
                            <option value="Violation">Violation</option>
                            <option value="Good">Good</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                            Tag
                          </label>
                          <select
                            value={violationType}
                            onChange={(e) => setViolationType(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            <option value="Damage">Damage</option>
                            <option value="Missing Component">Missing Component</option>
                            <option value="Malfunction">Malfunction</option>
                            <option value="Defacement">Defacement</option>
                            <option value="Overtime">Overtime</option>
                            <option value="Violation">Violation</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Violation tag for equipment units */}
                  {targetType === "equipment_unit" && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                        Violation / Defect Tag
                      </label>
                      <select
                        value={violationType}
                        onChange={(e) => setViolationType(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                      >
                        <option value="Damage">Damage</option>
                        <option value="Missing Component">Missing Component</option>
                        <option value="Malfunction">Malfunction</option>
                        <option value="Wear">Wear</option>
                        <option value="Violation">Violation</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN: Notes & Photos ── */}
                <div className="space-y-4">
                  {/* Detailed Description / Findings */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Incident Notes & Physical Findings *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Detail the observed damage, missing cables, borrower explanations, or room condition..."
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 leading-relaxed"
                    />
                  </div>

                  {/* Evidence Photos Upload (Flat, Plain Text) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Evidence Photos (Optional)
                      </label>
                      <label className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
                        + Add Photo
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {evidencePreviews.length === 0 ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-center text-xs text-slate-400">
                        No photos attached. Click "+ Add Photo" to attach photos.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {evidencePreviews.map((src, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden group">
                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(i)}
                              className="absolute inset-0 bg-slate-950/70 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions (Flat Design, Plain Text) */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Report Details Modal (Flat Design, Plain Text, No Icons) */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                  {selectedReport.target_code || `REP-${selectedReport.id}`}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedReport.target_name || "Inspection Report"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-base font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">
                    {selectedReport.target_type?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Condition</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 capitalize">
                    {selectedReport.condition || "Good"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Reporter</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedReport.inspected_by_name || "Staff"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Date & Time</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {formatDate(selectedReport.inspected_at || selectedReport.created_at)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notes</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedReport.notes || "No notes recorded."}
                </div>
              </div>

              {selectedReport.evidence_photos && selectedReport.evidence_photos.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Evidence Photos</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.evidence_photos.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLightboxPhotos(selectedReport.evidence_photos);
                          setLightboxIndex(idx);
                        }}
                        className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Evidence Photos */}
      {lightboxPhotos && (
        <EvidenceLightboxModal
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxPhotos(null)}
        />
      )}
    </div>
  );
}
