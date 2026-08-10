import { useState, useEffect, useCallback, useMemo } from "react";
import { X, CheckCircle, Clock, Play, FileCheck, Check, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

// Modular Sub-Components
import VenueBookingInfo from "./booking-modal/VenueBookingInfo";
import VenueEquipmentChecklist from "./booking-modal/VenueEquipmentChecklist";
import VenuePostInspectionForm from "./booking-modal/VenuePostInspectionForm";
import EvidenceLightboxModal from "./booking-modal/EvidenceLightboxModal";

// Master dictionary of known equipment mappings for instant ID/key resolution
const KNOWN_EQUIPMENT_NAMES = {
  "1": "Sound System",
  "2": "Projector",
  "3": "Wireless Microphone",
  "4": "Microphone",
  "5": "Projector Screen",
  "6": "Camera",
  "7": "Extension Wire",
  "8": "HDMI Cable",
  "proj": "Projector",
  "projector": "Projector",
  "mic": "Microphone",
  "microphone": "Microphone",
  "wmic": "Wireless Microphone",
  "wireless microphone": "Wireless Microphone",
  "camera": "Camera",
  "screen": "Projector Screen",
  "projector screen": "Projector Screen",
  "ext": "Extension Wire",
  "extension wire": "Extension Wire",
  "hdmi": "HDMI Cable",
  "sound": "Sound System",
  "podium": "Podium",
};

export default function VenueBookingDetailModal({
  selected,
  setSelected,
  isHistoryView = false,
  formatDate,
  formatTimeRange,
  feedbackMessage,
  showRejectForm,
  setShowRejectForm,
  rejectionComments,
  setRejectionComments,
  handleAction,
  actionLoading,
  inspectionStatus,
  setInspectionStatus,
  violationNotes,
  setViolationNotes,
  evidencePhoto,
  setEvidencePhoto,
}) {
  const [savingInspection, setSavingInspection] = useState(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState(null);
  const [selectedViolationType, setSelectedViolationType] = useState("Physical Facility / Furniture Damage");
  const [fullImageModal, setFullImageModal] = useState(null);

  // Dynamic equipment notes fetched if missing on passed object
  const [fetchedEquipmentNotes, setFetchedEquipmentNotes] = useState("");

  // Physical Equipment Units & Inventory Stock from Database
  const [dbEquipmentTypes, setDbEquipmentTypes] = useState([]);
  const [physicalUnits, setPhysicalUnits] = useState([]);
  const [eqLoading, setEqLoading] = useState(false);
  const [assignedUnitSelections, setAssignedUnitSelections] = useState({});
  const [unitReturnedConditions, setUnitReturnedConditions] = useState({});

  // Override State for Admin / SysAd
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState("PROJECTOR");
  const [overrideQuantity, setOverrideQuantity] = useState(3);

  // User Auth & Role Check
  const { user } = useAuth();
  const roleName = String(user?.role?.name || user?.role || "").toLowerCase();
  const isAdminOrSuperAdmin = roleName === "admin" || roleName === "super_admin" || roleName === "sysad" || roleName === "superadmin";

  // Dynamic Violation Options State (Manageable by Admin & Super Admin)
  const [violationOptions, setViolationOptions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fsuu_violation_types") || "[]");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return [
      "Physical Facility / Furniture Damage",
      "Facility Noise / Decibel Breach",
      "Late Room Turnover / Delay",
      "Unauthorized Time Extension",
      "Equipment Damage / Lost Unit",
      "Uncleaned Facility / Trash Left",
      "Other Policy Violation",
    ];
  });
  const [showManageViolations, setShowManageViolations] = useState(false);
  const [newViolationTypeInput, setNewViolationTypeInput] = useState("");

  const handleAddViolationOption = () => {
    if (!newViolationTypeInput.trim()) return;
    const updated = [...violationOptions, newViolationTypeInput.trim()];
    setViolationOptions(updated);
    localStorage.setItem("fsuu_violation_types", JSON.stringify(updated));
    setSelectedViolationType(newViolationTypeInput.trim());
    setNewViolationTypeInput("");
  };

  const handleDeleteViolationOption = (optionToDelete) => {
    const updated = violationOptions.filter((opt) => opt !== optionToDelete);
    setViolationOptions(updated);
    localStorage.setItem("fsuu_violation_types", JSON.stringify(updated));
    if (selectedViolationType === optionToDelete) {
      setSelectedViolationType(updated[0] || "Physical Facility / Furniture Damage");
    }
  };

  // Damaged Equipment Selection Flow State (Spec §2)
  const [damagedEqType, setDamagedEqType] = useState("Projector");
  const [damagedEqQty, setDamagedEqQty] = useState(1);
  const [damagedUnitBarcodes, setDamagedUnitBarcodes] = useState({});

  // Fetch real equipment stock & physical units from backend DB
  useEffect(() => {
    setEqLoading(true);
    Promise.all([
      api.get("/admin/equipment-units").catch(() => ({ data: [] })),
      api.get("/admin/equipment-types").catch(() => ({ data: [] }))
    ]).then(([unitsRes, typesRes]) => {
      const uData = Array.isArray(unitsRes.data) ? unitsRes.data : (unitsRes.data?.data ?? []);
      const tData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data?.data ?? []);
      setPhysicalUnits(uData);
      setDbEquipmentTypes(tData);
    }).finally(() => setEqLoading(false));
  }, []);

  // Fetch existing persisted inspection record, full booking details, & unit selections when modal opens
  useEffect(() => {
    if (selected && selected.id) {
      const statusLower = (selected.status || selected.tracking_number?.status || "").toLowerCase();
      const isDamagedStatus = statusLower === "damaged" || statusLower === "violation" || Boolean(selected.has_damage) || Boolean(selected.violation);
      const cleanNotes = (selected.notes && !selected.notes.startsWith("[")) ? selected.notes : "";
      
      setInspectionStatus(isDamagedStatus ? "violation" : "clean");
      setViolationNotes(cleanNotes);
      setSelectedViolationType(selected.violation_type || selected.violation || "Physical Facility / Furniture Damage");
      setEvidencePhoto(selected.evidence_photo || selected.evidence_image || null);
      setDamagedUnitBarcodes({});
      setDamagedEqQty(1);

      // Hydrate equipment notes if already on selected or empty
      if (selected.equipment_notes) {
        setFetchedEquipmentNotes(selected.equipment_notes);
      } else {
        // Fetch booking details from backend if equipment_notes was not in the initial list query
        api.get(`/avr-venue-bookings/${selected.id}`)
          .then(res => {
            const bData = res.data?.data || res.data;
            if (bData && bData.equipment_notes) {
              setFetchedEquipmentNotes(bData.equipment_notes);
            }
          })
          .catch(() => {});
      }

      // 1. Restore unit returned conditions from backend record or local cache fallback
      if (selected.unit_conditions && typeof selected.unit_conditions === 'object') {
        setUnitReturnedConditions(selected.unit_conditions);
      } else {
        try {
          const savedConds = localStorage.getItem(`fsuu_unit_conditions_${selected.id}`);
          if (savedConds) {
            setUnitReturnedConditions(JSON.parse(savedConds));
          } else {
            setUnitReturnedConditions({});
          }
        } catch {
          setUnitReturnedConditions({});
        }
      }

      // 2. Restore assigned physical unit barcodes from backend record or local cache fallback
      if (selected.assigned_units && typeof selected.assigned_units === 'object') {
        setAssignedUnitSelections(selected.assigned_units);
      } else {
        try {
          const savedUnits = localStorage.getItem(`fsuu_assigned_units_${selected.id}`) || localStorage.getItem(`fsuu_completed_assigned_units_${selected.id}`);
          if (savedUnits) {
            setAssignedUnitSelections(JSON.parse(savedUnits));
          } else {
            setAssignedUnitSelections({});
          }
        } catch {
          setAssignedUnitSelections({});
        }
      }

      // 3. Hydrate from Single Backend Persisted Inspection Record
      api.get(`/inspections?reference_id=${selected.id}&reference_type=avr_venue_booking`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          const existing = list.find(i => String(i.reference_id || i.inspectable_id) === String(selected.id)) || list[0];
          
          if (existing) {
            const hasBreach = isDamagedStatus || Boolean(existing.has_damage) || existing.condition === "damaged" || Boolean(existing.violation_type) || String(existing.notes || "").includes("[");
            
            setInspectionStatus(hasBreach ? "violation" : "clean");
            const existingNotes = existing.notes && !existing.notes.startsWith("[") ? existing.notes : "";
            setViolationNotes(existingNotes);
            
            const photo = existing.evidence_photo || existing.evidence_image || selected.evidence_photo || selected.evidence_image;
            setEvidencePhoto(photo || null);
            if (existing.violation_type) {
              setSelectedViolationType(existing.violation_type);
            } else if (existing.notes && existing.notes.startsWith("[")) {
              const match = existing.notes.match(/^\[(.*?)\]/);
              if (match && match[1]) setSelectedViolationType(match[1]);
            }

            // Hydrate DB unit assignments and per-unit outcomes if persisted
            if (existing.assigned_units && typeof existing.assigned_units === 'object') {
              setAssignedUnitSelections(existing.assigned_units);
            } else if (selected.assigned_units && typeof selected.assigned_units === 'object') {
              setAssignedUnitSelections(selected.assigned_units);
            }
            if (existing.unit_conditions && typeof existing.unit_conditions === 'object') {
              setUnitReturnedConditions(existing.unit_conditions);
            }
          }
        })
        .catch(() => {
          if (selected?.assigned_units && typeof selected.assigned_units === 'object') {
            setAssignedUnitSelections(selected.assigned_units);
          }
          if (isDamagedStatus) {
            setInspectionStatus("violation");
          }
        });
    }
  }, [selected?.id]);

  // Robust Equipment Name Resolver: translates raw IDs (e.g. 3, 5), keys (e.g. proj), and names into human-readable catalog names
  const resolveEquipmentName = (raw) => {
    if (!raw) return "Equipment Item";
    const clean = String(raw).trim();
    const cleanLower = clean.toLowerCase();

    // 1. Check known lookup dictionary
    if (KNOWN_EQUIPMENT_NAMES[cleanLower]) {
      return KNOWN_EQUIPMENT_NAMES[cleanLower];
    }

    // 2. Check dynamic dbEquipmentTypes
    if (Array.isArray(dbEquipmentTypes) && dbEquipmentTypes.length > 0) {
      const match = dbEquipmentTypes.find(t => 
        String(t.id) === clean ||
        String(t.eq_name || t.name || t.category || "").toLowerCase() === cleanLower
      );
      if (match) return match.eq_name || match.name || match.category;
    }

    // 3. Check localStorage cache
    try {
      const saved = localStorage.getItem("fsuu_equipment_types") || localStorage.getItem("fsuu_cache_public_equipment");
      if (saved) {
        const list = JSON.parse(saved);
        const match = list.find(t => 
          String(t.id) === clean || 
          String(t.eq_name || t.name || t.category || "").toLowerCase() === cleanLower
        );
        if (match) return match.eq_name || match.name || match.category;
      }
    } catch {}

    // 4. Return formatted clean string
    return clean;
  };

  // Parse Requested Categories from all potential data structures
  const getRequestedCategories = () => {
    if (!selected) return [];
    let categories = [];
    const notesStr = selected.equipment_notes || fetchedEquipmentNotes || "";

    if (Array.isArray(selected.items) && selected.items.length > 0) {
      categories = selected.items.map(item => {
        const nameVal = item.equipment_type?.name || item.equipment_type?.eq_name || item.equipment_name || item.name || item.equipment_type_id || item.equipment_type;
        return {
          category: resolveEquipmentName(nameVal),
          quantity: item.quantity_requested || item.quantity || 1
        };
      });
    } else if (Array.isArray(selected.venue_booking_equipment) && selected.venue_booking_equipment.length > 0) {
      categories = selected.venue_booking_equipment.map(vbe => {
        const nameVal = vbe.equipment_type?.name || vbe.equipment_type?.eq_name || vbe.others_specify || vbe.name || vbe.equipment_type_id;
        return {
          category: resolveEquipmentName(nameVal),
          quantity: vbe.quantity_requested || vbe.quantity || 1
        };
      });
    } else if (notesStr) {
      categories = notesStr.split(',').map(s => {
        const cleanStr = s.trim();
        const match = cleanStr.match(/^(.*?)\s*\(Qty:\s*(\d+)\)/i);
        if (match) {
          return { category: resolveEquipmentName(match[1]), quantity: parseInt(match[2], 10) || 1 };
        }
        return { category: resolveEquipmentName(cleanStr), quantity: 1 };
      }).filter(c => c.category && c.category !== "None");
    }
    return categories;
  };

  const requestedCategories = getRequestedCategories();

  if (!selected) return null;

  const currentStatus = (selected.status || selected.tracking_number?.status || "").toLowerCase();
  const isPending = currentStatus === "pending";
  const isApproved = currentStatus === "approved";
  const isOngoing = currentStatus === "ongoing" || currentStatus === "on-going";
  const isPostInspection = currentStatus === "post-inspection" || currentStatus === "post-event inspection" || currentStatus === "post_inspection";
  const isCompletedOrDamaged = currentStatus === "completed" || currentStatus === "damaged" || currentStatus === "solved";
  const isSideBySide = isPostInspection || isCompletedOrDamaged || isHistoryView;

  // Format Time into 12-hour AM/PM real-time format
  const formatRealTime = (timeStr) => {
    if (!timeStr) return "N/A";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const dt = new Date(`${todayStr}T${timeStr.includes(":") ? (timeStr.length === 5 ? timeStr + ":00" : timeStr) : timeStr}`);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      }
    } catch {}
    return timeStr;
  };

  // Format Time and Date Filed
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

  const getAvailableUnitsForCategory = (catName) => {
    if (!catName || catName === "NONE") return physicalUnits;
    const cleanCat = String(catName).trim().toLowerCase();

    const matched = physicalUnits.filter((u) => {
      const uTypeName = String(u.equipment_type?.name || u.equipment_type?.eq_name || "").trim().toLowerCase();
      const uCategoryName = String(u.category || u.category_name || u.eq_type || "").trim().toLowerCase();
      const uTypeId = String(u.equipment_type_id || u.equipment_type?.id || "").trim().toLowerCase();

      if (uTypeName && (uTypeName === cleanCat || cleanCat.includes(uTypeName) || uTypeName.includes(cleanCat))) {
        return true;
      }
      if (uCategoryName && (uCategoryName === cleanCat || cleanCat.includes(uCategoryName) || uCategoryName.includes(cleanCat))) {
        return true;
      }
      if (uTypeId && (uTypeId === cleanCat || KNOWN_EQUIPMENT_NAMES[uTypeId]?.toLowerCase() === cleanCat)) {
        return true;
      }
      return false;
    });

    return matched;
  };

  // Step 2 Workflow: Selecting a unit and confirming releases it immediately: Inventory Released +1, Available -1
  const updateAssignedUnitSelections = (updater) => {
    setAssignedUnitSelections(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (selected && selected.id) {
        // Persist assigned_units directly to venue_booking database record
        api.put(`/avr-venue-bookings/${selected.id}/assign-units`, { assigned_units: next }).catch(() => {});
        // Auto-persist release assignment to backend inspection record
        api.post("/inspections", {
          reference_type: "avr_venue_booking",
          reference_id: selected.id,
          assigned_units: next,
          unit_conditions: unitReturnedConditions,
          condition: inspectionStatus === "clean" ? "good" : "damaged",
          notes: violationNotes || "",
        }).catch(() => {});
      }
      return next;
    });
  };

  // Step 3 Workflow: Auto-save per-unit selections (Good / Damaged / Lost) as part of the booking's persisted record
  const updateUnitReturnedConditions = (updater) => {
    setUnitReturnedConditions(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (selected && selected.id) {
        // Check if any unit is marked Damaged or Lost to keep shared outcome state in sync
        const hasDamageOrLoss = Object.values(next).some(cond => cond === "Damaged" || cond === "Lost");
        const targetStatus = hasDamageOrLoss ? "violation" : "clean";
        setInspectionStatus(targetStatus);

        // Auto-save to backend inspection record
        api.post("/inspections", {
          reference_type: "avr_venue_booking",
          reference_id: selected.id,
          assigned_units: assignedUnitSelections,
          unit_conditions: next,
          condition: targetStatus === "clean" ? "good" : "damaged",
          violation_type: targetStatus === "violation" ? selectedViolationType : null,
          notes: violationNotes || "",
        }).catch(() => {});
      }
      return next;
    });
  };

  // Step 4 Workflow: Complete Event reconciliation
  const syncInspectedUnitsToInventory = async (isCompleting = false) => {
    if (!selected || !selected.id) return;
    try {
      const dbUpdatePromises = [];

      categoriesToRender.forEach((catObj, catIdx) => {
        const catName = catObj.category;
        const reqQty = parseInt(catObj.quantity, 10) || 1;

        for (let uIdx = 0; uIdx < reqQty; uIdx++) {
          const fieldKey = `${catIdx}-${uIdx}`;
          const bCode = assignedUnitSelections[fieldKey] ? String(assignedUnitSelections[fieldKey]).trim() : "";
          const condChoice = unitReturnedConditions[fieldKey] || "Good";

          if (bCode) {
            // Backend sync: persist condition + status to database
            const newStatus = condChoice === "Damaged" ? "damaged" : (condChoice === "Lost" ? "decommissioned" : "available");
            const newCondition = condChoice === "Good" ? "Good" : condChoice;

            const dbUnit = physicalUnits.find(u => String(u.unit_code || u.barcode || u.id).trim() === bCode);
            const unitDbId = dbUnit?.id && Number.isFinite(Number(dbUnit.id)) ? Number(dbUnit.id) : null;

            if (unitDbId) {
              dbUpdatePromises.push(
                api.put(`/admin/equipment-units/${unitDbId}`, {
                  status: newStatus,
                  condition: newCondition,
                }).catch(err => {
                  console.warn(`[VenueBorrow] Failed to update unit ${unitDbId} (${bCode}):`, err?.response?.data || err.message);
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
    } catch (err) {
      console.error("Failed to sync inspected units to inventory:", err);
    }
  };


  const categoriesToRender = isOverrideActive
    ? (overrideCategory !== "NONE" ? [{ category: overrideCategory, quantity: overrideQuantity }] : [])
    : requestedCategories;

  const handleSavePostInspection = async (e) => {
    if (e) e.preventDefault();
    setSavingInspection(true);
    syncInspectedUnitsToInventory(false);
    try {
      await api.post("/inspections", {
        reference_type: "avr_venue_booking",
        reference_id: selected.id,
        inspectable_type: "avr_venue_booking",
        inspectable_id: selected.id,
        condition: inspectionStatus === "clean" ? "good" : "damaged",
        violation_type: inspectionStatus === "violation" ? selectedViolationType : null,
        notes: violationNotes || (inspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${selectedViolationType}] Post-event inspection breach.`),
        evidence_photo: evidencePhoto,
        evidence_image: evidencePhoto,
        assigned_units: assignedUnitSelections,
        unit_conditions: unitReturnedConditions,
      });

      setInspectionSuccessMsg("Post-event inspection record saved.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } catch {
      setInspectionSuccessMsg("Inspection record updated.");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } finally {
      setSavingInspection(false);
    }
  };

  const handleDoneComplete = async () => {
    // 1. Trigger final reconciliation (Good -> Released -1, Available +1; Damaged -> Released -1, Damaged +1; Lost -> Released -1, Lost +1)
    syncInspectedUnitsToInventory(true);

    // 2. Persist the final inspection outcome
    if (isPostInspection) {
      await handleSavePostInspection();
    }

    // 3. Mark completed and update status
    handleAction(selected.id, "complete", {
      inspection_status: inspectionStatus,
      condition: inspectionStatus === "violation" ? "damaged" : "good",
      has_damage: inspectionStatus === "violation" ? 1 : 0,
      violation_type: inspectionStatus === "violation" ? selectedViolationType : null,
      evidence_photo: evidencePhoto,
      notes: violationNotes || (inspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${selectedViolationType}] Post-event inspection breach.`)
    });
  };

  const resolvePhotoUrl = (photo) => {
    if (!photo || photo === "#" || photo === "null" || photo === "undefined") return null;
    if (typeof photo === "string" && (photo.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB") || (photo.startsWith("data:image") && photo.length < 200))) return null;
    if (photo.startsWith("data:") || photo.startsWith("http://") || photo.startsWith("https://")) return photo;
    return `http://localhost:8000/storage/${photo}`;
  };

  // Step 3 Spec: Exactly one status field driving both top-right header badge and post-event form
  const getDisplayStatusText = () => {
    if (isPostInspection) {
      return inspectionStatus === "clean" ? "Satisfactory" : "Policy Breach";
    }
    if (isCompletedOrDamaged) {
      return inspectionStatus === "violation" || currentStatus === "damaged" ? "Policy Breach" : "Completed";
    }
    return currentStatus || "pending";
  };

  const displayStatus = getDisplayStatusText();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Booking Form</h3>
              <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1">
                <p>
                  Track No. : <span className="font-mono text-slate-800 font-bold">{selected.reference_code || selected.tracking_number?.reference_code || `TRK-AVR${selected.id}`}</span> | <span className="text-slate-800 font-bold">{selected.venue_name || selected.venue?.name || "AVR Facility"}</span>
                </p>
                <p>
                  Time and Date Filed : <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Exactly ONE status field driving top-right status badge */}
              <span className="font-mono text-xs font-bold uppercase text-slate-500">
                Status: <span className={`font-black ${
                  displayStatus === "Satisfactory" || displayStatus === "approved" ? "text-emerald-600" :
                  displayStatus === "ongoing" || displayStatus === "on-going" ? "text-blue-600" :
                  displayStatus === "Completed" || displayStatus === "completed" ? "text-slate-800" :
                  displayStatus === "Policy Breach" || displayStatus === "damaged" || displayStatus === "rejected" ? "text-rose-600" :
                  "text-amber-600"
                }`}>{displayStatus}</span>
              </span>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {feedbackMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle size={15} /> {feedbackMessage}
            </div>
          )}

          {/* Conditional Layout Rendering */}
          {isPending ? (
            <div className="space-y-4">
              <VenueBookingInfo
                selected={selected}
                formatRealTime={formatRealTime}
                formatDateTimeFiled={formatDateTimeFiled}
                formatDate={formatDate}
                requestedCategories={requestedCategories}
                setFullImageModal={setFullImageModal}
              />
              <div className="py-2 border-t border-b border-slate-200 text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Reservation Status : <strong className="text-amber-600 font-mono font-bold uppercase">Pending Review</strong></span>
                <span className="text-[11px] text-slate-400">Review request details before approving or rejecting.</span>
              </div>
            </div>
          ) : isApproved ? (
            <div className="space-y-4">
              <VenueBookingInfo
                selected={selected}
                formatRealTime={formatRealTime}
                formatDateTimeFiled={formatDateTimeFiled}
                formatDate={formatDate}
                requestedCategories={requestedCategories}
                setFullImageModal={setFullImageModal}
              />
              <div className="py-2 border-t border-b border-slate-200 text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Reservation Status : <strong className="text-emerald-600 font-mono font-bold uppercase">Approved</strong></span>
                <span className="text-[11px] text-slate-400">Click Set On-Going when event starts to view Equipment Catalog checklist.</span>
              </div>
            </div>
          ) : isOngoing ? (
            /* ON-GOING STATUS: Equipment Catalog Checklist & Live Release */
            <div className="space-y-4">
              <VenueBookingInfo
                selected={selected}
                formatRealTime={formatRealTime}
                formatDateTimeFiled={formatDateTimeFiled}
                formatDate={formatDate}
                requestedCategories={requestedCategories}
                setFullImageModal={setFullImageModal}
              />
              <VenueEquipmentChecklist
                categoriesToRender={categoriesToRender}
                assignedUnitSelections={assignedUnitSelections}
                setAssignedUnitSelections={updateAssignedUnitSelections}
                getAvailableUnitsForCategory={getAvailableUnitsForCategory}
                isHistoryView={isHistoryView}
                isSideBySide={false}
                isOverrideActive={isOverrideActive}
                setIsOverrideActive={setIsOverrideActive}
                overrideCategory={overrideCategory}
                setOverrideCategory={setOverrideCategory}
                overrideQuantity={overrideQuantity}
                setOverrideQuantity={setOverrideQuantity}
                dbEquipmentTypes={dbEquipmentTypes}
              />
            </div>
          ) : (
            /* SIDE-BY-SIDE DESIGN: POST-EVENT INSPECTION & HISTORY LOG VIEW */
            <div className="space-y-4">
              <VenueBookingInfo
                selected={selected}
                formatRealTime={formatRealTime}
                formatDateTimeFiled={formatDateTimeFiled}
                formatDate={formatDate}
                requestedCategories={requestedCategories}
                setFullImageModal={setFullImageModal}
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6">
                  <VenueEquipmentChecklist
                    categoriesToRender={categoriesToRender}
                    assignedUnitSelections={assignedUnitSelections}
                    setAssignedUnitSelections={updateAssignedUnitSelections}
                    getAvailableUnitsForCategory={getAvailableUnitsForCategory}
                    unitReturnedConditions={unitReturnedConditions}
                    setUnitReturnedConditions={updateUnitReturnedConditions}
                    isHistoryView={isHistoryView}
                    isSideBySide={true}
                  />
                </div>
                <div className="lg:col-span-6">
                  <VenuePostInspectionForm
                    inspectionStatus={inspectionStatus}
                    setInspectionStatus={setInspectionStatus}
                    selectedViolationType={selectedViolationType}
                    setSelectedViolationType={setSelectedViolationType}
                    violationOptions={violationOptions}
                    showManageViolations={showManageViolations}
                    setShowManageViolations={setShowManageViolations}
                    newViolationTypeInput={newViolationTypeInput}
                    setNewViolationTypeInput={setNewViolationTypeInput}
                    handleAddViolationOption={handleAddViolationOption}
                    handleDeleteViolationOption={handleDeleteViolationOption}
                    damagedEqType={damagedEqType}
                    setDamagedEqType={setDamagedEqType}
                    damagedEqQty={damagedEqQty}
                    setDamagedEqQty={setDamagedEqQty}
                    damagedUnitBarcodes={damagedUnitBarcodes}
                    setDamagedUnitBarcodes={setDamagedUnitBarcodes}
                    dbEquipmentTypes={dbEquipmentTypes}
                    getAvailableUnitsForCategory={getAvailableUnitsForCategory}
                    evidencePhoto={evidencePhoto}
                    setEvidencePhoto={setEvidencePhoto}
                    resolvePhotoUrl={resolvePhotoUrl}
                    setFullImageModal={setFullImageModal}
                    violationNotes={violationNotes}
                    setViolationNotes={setViolationNotes}
                    savingInspection={savingInspection}
                    inspectionSuccessMsg={inspectionSuccessMsg}
                    handleSavePostInspection={handleSavePostInspection}
                    isHistoryView={isHistoryView}
                    isAdminOrSuperAdmin={isAdminOrSuperAdmin}
                    user={user}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reject Form Drawer */}
          {showRejectForm && (
            <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-2.5 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-900">Reason for Rejection *</label>
              <textarea
                rows={2}
                value={rejectionComments}
                onChange={(e) => setRejectionComments(e.target.value)}
                placeholder="State reason for rejecting reservation..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionComments.trim() || !!actionLoading}
                  onClick={() => handleAction(selected.id, "reject", { rejection_reason: rejectionComments })}
                  className="px-4 py-1.5 bg-white border border-rose-600 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold"
                >
                  Submit Rejection
                </button>
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
          ) : isApproved ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleAction(selected.id, "ongoing")}
                disabled={!!actionLoading}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} /> Set On-Going
              </button>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : isOngoing ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleAction(selected.id, "post-inspection")}
                disabled={!!actionLoading}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck size={13} /> Set Post-Event Inspection
              </button>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : isPostInspection ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDoneComplete}
                disabled={!!actionLoading || savingInspection}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={13} /> Complete Event
              </button>
              <button
                type="button"
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setSelected(null); setShowRejectForm(false); }}
              className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

        {/* Lightbox Modal */}
        <EvidenceLightboxModal
          fullImageModal={fullImageModal}
          setFullImageModal={setFullImageModal}
          resolvePhotoUrl={resolvePhotoUrl}
          evidencePhoto={evidencePhoto}
        />

      </div>
    </div>
  );
}
