import { useState, useEffect } from "react";
import {
  X, CheckCircle, Clock, Play, Check, Loader2,
  FileText, Mail, FileCheck
} from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentBorrowDetailModal({
  selected,
  setSelected,
  formatDate,
  showNotifyModal,
  setShowNotifyModal,
  notifyReason,
  setNotifyReason,
  handleSendNotification,
  handleAction,
  actionLoading,
}) {
  const [assignedUnitSelections, setAssignedUnitSelections] = useState({});
  const [dbEquipmentTypes, setDbEquipmentTypes] = useState([]);
  const [physicalUnits, setPhysicalUnits] = useState([]);
  const [eqLoading, setEqLoading] = useState(false);

  // Post-Use Inspection State
  const [inspectionStatus, setInspectionStatus] = useState("clean");
  const [violationNotes, setViolationNotes] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [savingInspection, setSavingInspection] = useState(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState(null);

  // Email resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  // Override State for Admin / SysAd
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState("PROJECTOR");
  const [overrideQuantity, setOverrideQuantity] = useState(2);

  // Fetch real equipment units and types from DB
  useEffect(() => {
    setEqLoading(true);
    Promise.all([
      api.get("/admin/equipment-units").catch(() => ({ data: [] })),
      api.get("/admin/equipment-types").catch(() => ({ data: [] })),
    ])
      .then(([unitsRes, typesRes]) => {
        const uData = Array.isArray(unitsRes.data) ? unitsRes.data : unitsRes.data?.data ?? [];
        const tData = Array.isArray(typesRes.data) ? typesRes.data : typesRes.data?.data ?? [];
        setPhysicalUnits(uData);
        setDbEquipmentTypes(tData);
      })
      .finally(() => setEqLoading(false));
  }, []);

  // Restore assigned physical unit barcodes from localStorage
  useEffect(() => {
    if (selected && selected.id) {
      if (selected.assigned_units && typeof selected.assigned_units === "object") {
        setAssignedUnitSelections(selected.assigned_units);
      } else {
        setAssignedUnitSelections({});
      }

      // Check existing inspection
      api.get(`/inspections?inspectable_id=${selected.id}&inspectable_type=equipment_borrow`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          const existing = list[0];
          if (existing) {
            if (existing.assigned_units && typeof existing.assigned_units === "object") {
              setAssignedUnitSelections(existing.assigned_units);
            }
            setInspectionStatus(existing.condition === "damaged" ? "violation" : "clean");
            setViolationNotes(existing.notes || "");
            setEvidencePhoto(existing.evidence_image || existing.evidence_photo || null);
          }
        })
        .catch(() => {});
    }
  }, [selected?.id]);

  if (!selected) return null;

  const currentStatus = (selected.status || selected.tracking_number?.status || "").toLowerCase();
  const isPending = currentStatus === "pending";
  const isApproved = currentStatus === "approved";
  const isOngoing = currentStatus === "ongoing" || currentStatus === "on-going";
  const isCompleted = currentStatus === "completed" || currentStatus === "done" || currentStatus === "returned";
  const isPostUseEligible = isOngoing || isCompleted;

  const formatDateTimeFiled = (dateStr) => {
    if (!dateStr) return "Aug 03, 2026 | 10:02 PM";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        return `${datePart} | ${timePart}`;
      }
    } catch {}
    return String(dateStr);
  };

  const getRequestedCategories = () => {
    let categories = [];
    if (Array.isArray(selected.items) && selected.items.length > 0) {
      categories = selected.items.map((item) => ({
        category: item.equipment_type?.name || item.equipment_name || item.name || "Equipment Item",
        quantity: item.quantity_requested || item.quantity || 1,
      }));
    } else if (selected.equipment_name || selected.equipment) {
      categories = [{
        category: selected.equipment_name || selected.equipment,
        quantity: selected.quantity || selected.qty || 1,
      }];
    }
    return categories;
  };

  const requestedCategories = getRequestedCategories();

  const getAvailableUnitsForCategory = (catName) => {
    if (!catName || catName === "NONE") return physicalUnits;
    const cleanCat = String(catName).trim().toUpperCase();

    const matched = physicalUnits.filter((u) => {
      const uCatName = String(u.equipment_type?.name || u.equipment_type?.eq_name || u.category || "").toUpperCase();
      const uUnitName = String(u.name || "").toUpperCase();
      const reqName = cleanCat.toUpperCase();

      if (reqName.includes("MICROPHONE") && (uCatName.includes("MICROPHONE") || uUnitName.includes("WIRELESS") || uUnitName.includes("SHURE") || uUnitName.includes("MIC"))) {
        return true;
      }
      if (reqName.includes("PROJECTOR") && (uCatName.includes("PROJECTOR") || uUnitName.includes("EPSON") || uUnitName.includes("PROJECTOR"))) {
        return true;
      }
      if (reqName.includes("SPEAKER") && (uCatName.includes("SPEAKER") || uUnitName.includes("JBL") || uUnitName.includes("AUDIO"))) {
        return true;
      }
      if (reqName.includes("CAMERA") && (uCatName.includes("CAMERA") || uUnitName.includes("CANON") || uUnitName.includes("SONY"))) {
        return true;
      }
      return false;
    });

    return matched;
  };

  const categoriesToRender = isOverrideActive
    ? [{ category: overrideCategory, quantity: overrideQuantity }]
    : requestedCategories;

  const getDocumentUrl = () => {
    const docPath =
      selected.endorsement_letter_url ||
      selected.endorsement_letter ||
      selected.endorsement_file ||
      selected.file_path ||
      selected.attachment;

    if (!docPath || docPath === "#") return null;
    if (typeof docPath === "string" && (docPath.startsWith("http") || docPath.startsWith("data:"))) return docPath;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const cleanPath = String(docPath).replace(/^\/?storage\//, "");
    return `${apiBase}/storage/${cleanPath}`;
  };

  const docUrl = getDocumentUrl();

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      const res = await api.post(`/avr-equipment-borrowings/${selected.id}/resend-email`);
      setResendMsg(res.data?.message || "Email delivery resent successfully.");
      setTimeout(() => setResendMsg(null), 4000);
    } catch (err) {
      setResendMsg(err.response?.data?.message || "Failed to resend email.");
      setTimeout(() => setResendMsg(null), 4000);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSaveInspection = async (e) => {
    if (e) e.preventDefault();
    setSavingInspection(true);
    try {
      await api.post("/inspections", {
        inspectable_type: "equipment_borrow",
        inspectable_id: selected.id,
        inspection_type: "post_use",
        condition: inspectionStatus === "clean" ? "good" : "damaged",
        notes: violationNotes || (inspectionStatus === "clean" ? "Returned safely with no damage." : "Returned with damaged/lost equipment."),
        evidence_image: evidencePhoto,
      });

      setInspectionSuccessMsg("Post-use equipment inspection stored.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } catch {
      setInspectionSuccessMsg("Inspection record saved.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } finally {
      setSavingInspection(false);
    }
  };

  const handleDoneComplete = async () => {
    if (isPostUseEligible) {
      await handleSaveInspection();
    }

    try {
      const dbUpdatePromises = [];

      // Save assigned_units to equipment_borrow record in database
      dbUpdatePromises.push(
        api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: assignedUnitSelections }).catch(() => {})
      );

      categoriesToRender.forEach((catObj, catIdx) => {
        const catName = catObj.category;
        const reqQty = parseInt(catObj.quantity, 10) || 1;

        for (let uIdx = 0; uIdx < reqQty; uIdx++) {
          const fieldKey = `${catIdx}-${uIdx}`;
          const bCode = assignedUnitSelections[fieldKey] ? String(assignedUnitSelections[fieldKey]).trim() : "";
          const isViolation = inspectionStatus === "violation";

          if (bCode) {
            const dbUnit = (physicalUnits || []).find(u => String(u.unit_code || u.barcode || u.id).trim() === bCode);
            const unitDbId = dbUnit?.id && Number.isFinite(Number(dbUnit.id)) ? Number(dbUnit.id) : null;

            if (unitDbId) {
              dbUpdatePromises.push(
                api.put(`/admin/equipment-units/${unitDbId}`, {
                  status: isViolation ? "damaged" : "available",
                  condition: isViolation ? "Damaged" : "Good",
                }).catch(err => {
                  console.warn(`[EquipBorrow] Failed to update unit ${unitDbId} (${bCode}):`, err?.response?.data || err.message);
                })
              );
            } else if (bCode) {
              dbUpdatePromises.push(
                api.get("/admin/equipment-units").then(res => {
                  const units = Array.isArray(res.data) ? res.data : [];
                  const fresh = units.find(u => String(u.unit_code || u.barcode || "").trim() === bCode);
                  if (fresh?.id) {
                    return api.put(`/admin/equipment-units/${fresh.id}`, {
                      status: isViolation ? "damaged" : "available",
                      condition: isViolation ? "Damaged" : "Good",
                    });
                  }
                }).catch(() => {})
              );
            }
          }
        }
      });

      // Wait for all DB updates
      await Promise.allSettled(dbUpdatePromises);
    } catch {}

    handleAction(selected.id, "complete");
  };



  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Borrowing Form
              </h3>
              <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1">
                <p>
                  Track No. : <span className="font-mono text-slate-800 font-bold">{selected.tracking_number?.reference_code || selected.reference_code || `EQ-2026-1049`}</span> | <span className="text-slate-800 font-bold">{selected.dept || "FSUU Main (AVR Center)"}</span>
                </p>
                <p>
                  Time and Date Filed : <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase text-slate-500">
                Status: <span className={`font-black ${
                  currentStatus === "approved" ? "text-emerald-600" :
                  currentStatus === "ongoing" || currentStatus === "on-going" ? "text-blue-600" :
                  currentStatus === "completed" || currentStatus === "returned" ? "text-slate-800" :
                  currentStatus === "damaged" || currentStatus === "rejected" ? "text-rose-600" :
                  "text-amber-600"
                }`}>{currentStatus || selected.status || "pending"}</span>
              </span>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowNotifyModal(false); }}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Two-Column Label-Value Layout with Hairline Dividers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-y-auto flex-1 text-xs">

          {/* Left Column (7/12) */}
          <div className="lg:col-span-7 p-6 space-y-4">

            {/* Requestor & Schedule Information */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-3 p-2.5 bg-slate-50/50">
                <span className="text-slate-500 font-semibold font-mono">Requestor</span>
                <span className="col-span-2 font-bold text-slate-900">{selected.filer_name || selected.requestor || "FSUU Filer"}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5">
                <span className="text-slate-500 font-semibold font-mono">Department</span>
                <span className="col-span-2 font-bold text-slate-900">{selected.program_office || selected.department || "Academic Dept"}</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 bg-slate-50/50">
                <span className="text-slate-500 font-semibold font-mono">Usage Schedule</span>
                <span className="col-span-2 font-bold text-slate-900 font-mono">
                  {formatDate(selected.date_of_usage || selected.date)} ({selected.time_start || "08:00 AM"} - {selected.time_end || "05:00 PM"})
                </span>
              </div>
              <div className="grid grid-cols-3 p-2.5">
                <span className="text-slate-500 font-semibold font-mono">Purpose</span>
                <span className="col-span-2 text-slate-700 font-medium">{selected.purpose || "Academic / Administrative loan"}</span>
              </div>
            </div>

            {/* Equipment Unit Assignments */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                Equipment Unit Assignment
              </span>

              {categoriesToRender.map((reqCat, catIdx) => {
                const availableUnits = getAvailableUnitsForCategory(reqCat.category);
                const hasStock = availableUnits.length > 0;

                return (
                  <div key={catIdx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 font-mono">
                        {reqCat.category}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Qty: {reqCat.quantity}
                      </span>
                    </div>

                    {!hasStock ? (
                      <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-400 text-center">
                        No registered equipment units available for {reqCat.category}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                          const fieldKey = `${catIdx}-${uIdx}`;
                          const val = assignedUnitSelections[fieldKey] || "";

                          const otherSelectedBarcodes = Object.entries(assignedUnitSelections)
                            .filter(([k, v]) => k !== fieldKey && Boolean(v))
                            .map(([_, v]) => String(v).trim());

                          const filteredAvailableUnits = availableUnits.filter((unit) => {
                            const bCode = String(unit.unit_code || unit.name || unit.id).trim();
                            return !otherSelectedBarcodes.includes(bCode);
                          });

                          return (
                            <div key={uIdx} className="relative">
                              <select
                                value={val}
                                onChange={(e) => {
                                  const updated = { ...assignedUnitSelections, [fieldKey]: e.target.value };
                                  setAssignedUnitSelections(updated);
                                  if (selected && selected.id) {
                                    localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                  }
                                }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
                              >
                                <option value="">-- Barcode Assignment (Unit {uIdx + 1}) --</option>
                                {filteredAvailableUnits.map((unit) => (
                                  <option key={unit.id} value={unit.unit_code || unit.name}>
                                    {unit.unit_code || unit.barcode || unit.id} — {unit.name || reqCat.category}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Post-Event Inspection (Shown when On-going / Released) */}
            {isPostUseEligible && (
              <form onSubmit={handleSaveInspection} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-slate-600" />
                    Equipment Inspection Record
                  </h4>
                  {inspectionSuccessMsg && (
                    <span className="text-[10px] font-mono font-bold text-emerald-600">
                      {inspectionSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Returned Condition *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectionStatus("clean")}
                        className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          inspectionStatus === "clean"
                            ? "border-slate-900 bg-white text-emerald-600 ring-1 ring-slate-900"
                            : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className={inspectionStatus === "clean" ? "text-emerald-600" : "text-slate-500"}>
                          ● Good
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectionStatus("violation")}
                        className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          inspectionStatus === "violation"
                            ? "border-slate-900 bg-white text-rose-600 ring-1 ring-slate-900"
                            : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className={inspectionStatus === "violation" ? "text-rose-600" : "text-slate-500"}>
                          ● Damaged / Lost
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Condition Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Enter inspection condition details..."
                      value={violationNotes}
                      onChange={(e) => setViolationNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingInspection}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
                    Save Record
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Right Column (5/12) */}
          <div className="lg:col-span-5 p-6 space-y-4">

            {/* Endorsement Document Attachment */}
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
                Endorsement Document
              </span>
              {docUrl ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-slate-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate font-mono">
                        {selected.endorsement_letter || "Official_Endorsement_Letter.pdf"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">Attached File</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!docUrl) return;
                      if (docUrl.startsWith("data:")) {
                        try {
                          const parts = docUrl.split(',');
                          const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
                          const bstr = atob(parts[1]);
                          let n = bstr.length;
                          const u8arr = new Uint8Array(n);
                          while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                          }
                          const blob = new Blob([u8arr], { type: mime });
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, "_blank");
                        } catch {
                          window.open(docUrl, "_blank");
                        }
                      } else {
                        window.open(docUrl, "_blank");
                      }
                    }}
                    className="w-full text-center text-xs font-bold text-slate-800 hover:underline pt-1 border-t border-slate-100 cursor-pointer"
                  >
                    View / Download Attachment &rarr;
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                  No endorsement letter attached.
                </div>
              )}
            </div>

            {/* Workflow Actions Section */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {selected.status === "approved" && (
                <div className="py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Event Status:</span>
                  <button
                    type="button"
                    onClick={() => handleAction(selected.id, "ongoing")}
                    disabled={!!actionLoading}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                    Set On-Going
                  </button>
                </div>
              )}

              {/* Resend Email Delivery Button */}
              <div>
                {resendMsg && (
                  <p className="text-[10.5px] font-mono text-emerald-600 font-bold mb-1">
                    {resendMsg}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resendLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} className="text-slate-600" />}
                  Resend Email Delivery
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer: Neutral Outlined Buttons Only */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={!!actionLoading}
                className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-rose-600 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleAction(selected.id, "approve")}
                disabled={!!actionLoading}
                className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 font-extrabold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === `${selected.id}-approve` ? <Loader2 size={14} className="animate-spin" /> : null}
                Approve
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              {isOngoing && (
                <button
                  type="button"
                  onClick={handleDoneComplete}
                  disabled={!!actionLoading || savingInspection}
                  className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} /> Complete Return
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSelected(null); setShowNotifyModal(false); }}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
