import { useState, useEffect } from "react";
import {
  X, CheckCircle, Clock, Play, Check, Loader2,
  FileText, Mail, FileCheck
} from "lucide-react";
import api from "@/lib/axios";
import { formatTime12, formatTimeRange12 } from "@/lib/dateUtils";
import EquipBorrowHeader from "../borrow-modal/EquipBorrowHeader";
import EquipBorrowInspectionForm from "../borrow-modal/EquipBorrowInspectionForm";
import EquipBorrowUnitAssignment from "../borrow-modal/EquipBorrowUnitAssignment";

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
  const [unitReturnedConditions, setUnitReturnedConditions] = useState({});
  const [timeliness, setTimeliness] = useState("on_time");
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

  // Restore assigned physical unit barcodes from DB and localStorage
  useEffect(() => {
    if (selected && selected.id) {
      let savedUnits = {};

      if (selected.assigned_units) {
        if (typeof selected.assigned_units === "object" && !Array.isArray(selected.assigned_units)) {
          savedUnits = { ...selected.assigned_units };
        } else if (Array.isArray(selected.assigned_units)) {
          selected.assigned_units.forEach((u, i) => {
            savedUnits[`0-${i}`] = String(u);
          });
        } else if (typeof selected.assigned_units === "string") {
          try {
            const parsed = JSON.parse(selected.assigned_units);
            if (typeof parsed === "object") savedUnits = parsed;
          } catch {}
        }
      }

      if (Object.keys(savedUnits).length === 0) {
        try {
          const localData = localStorage.getItem(`fsuu_assigned_units_eb_${selected.id}`);
          if (localData) {
            const parsed = JSON.parse(localData);
            if (parsed && typeof parsed === "object") {
              savedUnits = parsed;
            }
          }
        } catch {}
      }

      setAssignedUnitSelections(savedUnits);

      // Auto-detect late return by comparing scheduled end time against current time
      const dateUsage = selected.date_of_usage || (selected.start_datetime ? selected.start_datetime.slice(0, 10) : null);
      const timeEnd = selected.time_end || (selected.end_datetime ? selected.end_datetime.slice(11, 16) : null);
      if (dateUsage && timeEnd) {
        const schedEndStr = timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd;
        const schedEnd = new Date(`${dateUsage}T${schedEndStr}`);
        if (!isNaN(schedEnd.getTime()) && new Date() > schedEnd) {
          setTimeliness("late");
        } else {
          setTimeliness("on_time");
        }
      }

      // Check existing inspection properties directly from selected object first
      if (selected.assigned_units && typeof selected.assigned_units === "object") {
        setAssignedUnitSelections((prev) => ({ ...prev, ...selected.assigned_units }));
      }
      if (selected.unit_conditions && typeof selected.unit_conditions === "object") {
        setUnitReturnedConditions(selected.unit_conditions);
      }
      if (selected.has_damage || selected.inspection_condition === "damaged" || selected.status === "damaged" || selected.violation) {
        setInspectionStatus("violation");
      } else if (selected.inspection_condition === "good" || selected.inspection_condition === "clean") {
        setInspectionStatus("clean");
      }
      if (selected.violation || selected.inspection_notes) {
        setViolationNotes(selected.violation || selected.inspection_notes || "");
      }

      // Check existing inspection from backend API
      api.get(`/inspections?inspectable_id=${selected.id}&inspectable_type=equipment_borrow`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          const existing = list[0];
          if (existing) {
            if (existing.assigned_units && typeof existing.assigned_units === "object") {
              setAssignedUnitSelections((prev) => ({ ...prev, ...existing.assigned_units }));
            }
            if (existing.unit_conditions && typeof existing.unit_conditions === "object") {
              setUnitReturnedConditions((prev) => ({ ...prev, ...existing.unit_conditions }));
            }
            if (existing.condition === "damaged" || existing.condition === "violation") {
              setInspectionStatus("violation");
            } else if (existing.condition === "good" || existing.condition === "clean") {
              setInspectionStatus("clean");
            }
            if (existing.timeliness) {
              setTimeliness(existing.timeliness);
            }
            if (existing.notes) {
              setViolationNotes(existing.notes);
            }
            if (existing.evidence_image || existing.evidence_photo) {
              setEvidencePhoto(existing.evidence_image || existing.evidence_photo || null);
            }
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
    if (!dateStr) return "—";
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
    const currentAssigned = assignedUnitSelections || selected.assigned_units || {};

    if (Array.isArray(selected.items) && selected.items.length > 0) {
      categories = selected.items.map((item, catIdx) => {
        const dbType = (dbEquipmentTypes || []).find(t => String(t.id) === String(item.equipment_type_id)) || item.equipment_type;
        const name = dbType?.eq_name || dbType?.name || item.equipment_type?.eq_name || item.equipment_type?.name || item.equipment_name || item.name || "Equipment Item";

        let assignedCount = 0;
        if (typeof currentAssigned === "object" && currentAssigned !== null) {
          Object.keys(currentAssigned).forEach(k => {
            if (k.startsWith(`${catIdx}-`) || k.startsWith(`${name}-`) || k.startsWith(`${item.equipment_type_id}-`)) {
              if (currentAssigned[k]) assignedCount++;
            }
          });
        }
        if (Array.isArray(currentAssigned)) {
          assignedCount = currentAssigned.length;
        }

        const reqQty = parseInt(item.quantity_requested || item.quantity || 1, 10);
        const finalQty = Math.max(reqQty, assignedCount, 1);

        return {
          category: name,
          quantity: finalQty,
        };
      });
    } else if (selected.equipment_name || selected.equipment) {
      const name = selected.equipment_name || selected.equipment;
      let assignedCount = 0;
      if (typeof currentAssigned === "object" && currentAssigned !== null) {
        assignedCount = Object.values(currentAssigned).filter(Boolean).length;
      } else if (Array.isArray(currentAssigned)) {
        assignedCount = currentAssigned.length;
      }

      const reqQty = parseInt(selected.quantity || selected.qty || 1, 10);
      const finalQty = Math.max(reqQty, assignedCount, 1);

      categories = [{
        category: name,
        quantity: finalQty,
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

      if (!uCatName && !uUnitName) return false;

      // Exact or direct substring match
      if (uCatName === reqName || (uCatName && reqName.includes(uCatName)) || (uCatName && uCatName.includes(reqName))) {
        return true;
      }

      // Keyword / Brand matching
      if (reqName.includes("SCREEN") && (uCatName.includes("SCREEN") || uUnitName.includes("SCREEN") || uUnitName.includes("AKIA"))) {
        return true;
      }
      if (reqName.includes("MICROPHONE") && (uCatName.includes("MICROPHONE") || uUnitName.includes("WIRELESS") || uUnitName.includes("SHURE") || uUnitName.includes("MIC"))) {
        return true;
      }
      if (reqName.includes("PROJECTOR") && !reqName.includes("SCREEN") && (uCatName.includes("PROJECTOR") || uUnitName.includes("EPSON") || uUnitName.includes("PROJECTOR"))) {
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

    return matched.length > 0 ? matched : physicalUnits;
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
        timeliness: timeliness,
        notes: violationNotes || (inspectionStatus === "clean" ? "Returned safely in good condition." : "Returned with damaged/lost equipment."),
        evidence_image: evidencePhoto,
        assigned_units: assignedUnitSelections,
        unit_conditions: unitReturnedConditions,
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
          const idxKey = `${catIdx}-${uIdx}`;
          const catKey = `${catName}-${uIdx}`;
          const bCode = (assignedUnitSelections[idxKey] || assignedUnitSelections[catKey]) ? String(assignedUnitSelections[idxKey] || assignedUnitSelections[catKey]).trim() : "";
          const condChoice = unitReturnedConditions[idxKey] || unitReturnedConditions[catKey] || (inspectionStatus === "violation" ? "Damaged" : "Good");

          if (bCode) {
            const condNormalized = condChoice === "Good" ? "Good" : (condChoice === "Damaged" ? "Damaged" : "Lost");
            const newStatus = condNormalized === "Damaged" ? "damaged" : (condNormalized === "Lost" ? "lost" : "available");
            const newCondition = condNormalized;

            const dbUnit = (physicalUnits || []).find(u => String(u.unit_code || u.barcode || u.id).trim() === bCode);
            const unitDbId = dbUnit?.id && Number.isFinite(Number(dbUnit.id)) ? Number(dbUnit.id) : null;

            if (unitDbId) {
              dbUpdatePromises.push(
                api.put(`/admin/equipment-units/${unitDbId}`, {
                  status: newStatus,
                  condition: newCondition,
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
                      status: newStatus,
                      condition: newCondition,
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

    handleAction(selected.id, "complete", {
      assigned_units: assignedUnitSelections,
      unit_conditions: unitReturnedConditions,
      condition: inspectionStatus === "violation" ? "damaged" : "good",
      inspection_status: inspectionStatus,
      timeliness: timeliness,
      notes: violationNotes || (inspectionStatus === "clean" ? "Returned safely in good condition." : "Returned with damaged/lost equipment.")
    });
  };



  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">

        <EquipBorrowHeader
          selected={selected}
          currentStatus={currentStatus}
          setSelected={setSelected}
          setShowNotifyModal={setShowNotifyModal}
          formatDateTimeFiled={formatDateTimeFiled}
        />

        {/* Modal Body: Two-Column Label-Value Layout with Hairline Dividers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-y-auto flex-1 text-xs">

          {/* Left Column (7/12) */}
          <div className="lg:col-span-7 p-6 space-y-4">

            {/* Requestor & Schedule Information */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="grid grid-cols-3 py-1">
                <span className="text-slate-500 font-bold">Requestor</span>
                <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_name || selected.filer_name || selected.requestor || "FSUU Filer"}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Department</span>
                <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_program_office || selected.program_office || selected.department || "Academic Dept"}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Contact Phone</span>
                <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_contact_number || selected.contact_number || "—"}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Email</span>
                <span className="col-span-2 font-bold text-slate-800 break-all">{selected.requestor_email || selected.email_address || selected.email || "—"}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Usage Schedule</span>
                <span className="col-span-2 font-extrabold text-slate-900">
                  {formatDate(selected.date_of_usage || selected.start_datetime || selected.date)} ({formatTimeRange12(selected.time_start || selected.start_datetime, selected.time_end || selected.end_datetime)})
                </span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Place of Use</span>
                <span className="col-span-2 font-bold text-slate-800">{selected.place_of_use || "Main Campus"}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-bold">Purpose</span>
                <span className="col-span-2 text-slate-800 font-bold">{selected.purpose || "Academic / Administrative loan"}</span>
              </div>
            </div>

            {/* Post-Event Inspection (Shown when On-going / Released or Completed) */}
            {isPostUseEligible && (
              <EquipBorrowInspectionForm
                inspectionStatus={inspectionStatus}
                setInspectionStatus={setInspectionStatus}
                timeliness={timeliness}
                setTimeliness={setTimeliness}
                categoriesToRender={categoriesToRender}
                assignedUnitSelections={assignedUnitSelections}
                physicalUnits={physicalUnits}
                unitReturnedConditions={unitReturnedConditions}
                setUnitReturnedConditions={setUnitReturnedConditions}
                violationNotes={violationNotes}
                setViolationNotes={setViolationNotes}
                savingInspection={savingInspection}
                handleSaveInspection={handleSaveInspection}
                inspectionSuccessMsg={inspectionSuccessMsg}
                readOnly={isCompleted}
              />
            )}

          </div>

          {/* Right Column (5/12) */}
          <EquipBorrowUnitAssignment
            selected={selected}
            categoriesToRender={categoriesToRender}
            getAvailableUnitsForCategory={getAvailableUnitsForCategory}
            assignedUnitSelections={assignedUnitSelections}
            setAssignedUnitSelections={setAssignedUnitSelections}
            isApproved={isApproved}
            isPending={isPending}
            isOngoing={isOngoing}
            isCompleted={isCompleted}
            handleAction={handleAction}
            actionLoading={actionLoading}
            resendMsg={resendMsg}
            resendLoading={resendLoading}
            handleResendEmail={handleResendEmail}
          />

        </div>

        {/* Modal Footer: Neutral Outlined Buttons Only */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => handleAction(selected.id, "reject")}
                disabled={!!actionLoading}
                className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-rose-600 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading === `${selected.id}-reject` ? <Loader2 size={14} className="animate-spin" /> : null}
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
                  className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={13} /> Save Inspection → Complete
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
