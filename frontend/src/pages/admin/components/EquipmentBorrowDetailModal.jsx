import { useState, useEffect } from "react";
import {
  X, CheckCircle, Clock, Play, Check, Loader2,
  FileText, Mail, FileCheck
} from "lucide-react";
import api from "@/lib/axios";
import { formatTime12, formatTimeRange12 } from "@/lib/dateUtils";
import { resolveStorageUrl } from "@/lib/utils";
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

  // Pre-Use Inspection State
  const [preInspectionStatus, setPreInspectionStatus] = useState("clean");
  const [preUnitReturnedConditions, setPreUnitReturnedConditions] = useState({});
  const [preViolationNotes, setPreViolationNotes] = useState("");

  // Email resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  // SMS notice state
  const [smsMsg, setSmsMsg] = useState(null);
  const [smsLoading, setSmsLoading] = useState(false);

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

  const getRequestedCategories = () => {
    let categories = [];

    if (Array.isArray(selected.items) && selected.items.length > 0) {
      categories = selected.items.map((item) => {
        const dbType = (dbEquipmentTypes || []).find(t => String(t.id) === String(item.equipment_type_id)) || item.equipment_type || item.equipmentType;
        const name = dbType?.eq_name || dbType?.name || item.equipment_type?.eq_name || item.equipment_type?.name || item.equipmentType?.eq_name || item.equipmentType?.name || item.equipment_name || item.name || "Equipment Item";
        const reqQty = parseInt(item.quantity_requested || item.quantity || 1, 10);

        return {
          category: name,
          quantity: Math.max(reqQty, 1),
          equipment_type_id: item.equipment_type_id || dbType?.id || item.equipment_type?.id || item.equipmentType?.id,
        };
      });
    } else if (selected.equipment_name || selected.equipment) {
      const name = selected.equipment_name || selected.equipment;
      const reqQty = parseInt(selected.quantity || selected.qty || 1, 10);

      categories = [{
        category: name,
        quantity: Math.max(reqQty, 1),
        equipment_type_id: selected.equipment_type_id,
      }];
    }
    return categories;
  };

  // Restore assigned physical unit barcodes from DB and localStorage
  useEffect(() => {
    if (selected && selected.id) {
      let savedUnits = {};

      const reqCats = getRequestedCategories();

      if (selected.assigned_units) {
        if (typeof selected.assigned_units === "object" && !Array.isArray(selected.assigned_units)) {
          savedUnits = { ...selected.assigned_units };
        } else if (Array.isArray(selected.assigned_units)) {
          let globalUnitIdx = 0;
          reqCats.forEach((catObj, cIdx) => {
            const qty = parseInt(catObj.quantity, 10) || 1;
            for (let u = 0; u < qty; u++) {
              if (selected.assigned_units[globalUnitIdx] !== undefined) {
                const uCode = String(selected.assigned_units[globalUnitIdx]);
                savedUnits[`${cIdx}-${u}`] = uCode;
                savedUnits[`${catObj.category}-${u}`] = uCode;
                globalUnitIdx++;
              }
            }
          });
        } else if (typeof selected.assigned_units === "string") {
          try {
            const parsed = JSON.parse(selected.assigned_units);
            if (Array.isArray(parsed)) {
              let globalUnitIdx = 0;
              reqCats.forEach((catObj, cIdx) => {
                const qty = parseInt(catObj.quantity, 10) || 1;
                for (let u = 0; u < qty; u++) {
                  if (parsed[globalUnitIdx] !== undefined) {
                    const uCode = String(parsed[globalUnitIdx]);
                    savedUnits[`${cIdx}-${u}`] = uCode;
                    savedUnits[`${catObj.category}-${u}`] = uCode;
                    globalUnitIdx++;
                  }
                }
              });
            } else if (typeof parsed === "object") {
              savedUnits = parsed;
            }
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

      if (selected.timeliness) {
        setTimeliness(selected.timeliness);
      }
      if (selected.is_late || (selected.status || "").toLowerCase().includes("late") || String(selected.violation_type || "").toLowerCase().includes("late") || String(selected.violation || "").toLowerCase().includes("late")) {
        setTimeliness("late");
      }
      if (selected.condition === "damaged" || selected.condition === "lost" || selected.inspection_condition === "damaged" || selected.inspection_condition === "lost") {
        setInspectionStatus("violation");
      } else if (selected.inspection_condition === "good" || selected.inspection_condition === "clean") {
        setInspectionStatus("clean");
      }
      if (selected.violation || selected.inspection_notes) {
        setViolationNotes(selected.violation || selected.inspection_notes || "");
      }
      if (selected.unit_conditions && typeof selected.unit_conditions === "object") {
        setUnitReturnedConditions(selected.unit_conditions);
      }

      // Check local storage backup first
      try {
        const localPre = localStorage.getItem(`fsuu_inspection_pre_use_eb_${selected.id}`);
        if (localPre) {
          const p = JSON.parse(localPre);
          if (p.notes) setPreViolationNotes(p.notes);
          if (p.condition === "damaged" || p.condition === "violation") setPreInspectionStatus("violation");
          else if (p.condition === "good" || p.condition === "clean") setPreInspectionStatus("clean");
          if (p.unit_conditions) setPreUnitReturnedConditions(p.unit_conditions);
        }
        const localPost = localStorage.getItem(`fsuu_inspection_post_use_eb_${selected.id}`);
        if (localPost) {
          const p = JSON.parse(localPost);
          if (p.notes) setViolationNotes(p.notes);
          if (p.condition === "damaged" || p.condition === "violation") setInspectionStatus("violation");
          else if (p.condition === "good" || p.condition === "clean") setInspectionStatus("clean");
          if (p.unit_conditions) setUnitReturnedConditions(p.unit_conditions);
        }
      } catch {}

      // Check existing inspection from backend API
      // Accept both 'post_use' (saved via Save button) and 'post_event' (saved via Complete action)
      api.get(`/inspections?inspectable_id=${selected.id}&inspectable_type=equipment_borrow`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          
          const preUse = list.find(i => i.inspection_type === 'pre_use');
          // Accept post_use OR post_event as the after-inspection record
          const postUse = list.find(i => i.inspection_type === 'post_use')
            || list.find(i => i.inspection_type === 'post_event')
            || list.find(i => i.inspection_type && i.inspection_type !== 'pre_use');

          if (postUse) {
            // Parse assigned_units (may be JSON string or object from DB)
            let auData = postUse.assigned_units;
            if (typeof auData === 'string') { try { auData = JSON.parse(auData); } catch { auData = {}; } }
            if (auData && typeof auData === 'object') {
              setAssignedUnitSelections((prev) => ({ ...prev, ...auData }));
            }
            // Parse unit_conditions (may be JSON string or object)
            let ucData = postUse.unit_conditions;
            if (typeof ucData === 'string') { try { ucData = JSON.parse(ucData); } catch { ucData = {}; } }
            if (ucData && typeof ucData === 'object') {
              setUnitReturnedConditions((prev) => ({ ...prev, ...ucData }));
            }
            if (postUse.condition === "damaged" || postUse.condition === "violation") {
              setInspectionStatus("violation");
            } else if (postUse.condition === "good" || postUse.condition === "clean") {
              setInspectionStatus("clean");
            }
            if (postUse.timeliness) {
              setTimeliness(postUse.timeliness);
            }
            if (postUse.notes) {
              setViolationNotes(postUse.notes);
            }
            if (postUse.evidence_image || postUse.evidence_photo) {
              setEvidencePhoto(postUse.evidence_image || postUse.evidence_photo || null);
            }
          }

          if (preUse) {
            // Parse unit_conditions for pre-use (may be JSON string)
            let preUc = preUse.unit_conditions;
            if (typeof preUc === 'string') { try { preUc = JSON.parse(preUc); } catch { preUc = {}; } }
            if (preUc && typeof preUc === 'object') {
              setPreUnitReturnedConditions((prev) => ({ ...prev, ...preUc }));
            }
            if (preUse.condition === "damaged" || preUse.condition === "violation") {
              setPreInspectionStatus("violation");
            } else if (preUse.condition === "good" || preUse.condition === "clean") {
              setPreInspectionStatus("clean");
            }
            if (preUse.notes) {
              setPreViolationNotes(preUse.notes);
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
  const isCompleted = currentStatus === "completed" || currentStatus === "done" || currentStatus === "returned" || currentStatus === "damaged" || currentStatus === "lost" || currentStatus === "late return" || currentStatus === "returned late";
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

  const requestedCategories = getRequestedCategories();

  const getAvailableUnitsForCategory = (catName, eqTypeId) => {
    if (!catName || catName === "NONE") return physicalUnits;

    // 1. First priority: match by equipment_type_id
    if (eqTypeId) {
      const idMatches = physicalUnits.filter((u) => {
        const uTypeId = u.equipment_type_id || u.equipmentType?.id || u.equipment_type?.id;
        return String(uTypeId) === String(eqTypeId);
      });
      if (idMatches.length > 0) return idMatches;
    }

    const cleanCat = String(catName).trim().toUpperCase();

    // 2. Exact Category Match first (matching equipment_type.eq_name, name, or category)
    const exactCategoryMatches = physicalUnits.filter((u) => {
      const uCatName = String(u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || u.equipment_type?.name || u.category || "").toUpperCase().trim();
      return uCatName === cleanCat;
    });

    if (exactCategoryMatches.length > 0) return exactCategoryMatches;

    // 3. Strict Discrimination & Unit Name matching
    const unitNameMatches = physicalUnits.filter((u) => {
      const uCatName = String(u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || u.equipment_type?.name || u.category || "").toUpperCase().trim();
      const uUnitName = String(u.name || "").toUpperCase().trim();
      
      // Strict discrimination
      if (cleanCat === "PROJECTOR" && (uCatName.includes("SCREEN") || uUnitName.includes("SCREEN"))) {
        return false;
      }
      if (cleanCat === "MICROPHONE" && (uCatName.includes("WIRELESS") || uUnitName.includes("WIRELESS") || uUnitName.includes("WMIC"))) {
        return false;
      }
      if (cleanCat.includes("WIRELESS") && (!uCatName.includes("WIRELESS") && !uUnitName.includes("WIRELESS") && !uUnitName.includes("WMIC"))) {
        return false;
      }

      return uCatName === cleanCat || uCatName.includes(cleanCat) || cleanCat.includes(uCatName) || uUnitName.startsWith(`${cleanCat} `) || uUnitName.startsWith(`${cleanCat}-`) || uUnitName === cleanCat || uUnitName.includes(cleanCat);
    });

    if (unitNameMatches.length > 0) return unitNameMatches;

    return [];
  };

  const categoriesToRender = isOverrideActive
    ? [{ category: overrideCategory, quantity: overrideQuantity }]
    : requestedCategories;

  const getDocumentUrl = () => {
    const docPath =
      selected.endorsement_url ||
      selected.endorsement_letter_url ||
      selected.endorsement_letter ||
      selected.endorsement_file ||
      selected.file_path ||
      selected.attachment;

    return resolveStorageUrl(docPath);
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

  const handleSendOverdueSms = async () => {
    setSmsLoading(true);
    try {
      const res = await api.post(`/avr-equipment-borrowings/${selected.id}/send-overdue-sms`);
      setSmsMsg(res.data?.message || "Overdue SMS alert dispatched.");
      setTimeout(() => setSmsMsg(null), 4000);
    } catch (err) {
      setSmsMsg(err.response?.data?.message || "Failed to send Overdue SMS.");
      setTimeout(() => setSmsMsg(null), 4000);
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSaveInspection = async (e, typeOverride = null) => {
    if (e) e.preventDefault();
    setSavingInspection(true);
    
    const inspectionType = typeOverride || (isPostUseEligible ? "post_use" : "pre_use");
    const isPreUse = inspectionType === "pre_use";

    // Normalize unit_conditions: ensure keys are actual barcodes/unit_codes, not positional indexes.
    // This guarantees the data can be matched correctly when loading the record again.
    const rawConditions = isPreUse ? preUnitReturnedConditions : unitReturnedConditions;
    const normalizedConditions = {};
    Object.entries(rawConditions || {}).forEach(([key, condVal]) => {
      // If key is a positional index like "0-0" or "PROJECTOR-0", resolve to barcode
      const barcode = assignedUnitSelections[key];
      if (barcode) {
        normalizedConditions[barcode] = condVal;
      }
      // Always keep the original key too (covers barcode keys already)
      normalizedConditions[key] = condVal;
    });

    const payload = {
      inspectable_type: "equipment_borrow",
      inspectable_id: selected.id,
      inspection_type: inspectionType,
      condition: isPreUse ? (preInspectionStatus === "clean" ? "good" : "damaged") : (inspectionStatus === "clean" ? "good" : "damaged"),
      timeliness: timeliness,
      notes: isPreUse ? preViolationNotes : (violationNotes || (inspectionStatus === "clean" ? "Returned safely in good condition." : "Returned with damaged/lost equipment.")),
      evidence_image: isPreUse ? null : evidencePhoto,
      assigned_units: assignedUnitSelections,
      unit_conditions: normalizedConditions,
    };

    try {
      localStorage.setItem(`fsuu_inspection_${inspectionType}_eb_${selected.id}`, JSON.stringify(payload));
    } catch {}
    
    try {
      await api.post("/inspections", payload);

      // Instantly sync physical units in Manage Equipments & Inventory
      if (!isPreUse) {
        const condMap = unitReturnedConditions || {};
        Object.entries(condMap).forEach(([key, condVal]) => {
          const condStr = String(condVal).toLowerCase();
          const isDamagedOrLost = condStr === "damaged" || condStr === "lost";
          const newStatus = isDamagedOrLost ? "unavailable" : "available";
          const newCondition = condStr === "damaged" ? "Damaged" : (condStr === "lost" ? "Lost" : "Good");

          const matchedUnit = (physicalUnits || []).find(u => 
            String(u.unit_code || u.barcode || u.id).trim().toUpperCase() === String(key).trim().toUpperCase()
          );

          if (matchedUnit?.id) {
            api.put(`/admin/equipment-units/${matchedUnit.id}`, {
              status: newStatus,
              condition: newCondition,
            }).catch(() => {});
          }
        });
      }

      setInspectionSuccessMsg(isPreUse ? "Pre-release inspection stored." : "Post-use equipment inspection stored.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } catch {
      setInspectionSuccessMsg("Inspection record saved.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } finally {
      setSavingInspection(false);
    }
  };

  const handleReleaseOngoing = async () => {
    // Automatically save pre-release inspection before marking as ongoing
    // This captures the current state of preViolationNotes and preUnitReturnedConditions
    try {
      await handleSaveInspection(null, "pre_use");
    } catch {
      // Non-blocking: proceed even if pre-inspection save fails
    }
    handleAction(selected.id, "ongoing");
  };

  const handleDoneComplete = async () => {
    if (isPostUseEligible) {
      await handleSaveInspection(null, "post_use");
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
          } else if (condChoice === "Damaged" || condChoice === "Lost") {
            // No physical unit was assigned (abstract mode), but the item was damaged/lost
            // Automate the count on the master equipment category so QTY PRESENT/RESERVED updates
            const cleanCatName = String(catName).toLowerCase();
            const matchedType = dbEquipmentTypes.find(t => 
              String(t.eq_name || t.name || t.category || "").toLowerCase() === cleanCatName
            );
            
            if (matchedType && matchedType.id) {
              dbUpdatePromises.push(
                api.get(`/admin/equipment-types/${matchedType.id}`).then(res => {
                  const curr = res.data;
                  let damageIncr = condChoice === "Damaged" ? 1 : 0;
                  let lostIncr = condChoice === "Lost" ? 1 : 0;
                  
                  return api.put(`/admin/equipment-types/${matchedType.id}`, {
                    available_count: Math.max(0, (curr.available_count || curr.present_count || curr.total_quantity || 1) - 1),
                    damaged_count: (curr.damaged_count || 0) + damageIncr,
                    lost_count: (curr.lost_count || 0) + lostIncr,
                    // Required fields based on EquipmentTypeController store logic
                    office_id: curr.office_id,
                    eq_name: curr.eq_name || curr.name,
                    eq_type: curr.eq_type || curr.category,
                    total_quantity: curr.total_quantity,
                    status: curr.status,
                  });
                }).catch(err => console.warn(`Failed to update abstract unit damage/loss for ${catName}:`, err))
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">

        <EquipBorrowHeader
          selected={selected}
          currentStatus={currentStatus}
          setSelected={setSelected}
          setShowNotifyModal={setShowNotifyModal}
          formatDateTimeFiled={formatDateTimeFiled}
          resendLoading={resendLoading}
          resendMsg={resendMsg}
          handleResendEmail={handleResendEmail}
          smsLoading={smsLoading}
          smsMsg={smsMsg}
          handleSendOverdueSms={handleSendOverdueSms}
          isOngoing={isOngoing}
          isApproved={isApproved}
        />

        {/* Modal Body: Organized in Top Details & Side Assignment, Bottom Side-by-Side Inspection */}
        <div className="overflow-y-auto flex-1 p-6 text-xs space-y-6">

          {/* TOP ROW (Side-by-Side): Left = Borrowing Details & Equipment Items | Right = Equipment Unit Assignment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Requestor Details & Equipment Categories with Qty Borrowed */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Requestor & Schedule Information */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                    Borrowing Request Details
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    ID: #{selected.id}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 py-1 text-xs">
                  <span className="text-slate-500 font-bold">Requestor</span>
                  <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_name || selected.filer_name || selected.requestor || "FSUU Filer"}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-bold">Department</span>
                  <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_program_office || selected.program_office || selected.department || "Academic Dept"}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-bold">Contact</span>
                  <span className="col-span-2 font-extrabold text-slate-900">{selected.requestor_contact_number || selected.contact_number || selected.contact_no || "—"}</span>
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

              {/* Equipment Category with Quantity Borrowed Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600" />
                    Equipment Categories &amp; Qty Borrowed
                  </span>
                  <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {categoriesToRender.reduce((sum, c) => sum + (parseInt(c.quantity, 10) || 1), 0)} Total Unit(s)
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {categoriesToRender.map((catItem, cIdx) => (
                    <div key={cIdx} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-900 text-xs block">
                          {catItem.category}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Borrow request specification
                        </span>
                      </div>
                      <span className="font-extrabold text-xs text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200/80">
                        Qty: {catItem.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right: EQUIPMENT UNIT ASSIGNMENT */}
            <div className="lg:col-span-6">
              <EquipBorrowUnitAssignment
                selected={selected}
                categoriesToRender={categoriesToRender}
                getAvailableUnitsForCategory={getAvailableUnitsForCategory}
                assignedUnitSelections={assignedUnitSelections}
                setAssignedUnitSelections={setAssignedUnitSelections}
                unitReturnedConditions={unitReturnedConditions}
                inspectionStatus={inspectionStatus}
                timeliness={timeliness}
                isApproved={isApproved}
                isPending={isPending}
                isOngoing={isOngoing}
                isCompleted={isCompleted}
                handleAction={(id, action, customData) => action === "ongoing" ? handleReleaseOngoing() : handleAction(id, action, customData)}
                actionLoading={actionLoading}
              />
            </div>

          </div>

          {/* BOTTOM ROW (Side-by-Side): Left = Equipment Inspection Record (Before) | Right = Equipment Inspection Record (After) */}
          {(isApproved || isOngoing || isCompleted) && (
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Equipment Inspection Record (Before) */}
                <div className="lg:col-span-6 space-y-3">
                  <EquipBorrowInspectionForm
                    isPreRelease={true}
                    inspectionStatus={preInspectionStatus}
                    setInspectionStatus={setPreInspectionStatus}
                    timeliness={timeliness}
                    setTimeliness={setTimeliness}
                    categoriesToRender={categoriesToRender}
                    assignedUnitSelections={assignedUnitSelections}
                    physicalUnits={physicalUnits}
                    unitReturnedConditions={preUnitReturnedConditions}
                    setUnitReturnedConditions={setPreUnitReturnedConditions}
                    violationNotes={preViolationNotes}
                    setViolationNotes={setPreViolationNotes}
                    savingInspection={savingInspection}
                    handleSaveInspection={(e) => handleSaveInspection(e, "pre_use")}
                    inspectionSuccessMsg={inspectionSuccessMsg}
                    readOnly={isCompleted || isOngoing}
                  />
                </div>

                {/* Right Side: Equipment Inspection Record (After) - Active once equipment is released */}
                <div className="lg:col-span-6 space-y-3">
                  {(isOngoing || isCompleted) ? (
                    <EquipBorrowInspectionForm
                      isPreRelease={false}
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
                      handleSaveInspection={(e) => handleSaveInspection(e, "post_use")}
                      inspectionSuccessMsg={inspectionSuccessMsg}
                      readOnly={isCompleted}
                    />
                  ) : (
                    <div className="p-8 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 flex flex-col items-center justify-center min-h-[220px]">
                      <FileCheck size={28} className="text-slate-400" />
                      <h5 className="font-extrabold text-slate-700 text-xs">Equipment Inspection Record (After)</h5>
                      <p className="text-[11px] text-slate-500 font-medium max-w-xs">
                        This return inspection checklist and damage/lost triggers will activate once equipment is marked as released.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

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
                  <Check size={13} /> Complete
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
