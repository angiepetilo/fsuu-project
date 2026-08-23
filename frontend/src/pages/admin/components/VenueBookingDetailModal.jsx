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
import VenueModalHeader from "./booking-modal/VenueModalHeader";
import VenueModalFooter from "./booking-modal/VenueModalFooter";


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

  // Pre-Event Inspection State
  const [preInspectionStatus, setPreInspectionStatus] = useState("clean");
  const [preViolationNotes, setPreViolationNotes] = useState("");
  const [preSelectedViolationType, setPreSelectedViolationType] = useState("Physical Facility / Furniture Damage");
  const [preEvidencePhoto, setPreEvidencePhoto] = useState(null);

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

  // Active bookings list for schedule overlap checking
  const [allVenueBookings, setAllVenueBookings] = useState([]);
  const [allEquipmentBorrows, setAllEquipmentBorrows] = useState([]);

  // Fetch real equipment stock, physical units, and active bookings from backend DB ONLY when modal is open
  useEffect(() => {
    if (!selected || !selected.id) return;
    setEqLoading(true);
    Promise.all([
      api.get("/admin/equipment-units").catch(() => ({ data: [] })),
      api.get("/admin/equipment-types").catch(() => ({ data: [] })),
      api.get("/avr-venue-bookings").catch(() => ({ data: [] })),
      api.get("/avr-equipment-borrowings").catch(() => ({ data: [] })),
    ]).then(([unitsRes, typesRes, vbRes, ebRes]) => {
      const uData = Array.isArray(unitsRes.data) ? unitsRes.data : (unitsRes.data?.data ?? []);
      const tData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data?.data ?? []);
      const vbData = Array.isArray(vbRes.data) ? vbRes.data : (vbRes.data?.data ?? []);
      const ebData = Array.isArray(ebRes.data) ? ebRes.data : (ebRes.data?.data ?? []);
      setPhysicalUnits(uData);
      setDbEquipmentTypes(tData);
      setAllVenueBookings(vbData);
      setAllEquipmentBorrows(ebData);
    }).finally(() => setEqLoading(false));
  }, [selected?.id]);

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

      // 3. Hydrate from Backend Persisted Inspection Records
      api.get(`/inspections?reference_id=${selected.id}&reference_type=avr_venue_booking`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          const postUse = list.find(i => String(i.reference_id || i.inspectable_id) === String(selected.id) && (!i.inspection_type || i.inspection_type === 'post_event')) || list[0];
          const preUse = list.find(i => String(i.reference_id || i.inspectable_id) === String(selected.id) && i.inspection_type === 'pre_event');
          
          if (postUse) {
            const hasBreach = isDamagedStatus || Boolean(postUse.has_damage) || postUse.condition === "damaged" || Boolean(postUse.violation_type) || String(postUse.notes || "").includes("[");
            
            setInspectionStatus(hasBreach ? "violation" : "clean");
            let existingNotes = postUse.notes || "";
            if (existingNotes.startsWith("[")) {
              const match = existingNotes.match(/^\[(.*?)\](.*)/);
              if (match) {
                if (!postUse.violation_type && match[1]) {
                  setSelectedViolationType(match[1]);
                }
                existingNotes = match[2].trim();
                if (existingNotes === "Post-event inspection breach.") {
                  existingNotes = "";
                }
              }
            } else if (postUse.violation_type) {
              setSelectedViolationType(postUse.violation_type);
            }
            
            setViolationNotes(existingNotes);

            const photo = postUse.evidence_photo || postUse.evidence_image || selected.evidence_photo || selected.evidence_image;
            setEvidencePhoto(photo || null);

            // Hydrate DB unit assignments and per-unit outcomes if persisted
            if (postUse.assigned_units && typeof postUse.assigned_units === 'object') {
              setAssignedUnitSelections(postUse.assigned_units);
            } else if (selected.assigned_units && typeof selected.assigned_units === 'object') {
              setAssignedUnitSelections(selected.assigned_units);
            }
            if (postUse.unit_conditions && typeof postUse.unit_conditions === 'object') {
              setUnitReturnedConditions(postUse.unit_conditions);
            }
          }

          if (preUse) {
            const hasBreach = preUse.condition === "damaged" || Boolean(preUse.violation_type) || String(preUse.notes || "").includes("[");
            setPreInspectionStatus(hasBreach ? "violation" : "clean");
            let existingNotes = preUse.notes || "";
            if (existingNotes.startsWith("[")) {
              const match = existingNotes.match(/^\[(.*?)\](.*)/);
              if (match) {
                if (!preUse.violation_type && match[1]) {
                  setPreSelectedViolationType(match[1]);
                }
                existingNotes = match[2].trim();
              }
            } else if (preUse.violation_type) {
              setPreSelectedViolationType(preUse.violation_type);
            }
            setPreViolationNotes(existingNotes);
            setPreEvidencePhoto(preUse.evidence_photo || preUse.evidence_image || null);
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

  // Helper: Normalize time string to 24-hour HH:MM:SS
  const normalizeTimeTo24h = (tStr) => {
    if (!tStr) return "00:00:00";
    const clean = String(tStr).trim();
    if (clean.includes("AM") || clean.includes("PM")) {
      try {
        const d = new Date(`1970-01-01 ${clean}`);
        if (!isNaN(d.getTime())) {
          return d.toTimeString().slice(0, 8);
        }
      } catch {}
    }
    const parts = clean.split(":");
    const h = parts[0]?.padStart(2, "0") || "00";
    const m = parts[1]?.padStart(2, "0") || "00";
    const s = parts[2]?.padStart(2, "0") || "00";
    return `${h}:${m}:${s}`;
  };

  // Helper: Extract comparable start & end date-time timestamps for any booking object
  const getBookingRange = (b) => {
    if (!b) return null;
    const startD = b.date_of_usage || (b.start_datetime ? b.start_datetime.slice(0, 10) : null) || b.date;
    const endD = b.reservation_end_date || b.end_date || (b.end_datetime ? b.end_datetime.slice(0, 10) : null) || startD;
    const startT = normalizeTimeTo24h(b.time_start || (b.start_datetime ? b.start_datetime.slice(11, 19) : null) || "08:00:00");
    const endT = normalizeTimeTo24h(b.time_end || (b.end_datetime ? b.end_datetime.slice(11, 19) : null) || "17:00:00");

    if (!startD) return null;
    const startMs = new Date(`${startD}T${startT}`).getTime();
    const endMs = new Date(`${endD}T${endT}`).getTime();
    return { startMs, endMs, startD, endD, startT, endT };
  };

  // Helper: Check if two booking schedules overlap
  const isScheduleConflicting = (rangeA, rangeB) => {
    if (!rangeA || !rangeB) return false;
    if (isNaN(rangeA.startMs) || isNaN(rangeA.endMs) || isNaN(rangeB.startMs) || isNaN(rangeB.endMs)) return false;
    // Strict overlap formula: startA < endB && endA > startB
    return rangeA.startMs < rangeB.endMs && rangeA.endMs > rangeB.startMs;
  };

  // Set of barcodes reserved in OTHER active bookings during the selected booking's time slot
  const overlappingReservedBarcodes = useMemo(() => {
    if (!selected) return new Set();
    const selectedRange = getBookingRange(selected);
    if (!selectedRange) return new Set();

    const reserved = new Set();
    const inactiveStatuses = ["completed", "done", "returned", "rejected", "cancelled", "cancelled_by_user", "damaged", "lost", "solved"];

    // 1. Check other Venue Bookings
    allVenueBookings.forEach((vb) => {
      if (String(vb.id) === String(selected.id)) return;
      const st = String(vb.status || vb.tracking_number?.status || "").toLowerCase();
      if (inactiveStatuses.includes(st)) return;

      const vbRange = getBookingRange(vb);
      if (isScheduleConflicting(selectedRange, vbRange)) {
        let au = vb.assigned_units;
        if (typeof au === "string") {
          try { au = JSON.parse(au); } catch { au = {}; }
        }
        if (au && typeof au === "object") {
          Object.values(au).forEach((bCode) => {
            if (bCode) reserved.add(String(bCode).trim().toUpperCase());
          });
        }
      }
    });

    // 2. Check other Equipment Borrowings
    allEquipmentBorrows.forEach((eb) => {
      const st = String(eb.status || eb.tracking_number?.status || "").toLowerCase();
      if (inactiveStatuses.includes(st)) return;

      const ebRange = getBookingRange(eb);
      if (isScheduleConflicting(selectedRange, ebRange)) {
        let au = eb.assigned_units;
        if (typeof au === "string") {
          try { au = JSON.parse(au); } catch { au = {}; }
        }
        if (au && typeof au === "object") {
          Object.values(au).forEach((bCode) => {
            if (bCode) reserved.add(String(bCode).trim().toUpperCase());
          });
        }
      }
    });

    return reserved;
  }, [selected, allVenueBookings, allEquipmentBorrows]);

  // Map of equipment_type_id -> total qty "soft-reserved" by OTHER overlapping active bookings
  // (i.e., bookings that requested units of a category but may not have been assigned a barcode yet)
  const overlappingCategoryQtyMap = useMemo(() => {
    if (!selected) return {};
    const selectedRange = getBookingRange(selected);
    if (!selectedRange) return {};

    const qtyMap = {}; // { equipment_type_id: totalRequestedQty }
    const inactiveStatuses = ["completed", "done", "returned", "rejected", "cancelled", "cancelled_by_user", "damaged", "lost", "solved"];

    const addItemQty = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        const typeId = String(item.equipment_type_id || item.equipment_type?.id || item.equipmentType?.id || "").trim();
        const qty = parseInt(item.quantity_requested || item.quantity || 1, 10) || 1;
        if (typeId) qtyMap[typeId] = (qtyMap[typeId] || 0) + qty;
      });
    };

    // 1. Other Venue Bookings
    allVenueBookings.forEach((vb) => {
      if (String(vb.id) === String(selected.id)) return;
      const st = String(vb.status || vb.tracking_number?.status || "").toLowerCase();
      if (inactiveStatuses.includes(st)) return;
      const vbRange = getBookingRange(vb);
      if (!isScheduleConflicting(selectedRange, vbRange)) return;
      addItemQty(vb.equipment_items || vb.items || vb.venue_booking_equipment || []);
    });

    // 2. Equipment Borrowings
    allEquipmentBorrows.forEach((eb) => {
      const st = String(eb.status || eb.tracking_number?.status || "").toLowerCase();
      if (inactiveStatuses.includes(st)) return;
      const ebRange = getBookingRange(eb);
      if (!isScheduleConflicting(selectedRange, ebRange)) return;
      addItemQty(eb.items || eb.equipment_items || []);
    });

    return qtyMap;
  }, [selected, allVenueBookings, allEquipmentBorrows]);

  // Parse Requested Categories from all potential data structures with equipment_type_id
  const getRequestedCategories = () => {
    if (!selected) return [];
    let categories = [];
    const notesStr = selected.equipment_notes || fetchedEquipmentNotes || "";

    const structList = (Array.isArray(selected.equipment_items) && selected.equipment_items.length > 0) ? selected.equipment_items
      : (Array.isArray(selected.equipment_equipment) && selected.equipment_equipment.length > 0) ? selected.equipment_equipment
      : (Array.isArray(selected.venue_booking_equipment) && selected.venue_booking_equipment.length > 0) ? selected.venue_booking_equipment
      : (Array.isArray(selected.items) && selected.items.length > 0) ? selected.items : null;

    if (structList) {
      categories = structList.map(item => {
        const nameVal = item.equipment_type?.name || item.equipment_type?.eq_name || item.equipment_name || item.name || item.equipment_type_id || item.others_specify;
        const typeIdVal = item.equipment_type_id || item.equipment_type?.id || item.equipmentType?.id || null;
        return {
          category: resolveEquipmentName(nameVal),
          quantity: item.quantity_requested || item.quantity || 1,
          equipment_type_id: typeIdVal
        };
      });
    } else if (notesStr) {
      categories = notesStr.split(',').map(s => {
        const cleanStr = s.trim();
        const match = cleanStr.match(/^(.*?)\s*\(Qty:\s*(\d+)\)/i);
        const rawName = match ? match[1] : cleanStr;
        const qty = match ? (parseInt(match[2], 10) || 1) : 1;
        const cleanLower = rawName.toLowerCase();
        const matchedType = (dbEquipmentTypes || []).find(t => 
          String(t.id) === rawName ||
          String(t.eq_name || t.name || t.category || "").toLowerCase() === cleanLower
        );
        return { 
          category: resolveEquipmentName(rawName), 
          quantity: qty,
          equipment_type_id: matchedType?.id || null
        };
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

  const getAvailableUnitsForCategory = (catName, eqTypeId) => {
    if (!catName || catName === "NONE") return physicalUnits;

    // Filter candidate units from physicalUnits
    const cleanCat = String(catName).trim().toUpperCase();

    // 1. First priority: match strictly by equipment_type_id
    let matched = [];
    if (eqTypeId) {
      matched = physicalUnits.filter((u) => {
        const uTypeId = u.equipment_type_id || u.equipmentType?.id || u.equipment_type?.id;
        return String(uTypeId) === String(eqTypeId);
      });
    }

    // 2. Exact Category / Name Match (matching equipment_type.eq_name, name, or category)
    if (matched.length === 0) {
      matched = physicalUnits.filter((u) => {
        const uCatName = String(u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || u.equipment_type?.name || u.category || "").toUpperCase().trim();
        return uCatName === cleanCat;
      });
    }

    // 3. Strict Discrimination & Unit Name Matching (No substring cross-type leaks)
    if (matched.length === 0) {
      matched = physicalUnits.filter((u) => {
        const uCatName = String(u.equipmentType?.eq_name || u.equipmentType?.name || u.equipment_type?.eq_name || u.equipment_type?.name || u.category || "").toUpperCase().trim();
        const uUnitName = String(u.name || "").toUpperCase().trim();

        // Strict negative discrimination
        if (cleanCat === "PROJECTOR" && (uCatName.includes("SCREEN") || uUnitName.includes("SCREEN"))) {
          return false;
        }
        if (cleanCat === "MICROPHONE" && (uCatName.includes("WIRELESS") || uUnitName.includes("WIRELESS") || uUnitName.includes("WMIC") || uUnitName.startsWith("WM-"))) {
          return false;
        }
        if (cleanCat.includes("WIRELESS") && (!uCatName.includes("WIRELESS") && !uUnitName.includes("WIRELESS") && !uUnitName.includes("WMIC") && !uUnitName.startsWith("WM-"))) {
          return false;
        }

        return (
          uCatName === cleanCat ||
          uUnitName === cleanCat ||
          uUnitName.startsWith(`${cleanCat} `) ||
          uUnitName.startsWith(`${cleanCat}-`)
        );
      });
    }

    // 4. Operational & Schedule Availability Filtering:
    // Exclude units that are damaged/lost/under-repair, OR already assigned in an overlapping active booking
    const available = matched.filter((unit) => {
      const uCond = String(unit.condition || "good").toLowerCase();
      if (uCond === "damaged" || uCond === "lost" || uCond === "under repair") {
        return false;
      }

      const uStat = String(unit.status || "available").toLowerCase();
      if (uStat === "damaged" || uStat === "lost" || uStat === "decommissioned" || uStat === "under_maintenance") {
        return false;
      }

      const bCode = String(unit.unit_code || unit.barcode || unit.serial_number || unit.code || unit.id || "").trim().toUpperCase();

      // If this unit's barcode is explicitly assigned in another overlapping booking, exclude it
      if (bCode && overlappingReservedBarcodes.has(bCode)) {
        // Allow it only if it is currently assigned to a slot in THIS modal
        const isCurrentSlotAssignment = Object.values(assignedUnitSelections || {}).some(
          v => String(v).trim().toUpperCase() === bCode
        );
        if (!isCurrentSlotAssignment) return false;
      }

      return true;
    });

    // 5. Soft-Reservation by Quantity:
    // Even if no barcode is assigned yet by another booking, subtract their requested qty.
    // This prevents User B from seeing 3 units when User A (approved, unassigned) already "holds" 1.
    if (eqTypeId) {
      const totalOverlappingQty = overlappingCategoryQtyMap[String(eqTypeId)] || 0;
      if (totalOverlappingQty > 0) {
        // Count how many units were already excluded via the barcode check (to avoid double-subtracting)
        const alreadyExcludedByBarcode = matched.filter((u) => {
          const bCode = String(u.unit_code || u.barcode || u.serial_number || u.code || u.id || "").trim().toUpperCase();
          return bCode && overlappingReservedBarcodes.has(bCode);
        }).length;
        const additionalSoftReserved = Math.max(0, totalOverlappingQty - alreadyExcludedByBarcode);
        if (additionalSoftReserved > 0) {
          // Slice off the soft-reserved units from the tail of the available list
          return available.slice(0, Math.max(0, available.length - additionalSoftReserved));
        }
      }
    }

    return available;
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
        // Note: Decoupled per user request. Marking an equipment unit as Damaged or Lost 
        // will no longer force the overall Venue Inspection Status to Policy Breach. 
        // The venue status remains exactly what the user explicitly selects.
        // const hasDamageOrLoss = Object.values(next).some(cond => cond === "Damaged" || cond === "Lost");
        // const targetStatus = hasDamageOrLoss ? "violation" : "clean";
        // setInspectionStatus(targetStatus);

        // Auto-save to backend inspection record
        api.post("/inspections", {
          reference_type: "avr_venue_booking",
          reference_id: selected.id,
          assigned_units: assignedUnitSelections,
          unit_conditions: next,
          condition: inspectionStatus === "clean" ? "good" : "damaged",
          violation_type: inspectionStatus === "violation" ? selectedViolationType : null,
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
          } else if (condChoice === "Damaged" || condChoice === "Lost") {
            // No physical unit was assigned (abstract mode), but the item was damaged/lost
            // We must automate the count on the master equipment category so QTY PRESENT/RESERVED updates
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
    } catch (err) {
      console.error("Failed to sync inspected units to inventory:", err);
    }
  };


  const categoriesToRender = isOverrideActive
    ? (overrideCategory !== "NONE" ? [{ category: overrideCategory, quantity: overrideQuantity }] : [])
    : requestedCategories;

  const handleSavePostInspection = async (e, typeOverride = null) => {
    if (e) e.preventDefault();
    setSavingInspection(true);
    syncInspectedUnitsToInventory(false);
    
    const inspectionType = typeOverride || (isOngoing ? "pre_event" : "post_event");
    const isPre = inspectionType === "pre_event";
    
    try {
      await api.post("/inspections", {
        reference_type: "avr_venue_booking",
        reference_id: selected.id,
        inspectable_type: "avr_venue_booking",
        inspectable_id: selected.id,
        inspection_type: inspectionType,
        condition: isPre ? (preInspectionStatus === "clean" ? "good" : "damaged") : (inspectionStatus === "clean" ? "good" : "damaged"),
        violation_type: isPre ? (preInspectionStatus === "violation" ? preSelectedViolationType : null) : (inspectionStatus === "violation" ? selectedViolationType : null),
        notes: isPre ? (preViolationNotes || (preInspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${preSelectedViolationType}] Pre-event inspection breach.`)) : (violationNotes || (inspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${selectedViolationType}] Post-event inspection breach.`)),
        evidence_photo: isPre ? preEvidencePhoto : evidencePhoto,
        evidence_image: isPre ? preEvidencePhoto : evidencePhoto,
        assigned_units: assignedUnitSelections,
        unit_conditions: unitReturnedConditions,
      });

      setInspectionSuccessMsg(isPre ? "Pre-event inspection record saved." : "Post-event inspection record saved.");
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

    // 2. Persist the final inspection outcome silently in background
    if (isPostInspection) {
      api.post("/inspections", {
        reference_type: "avr_venue_booking",
        reference_id: selected.id,
        inspectable_type: "avr_venue_booking",
        inspectable_id: selected.id,
        inspection_type: "post_event",
        condition: inspectionStatus === "clean" ? "good" : "damaged",
        violation_type: inspectionStatus === "violation" ? selectedViolationType : null,
        notes: violationNotes || (inspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${selectedViolationType}] Post-event inspection breach.`),
        evidence_photo: evidencePhoto,
        evidence_image: evidencePhoto,
        assigned_units: assignedUnitSelections,
        unit_conditions: unitReturnedConditions,
      }).catch(() => {});
    }

    // 3. Mark completed and update status
    handleAction(selected.id, "complete", {
      inspection_status: inspectionStatus,
      condition: inspectionStatus === "violation" ? "damaged" : "good",
      has_damage: inspectionStatus === "violation" ? 1 : 0,
      violation_type: inspectionStatus === "violation" ? selectedViolationType : null,
      evidence_photo: evidencePhoto,
      notes: violationNotes || (inspectionStatus === "clean" ? "Satisfactory Condition (Clean Room)" : `[${selectedViolationType}] Post-event inspection breach.`),
      assigned_units: assignedUnitSelections,
      unit_conditions: unitReturnedConditions
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">


        <VenueModalHeader
          selected={selected}
          displayStatus={displayStatus}
          setSelected={setSelected}
          setShowRejectForm={setShowRejectForm}
          formatDateTimeFiled={formatDateTimeFiled}
        />

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
            /* APPROVED STATUS: Equipment Unit Assignment (Left) & Pre-Event Inspection Form (Right) */
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
                    isHistoryView={false}
                    isSideBySide={true}
                    isOverrideActive={isOverrideActive}
                    setIsOverrideActive={setIsOverrideActive}
                    overrideCategory={overrideCategory}
                    setOverrideCategory={setOverrideCategory}
                    overrideQuantity={overrideQuantity}
                    setOverrideQuantity={setOverrideQuantity}
                    dbEquipmentTypes={dbEquipmentTypes}
                  />
                </div>
                <div className="lg:col-span-6">
                  <VenuePostInspectionForm
                    inspectionStatus={preInspectionStatus}
                    setInspectionStatus={setPreInspectionStatus}
                    selectedViolationType={preSelectedViolationType}
                    setSelectedViolationType={setPreSelectedViolationType}
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
                    evidencePhoto={preEvidencePhoto}
                    setEvidencePhoto={setPreEvidencePhoto}
                    resolvePhotoUrl={resolvePhotoUrl}
                    setFullImageModal={setFullImageModal}
                    violationNotes={preViolationNotes}
                    setViolationNotes={setPreViolationNotes}
                    savingInspection={savingInspection}
                    inspectionSuccessMsg={inspectionSuccessMsg}
                    handleSavePostInspection={(e) => handleSavePostInspection(e, "pre_event")}
                    onSetPostInspection={() => handleAction(selected.id, "ongoing")}
                    isHistoryView={isHistoryView}
                    isAdminOrSuperAdmin={isAdminOrSuperAdmin}
                    user={user}
                    isOngoing={false}
                  />
                </div>
              </div>
            </div>
          ) : isOngoing ? (
            /* ON-GOING STATUS: Equipment Checklist (Left) & Ready for Inspection Trigger (Right) */
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
                    isHistoryView={isHistoryView}
                    isSideBySide={true}
                    isOverrideActive={isOverrideActive}
                    setIsOverrideActive={setIsOverrideActive}
                    overrideCategory={overrideCategory}
                    setOverrideCategory={setOverrideCategory}
                    overrideQuantity={overrideQuantity}
                    setOverrideQuantity={setOverrideQuantity}
                    dbEquipmentTypes={dbEquipmentTypes}
                  />
                </div>
                <div className="lg:col-span-6">
                  <div className="p-8 bg-white border border-slate-200/90 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center min-h-[260px] shadow-xs">
                    <FileCheck size={32} className="text-blue-600" />
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-slate-900 text-sm">Event Currently On-Going</h5>
                      <p className="text-xs text-slate-500 font-medium max-w-sm">
                        Facility is currently in use. Once the event finishes, click below to initiate post-event facility and equipment inspection.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(selected.id, "post-inspection")}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileCheck size={14} />
                      <span>Ready for Inspection (After)</span>
                    </button>
                  </div>
                </div>
              </div>
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
                <div className="lg:col-span-6 space-y-4">
                  {isHistoryView && (
                    <VenuePostInspectionForm
                      inspectionStatus={preInspectionStatus}
                      setInspectionStatus={setPreInspectionStatus}
                      selectedViolationType={preSelectedViolationType}
                      setSelectedViolationType={setPreSelectedViolationType}
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
                      evidencePhoto={preEvidencePhoto}
                      setEvidencePhoto={setPreEvidencePhoto}
                      resolvePhotoUrl={resolvePhotoUrl}
                      setFullImageModal={setFullImageModal}
                      violationNotes={preViolationNotes}
                      setViolationNotes={setPreViolationNotes}
                      savingInspection={savingInspection}
                      inspectionSuccessMsg={inspectionSuccessMsg}
                      handleSavePostInspection={(e) => handleSavePostInspection(e, "pre_event")}
                      isHistoryView={isHistoryView}
                      isAdminOrSuperAdmin={isAdminOrSuperAdmin}
                      user={user}
                      isOngoing={true}
                    />
                  )}
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
                    handleSavePostInspection={(e) => handleSavePostInspection(e, "post_event")}
                    isHistoryView={isHistoryView}
                    isAdminOrSuperAdmin={isAdminOrSuperAdmin}
                    user={user}
                    isOngoing={false}
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

        <VenueModalFooter
          isPending={isPending}
          isApproved={isApproved}
          isOngoing={isOngoing}
          isPostInspection={isPostInspection}
          selected={selected}
          handleAction={handleAction}
          handleDoneComplete={handleDoneComplete}
          actionLoading={actionLoading}
          savingInspection={savingInspection}
          setSelected={setSelected}
          setShowRejectForm={setShowRejectForm}
          showRejectForm={showRejectForm}
          rejectionComments={rejectionComments}
          setRejectionComments={setRejectionComments}
        />

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
