import React, { useState, useEffect, useMemo } from "react";
import { FileText, ExternalLink, Upload, CheckCircle, CheckCircle2, HardDrive, Check, Shield, PackageCheck, AlertCircle, X, Loader2, Download, Eye, Image as ImageIcon } from "lucide-react";
import { resolveStorageUrl, openFileInNewTab } from "@/lib/utils";
import { formatDateRange, formatTime12 } from "@/lib/dateUtils";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { formatPhilippineNumber } from "@/lib/phoneValidation";
import { usePermissions } from "@/hooks/usePermissions";
import SuperAdminVenueOverrideModal from "./SuperAdminVenueOverrideModal";

export const extractEquipmentNeededRemarks = (booking) => {
  if (!booking) return "";
  if (booking.equipment_needed_remarks && typeof booking.equipment_needed_remarks === "string") {
    return booking.equipment_needed_remarks.trim();
  }
  if (booking.equipment_remarks && typeof booking.equipment_remarks === "string") {
    return booking.equipment_remarks.trim();
  }
  const notes = booking.equipment_notes || booking.equipment_inspection_remarks || "";
  if (typeof notes === "string" && notes.trim()) {
    if (/Equipment[\s_-]*Needed:\s*/i.test(notes)) {
      const parts = notes.split(/Equipment[\s_-]*Needed:\s*/i);
      return parts[parts.length - 1]?.trim() || "";
    }
    const hasCategoryQtyPattern = /\b(qty:\s*\d+|\(\d+\s*units?\))/i.test(notes);
    if (!hasCategoryQtyPattern) {
      return notes.trim();
    }
  }
  return "";
};

export default function VenueBookingInfo({
  selected,
  formatRealTime = formatTime12,
  formatDateTimeFiled,
  formatDate,
  requestedCategories = [],
  setFullImageModal,
  onBookingUpdated,
  assignedUnitSelections = {},
  setAssignedUnitSelections,
  physicalUnits = [],
  dbEquipmentTypes = [],
  getAvailableUnitsForCategory,
  isOngoing = false,
  isApproved = false,
}) {
  const { isSuperAdmin } = usePermissions();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFocusField, setOverrideFocusField] = useState("venue");

  const handleOpenOverride = (field = "venue") => {
    setOverrideFocusField(field);
    setShowOverrideModal(true);
  };

  const storageKeyHardcopy = selected?.id ? `fsuu_hardcopy_${selected.id}` : null;
  const storageKeyNotes = selected?.id ? `fsuu_hardcopy_notes_${selected.id}` : null;

  const [isHardcopy, setIsHardcopy] = useState(false);
  const [hardcopyNotes, setHardcopyNotes] = useState("");
  const [staffUploadUrl, setStaffUploadUrl] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [hasHardcopySaved, setHasHardcopySaved] = useState(false);
  const [savedIsHardcopy, setSavedIsHardcopy] = useState(false);
  const [savedHardcopyNotes, setSavedHardcopyNotes] = useState("");
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);

  useEffect(() => {
    setStaffUploadUrl(null);
    if (!storageKeyHardcopy) {
      setIsHardcopy(false);
      setHardcopyNotes("");
      setSavedIsHardcopy(false);
      setSavedHardcopyNotes("");
      setHasHardcopySaved(false);
      return;
    }
    try {
      const savedHc = localStorage.getItem(storageKeyHardcopy);
      const savedNotes = localStorage.getItem(storageKeyNotes);
      const isHcActive = savedHc === "true" || selected?.physical_hardcopy_received === 1 || selected?.physical_hardcopy_received === true;
      const initialNotes = savedNotes || "";
      setHasHardcopySaved(isHcActive);
      setIsHardcopy(isHcActive);
      setHardcopyNotes(initialNotes);
      setSavedIsHardcopy(isHcActive);
      setSavedHardcopyNotes(initialNotes);
    } catch {
      setIsHardcopy(false);
      setSavedIsHardcopy(false);
      setSavedHardcopyNotes("");
    }
  }, [selected?.id, storageKeyHardcopy, storageKeyNotes]);

  const hasHardcopyChanges = isHardcopy !== savedIsHardcopy || (isHardcopy && hardcopyNotes.trim() !== savedHardcopyNotes.trim());

  if (!selected) return null;

  const [assigningUnit, setAssigningUnit] = useState(false);
  const canAssign = isSuperAdmin || isApproved || isOngoing;

  // Normalize and resolve assigned physical units details
  const assignedUnitsList = useMemo(() => {
    let raw = assignedUnitSelections || selected?.assigned_units;
    if (!raw || (typeof raw === "object" && Object.keys(raw).length === 0)) {
      if (selected?.assigned_units) raw = selected.assigned_units;
      else {
        try {
          const saved = localStorage.getItem(`fsuu_assigned_units_${selected?.id}`) || localStorage.getItem(`fsuu_completed_assigned_units_${selected?.id}`);
          if (saved) raw = JSON.parse(saved);
        } catch {}
      }
    }
    if (!raw) return [];

    let barcodes = [];
    if (Array.isArray(raw)) {
      barcodes = raw.filter(Boolean);
    } else if (typeof raw === "object" && raw !== null) {
      barcodes = Object.values(raw).filter(Boolean);
    } else if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) barcodes = p.filter(Boolean);
        else if (typeof p === "object" && p !== null) barcodes = Object.values(p).filter(Boolean);
        else barcodes = [raw];
      } catch {
        barcodes = [raw];
      }
    }

    const uniqueBarcodes = Array.from(new Set(barcodes.map(b => String(b).trim()).filter(b => b && b !== "—" && b !== "-")));

    return uniqueBarcodes.map(bCode => {
      const cleanUpper = bCode.toUpperCase();
      const matchedUnit = (physicalUnits || []).find(u => {
        const candidates = [
          u.barcode,
          u.serial_number,
          u.code,
          String(u.id),
          u.seq_no ? `#${String(u.seq_no).replace(/^#/, '')}` : null,
        ].filter(Boolean).map(s => String(s).trim().toUpperCase());
        return candidates.includes(cleanUpper);
      });

      const rawSeq = matchedUnit?.seq_no ?? matchedUnit?.sequence_no;
      const seqNo = rawSeq !== undefined && rawSeq !== null && String(rawSeq).trim() !== ""
        ? (String(rawSeq).trim().startsWith("#") ? String(rawSeq).trim() : `#${String(rawSeq).trim()}`)
        : null;
      const brand = matchedUnit?.brand ? String(matchedUnit.brand).trim() : "";
      const model = matchedUnit?.model ? String(matchedUnit.model).trim() : "";
      const brandModel = brand && model ? `${brand} • ${model}` : (brand || model || matchedUnit?.name || "");

      // Resolve built-in child accessories
      let builtIns = [];
      if (matchedUnit) {
        let rawList = Array.isArray(matchedUnit.built_in_units)
          ? matchedUnit.built_in_units
          : (typeof matchedUnit.built_in_units === "string" ? JSON.parse(matchedUnit.built_in_units || "[]") : []);
        if (!rawList.length) {
          const eqT = matchedUnit.equipmentType || matchedUnit.equipment_type;
          if (eqT?.built_in_units) {
            rawList = Array.isArray(eqT.built_in_units) ? eqT.built_in_units : (typeof eqT.built_in_units === "string" ? JSON.parse(eqT.built_in_units || "[]") : []);
          }
        }
        if (Array.isArray(rawList)) {
          builtIns = rawList.map(biId => {
            const m = (physicalUnits || []).find(pu => String(pu.id) === String(biId) || String(pu.barcode || '').toUpperCase() === String(biId).toUpperCase());
            return m ? (m.name || [m.brand, m.model].filter(Boolean).join(" ") || m.barcode || `Unit #${biId}`) : `Unit #${biId}`;
          });
        }
      }

      const catName = matchedUnit?.equipment_type?.eq_name
        || matchedUnit?.equipment_type?.name
        || matchedUnit?.equipmentType?.eq_name
        || matchedUnit?.category
        || "";

      let slotKey = null;
      if (assignedUnitSelections && typeof assignedUnitSelections === "object") {
        const foundEntry = Object.entries(assignedUnitSelections).find(([, v]) => String(v).trim().toUpperCase() === cleanUpper);
        if (foundEntry) slotKey = foundEntry[0];
      }

      return {
        barcode: matchedUnit?.barcode || bCode,
        serial: matchedUnit?.serial_number && matchedUnit.serial_number !== (matchedUnit?.barcode || bCode) ? matchedUnit.serial_number : null,
        seqNo,
        brandModel,
        builtIns,
        categoryName: catName,
        status: matchedUnit?.status || (isOngoing ? "released" : "reserved"),
        condition: matchedUnit?.condition || "Good",
        slotKey,
        unit: matchedUnit,
      };
    });
  }, [assignedUnitSelections, selected?.assigned_units, selected?.id, physicalUnits, isOngoing]);

  // Determine unassigned slots for requested categories
  const unassignedSlots = useMemo(() => {
    if (!requestedCategories || requestedCategories.length === 0) return [];
    const assignedBarcodesSet = new Set(assignedUnitsList.map(u => u.barcode.toUpperCase()));
    
    const slots = [];
    requestedCategories.forEach((cat, catIdx) => {
      const catName = cat.name || cat.category || cat.equipment_types_name || "Equipment";
      const qty = parseInt(cat.quantity || 1, 10) || 1;
      const typeId = cat.equipment_type_id || cat.id || null;

      for (let uIdx = 0; uIdx < qty; uIdx++) {
        const slotKey = `${catIdx}-${uIdx}`;
        const currentBarcode = assignedUnitSelections ? assignedUnitSelections[slotKey] : null;
        if (!currentBarcode || !assignedBarcodesSet.has(String(currentBarcode).trim().toUpperCase())) {
          const availableUnits = getAvailableUnitsForCategory 
            ? getAvailableUnitsForCategory(catName, typeId)
            : (physicalUnits || []).filter(pu => {
                const puCat = (pu.equipmentType?.eq_name || pu.equipment_type?.eq_name || pu.category || "").toUpperCase();
                return puCat === catName.toUpperCase() && pu.status === "available";
              });
          
          slots.push({
            slotKey,
            catIdx,
            uIdx,
            category: catName,
            typeId,
            slotNum: uIdx + 1,
            availableUnits: availableUnits.filter(u => !assignedBarcodesSet.has(String(u.barcode || u.serial_number || '').trim().toUpperCase())),
          });
        }
      }
    });
    return slots;
  }, [requestedCategories, assignedUnitsList, assignedUnitSelections, getAvailableUnitsForCategory, physicalUnits]);

  const handleQuickAssign = async (slotKey, barcode) => {
    if (!slotKey || !barcode || !selected?.id) return;
    setAssigningUnit(true);
    const nextSelections = { ...(assignedUnitSelections || {}), [slotKey]: barcode };
    if (setAssignedUnitSelections) {
      setAssignedUnitSelections(nextSelections);
    }
    try {
      localStorage.setItem(`fsuu_assigned_units_${selected.id}`, JSON.stringify(nextSelections));
      await api.put(`/avr-venue-bookings/${selected.id}/assign-units`, {
        assigned_units: nextSelections,
      });
      notify.success("Equipment Unit Assigned", `Physical unit ${barcode} assigned to venue booking.`);
      window.dispatchEvent(new Event("venue_bookings_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      if (onBookingUpdated) {
        onBookingUpdated(prev => ({
          ...prev,
          assigned_units: nextSelections,
        }));
      }
    } catch (err) {
      notify.error("Assignment Failed", err.response?.data?.message || "Failed to assign equipment unit.");
    } finally {
      setAssigningUnit(false);
    }
  };

  const handleQuickUnassign = async (slotKey, barcode) => {
    if (!selected?.id) return;
    setAssigningUnit(true);
    const nextSelections = { ...(assignedUnitSelections || {}) };
    if (slotKey) delete nextSelections[slotKey];
    Object.keys(nextSelections).forEach(k => {
      if (String(nextSelections[k]).toUpperCase() === String(barcode).toUpperCase()) {
        delete nextSelections[k];
      }
    });
    if (setAssignedUnitSelections) {
      setAssignedUnitSelections(nextSelections);
    }
    try {
      localStorage.setItem(`fsuu_assigned_units_${selected.id}`, JSON.stringify(nextSelections));
      await api.put(`/avr-venue-bookings/${selected.id}/assign-units`, {
        assigned_units: nextSelections,
      });
      notify.info("Equipment Unit Unassigned", `Removed unit assignment.`);
      window.dispatchEvent(new Event("venue_bookings_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      if (onBookingUpdated) {
        onBookingUpdated(prev => ({
          ...prev,
          assigned_units: nextSelections,
        }));
      }
    } catch (err) {
      notify.error("Update Failed", err.response?.data?.message || "Failed to update unit assignment.");
    } finally {
      setAssigningUnit(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setStaffUploadUrl(evt.target.result);
    };
    reader.readAsDataURL(file);

    if (selected.id) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("document", file);
        const res = await api.post(`/avr-venue-bookings/${selected.id}/upload-document`, formData);
        if (res.data?.url) {
          setStaffUploadUrl(res.data.url);
        }
        setSaveSuccessMsg("Endorsement letter attached and uploaded.");
        notify.success("Document Uploaded", "Endorsement letter attached and uploaded.");
      } catch {
        setSaveSuccessMsg("Document attached locally.");
        notify.info("Document Attached", "Document attached locally.");
      } finally {
        setIsUploading(false);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    }
  };

  const handleToggleHardcopy = (checked) => {
    setIsHardcopy(checked);
    if (!checked) {
      setHasHardcopySaved(false);
      try {
        if (storageKeyHardcopy) localStorage.removeItem(storageKeyHardcopy);
        if (storageKeyNotes) localStorage.removeItem(storageKeyNotes);
      } catch {}
      setHardcopyNotes("");
      setSavedIsHardcopy(false);
      setSavedHardcopyNotes("");
      notify.info("Walk-in Endorsement", "Physical hardcopy unverified.");
    }
  };

  const handleSaveHardcopy = () => {
    const trimmedNotes = hardcopyNotes.trim();
    try {
      if (storageKeyHardcopy) localStorage.setItem(storageKeyHardcopy, "true");
      if (storageKeyNotes) localStorage.setItem(storageKeyNotes, trimmedNotes);
    } catch {}
    setHasHardcopySaved(true);
    setIsHardcopy(true); // Keeps checked and intact!
    setSavedIsHardcopy(true);
    setSavedHardcopyNotes(trimmedNotes);
    setSaveSuccessMsg("Walk-in endorsement status saved.");
    notify.success("Walk-in Endorsement", "Walk-in endorsement status saved.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const allDocs = (() => {
    const list = [];
    if (staffUploadUrl) list.push({ url: staffUploadUrl, label: "Staff Upload" });
    if (Array.isArray(selected.documents) && selected.documents.length > 0) {
      selected.documents.forEach((d, idx) => {
        if (d?.file_path && !list.some(existing => existing.url === d.file_path)) {
          list.push({ url: d.file_path, label: d.document_type ? d.document_type.replace(/_/g, " ") : `Doc #${idx + 1}` });
        }
      });
    }
    if (selected.endorsement_url && !list.some(d => d.url === selected.endorsement_url)) {
      list.push({ url: selected.endorsement_url, label: "Endorsement" });
    }
    if (selected.endorsement_letter && !list.some(d => d.url === selected.endorsement_letter)) {
      list.push({ url: selected.endorsement_letter, label: "Endorsement Letter" });
    }
    if (selected.attachment && !list.some(d => d.url === selected.attachment)) {
      list.push({ url: selected.attachment, label: "Attachment" });
    }
    return list;
  })();


  const getDocumentUrl = () => {
    if (allDocs.length > 0) {
      const active = allDocs[selectedDocIndex] || allDocs[0];
      return resolveStorageUrl(active.url);
    }
    if (staffUploadUrl) return resolveStorageUrl(staffUploadUrl);
    if (selected.endorsement_url) return resolveStorageUrl(selected.endorsement_url);
    if (selected.endorsement_letter) return resolveStorageUrl(selected.endorsement_letter);
    if (selected.endorsement_letter_url) return resolveStorageUrl(selected.endorsement_letter_url);
    if (selected.endorsement_file) return resolveStorageUrl(selected.endorsement_file);
    if (selected.file_path) return resolveStorageUrl(selected.file_path);
    if (selected.attachment) return resolveStorageUrl(selected.attachment);
    return null;
  };

  const docUrl = getDocumentUrl();
  const isPdf = String(docUrl || "").toLowerCase().includes(".pdf") || String(docUrl || "").toLowerCase().includes("data:application/pdf");

  const handleOpenDocument = (url) => {
    if (!url) return;
    openFileInNewTab(url);
  };

  const handleDownloadDocument = async (url, fallbackName) => {
    if (!url) return;
    try {
      const resolved = resolveStorageUrl(url) || url;
      if (resolved.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = resolved;
        link.download = fallbackName || "endorsement_document";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      const res = await fetch(resolved);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fallbackName || resolved.split("/").pop() || "endorsement_document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      openFileInNewTab(url);
    }
  };

  const activeDoc = allDocs[selectedDocIndex] || allDocs[0] || null;
  const fileName = activeDoc?.label && activeDoc.label !== "Endorsement" && activeDoc.label !== "Attachment"
    ? `${activeDoc.label}.${isPdf ? "pdf" : "png"}`
    : (docUrl
        ? (docUrl.startsWith("data:") ? `Official_Endorsement.${isPdf ? "pdf" : "png"}` : docUrl.split("/").pop().split("?")[0])
        : "Endorsement_Letter.pdf");

  const fileExtension = fileName.includes(".") ? fileName.split(".").pop().toUpperCase() : (isPdf ? "PDF" : "IMG");

  const filerFullName = [selected.first_name, selected.middle_name, selected.last_name, selected.suffix]
    .filter(Boolean)
    .join(" ")
    .trim() || selected.filer_name || selected.name || selected.full_name || "Applicant";

  const rawClassification = selected.classification || selected.role || "student";
  const displayClassification = rawClassification.toLowerCase() === "student" ? "Student" : (rawClassification.toLowerCase().includes("fac") ? "Faculty" : "External");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column (7/12): Core Request Details */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-blue-900/50 space-y-2 text-xs">
        {isSuperAdmin && (
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reservation Details
            </span>
            <button
              type="button"
              onClick={() => handleOpenOverride("venue")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/80 text-[10.5px] font-extrabold transition-all cursor-pointer shadow-2xs"
              title="Super Admin Override: Reassign Venue, Date & Time"
            >
              <Shield size={12} className="text-amber-600 dark:text-amber-400" />
              <span>Override</span>
            </button>
          </div>
        )}

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Applicant Name :</span>
          <span className="font-bold text-slate-900 dark:text-white">{filerFullName}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Identity :</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 uppercase font-bold">{displayClassification}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80 gap-1">
          <span className="text-slate-500 dark:text-slate-400 shrink-0">Email Address :</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{selected.email_address || selected.email || "—"}</span>
            {(selected.is_email_verified ?? true) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0" title="Email address verified via OTP">
                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Contact Number :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
              {formatPhilippineNumber(selected.contact_number || selected.contact_no || selected.phone) || "—"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Department / Office :</span>
          <span className="font-bold text-slate-900 dark:text-white">{selected.program_office || selected.department || "Academic Dept"}</span>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Venue Reserved :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white font-mono">{selected.venue_name || selected.venue?.name || "AVR Hall 1"}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Date Range :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {formatDateRange(
                selected.date_of_usage || selected.start_datetime || selected.date,
                selected.reservation_end_date || selected.end_datetime || selected.end_date
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Time Range :</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-900 dark:text-white font-bold">
              {formatRealTime(selected.time_start || selected.start_datetime)} - {formatRealTime(selected.time_end || selected.end_datetime)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">Purpose :</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{selected.purpose || "Event / Meeting"}</span>
        </div>

        {/* Equipment-Needed Remarks (Optional) - Read-Only Display */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline py-1 border-b border-slate-100 dark:border-slate-800/80 gap-1">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">Equipment-Needed Remarks (Optional) :</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 break-words text-left sm:text-right max-w-sm">
            {extractEquipmentNeededRemarks(selected) || "None"}
          </span>
        </div>

        {/* Requested Equipment Types Badges */}
        {requestedCategories && requestedCategories.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500 dark:text-slate-400 block mb-1.5 font-bold">Requested Equipment Types :</span>
            <div className="flex flex-wrap gap-1.5">
              {requestedCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                >
                  {cat.name || cat.category || cat.equipment_types_name} ({cat.quantity || 1} {Number(cat.quantity || 1) === 1 ? 'unit' : 'units'})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Physical Equipment Units */}
        {requestedCategories && requestedCategories.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 font-extrabold text-xs flex items-center gap-1.5">
                <PackageCheck size={14} className="text-blue-600 dark:text-blue-400" />
                Assigned Equipment Units :
              </span>
              <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {assignedUnitsList.length} of {requestedCategories.reduce((acc, c) => acc + (parseInt(c.quantity || 1, 10) || 1), 0)} unit(s) assigned
              </span>
            </div>

            {/* List of successfully assigned physical units */}
            {assignedUnitsList.length > 0 && (
              <div className="space-y-1.5">
                {assignedUnitsList.map((au, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {au.seqNo && (
                          <span className="font-mono text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/80 shrink-0">
                            {au.seqNo}
                          </span>
                        )}
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {au.brandModel || au.categoryName || "Equipment Unit"}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/80">
                          {au.barcode}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono uppercase ${
                          isOngoing
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        }`}>
                          {isOngoing ? "Released / In-Use" : "Assigned & Reserved"}
                        </span>
                        {canAssign && (
                          <button
                            type="button"
                            onClick={() => handleQuickUnassign(au.slotKey, au.barcode)}
                            disabled={assigningUnit}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Unassign this physical unit"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {au.builtIns && au.builtIns.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Tied Accessories:</span>
                        {au.builtIns.map((biName, biIdx) => (
                          <span
                            key={biIdx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-[10px] font-semibold border border-slate-200 dark:border-slate-600"
                          >
                            <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                            <span>{biName}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Unassigned slots dropdown to easily select units in the booking form */}
            {canAssign && unassignedSlots.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 text-xs font-bold">
                  <AlertCircle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    {assignedUnitsList.length === 0
                      ? "Select physical equipment unit for this venue reservation:"
                      : "Unassigned equipment unit slot(s) remaining:"}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {unassignedSlots.map((uSlot, sIdx) => (
                    <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 min-w-[130px]">
                        {uSlot.category} (Slot #{uSlot.slotNum}):
                      </span>
                      {uSlot.availableUnits.length === 0 ? (
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic">
                          No available units currently in stock for this category.
                        </span>
                      ) : (
                        <div className="relative flex-1">
                          <select
                            onChange={(e) => handleQuickAssign(uSlot.slotKey, e.target.value)}
                            defaultValue=""
                            disabled={assigningUnit}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="" disabled>Choose physical unit ({uSlot.availableUnits.length} available)...</option>
                            {uSlot.availableUnits.map((unit) => {
                              const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
                              const rawSeq = unit.seq_no ?? unit.sequence_no;
                              const seq = rawSeq ? `#${String(rawSeq).replace(/^#/, '')} ` : '';
                              const brand = unit.brand ? `${unit.brand} ` : '';
                              const model = unit.model || unit.name || '';
                              return (
                                <option key={unit.id} value={bCode}>
                                  {seq}{brand}{model} [{bCode}]
                                </option>
                              );
                            })}
                          </select>
                          {assigningUnit && (
                            <Loader2 size={12} className="animate-spin text-amber-600 absolute right-6 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column (5/12): Endorsement Document & Walk-in Hardcopy Management */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-blue-900/50 flex flex-col justify-between space-y-3">
        <div className="space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <span className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600 dark:text-blue-400" />
              Endorsement Document :
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
              {docUrl ? (isPdf ? 'PDF Document' : 'Image File') : (hasHardcopySaved ? 'Hardcopy Filed' : 'Pending File')}
            </span>
          </div>

          {/* Multiple Document Selector Tabs */}
          {allDocs.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {allDocs.map((doc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDocIndex(idx)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer shrink-0 ${
                    selectedDocIndex === idx
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {doc.label || `Doc #${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Compact Document File Card */}
          {docUrl ? (
            <div className="rounded-xl border border-slate-200 dark:border-blue-900/50 bg-slate-50/80 dark:bg-slate-950/60 p-3 space-y-2.5 transition-all">
              <div className="flex items-start gap-3">
                {/* File Icon Badge */}
                <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
                  isPdf 
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60" 
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60"
                }`}>
                  {isPdf ? <FileText size={22} /> : <ImageIcon size={22} />}
                </div>

                {/* File Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={fileName}>
                      {fileName}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black uppercase shrink-0 ${
                      isPdf 
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300" 
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                    }`}>
                      {fileExtension}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {isPdf ? "Official PDF Endorsement Letter" : "Scanned Endorsement Image"}
                  </p>

                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                    Filed: {formatDateTimeFiled ? formatDateTimeFiled(selected.created_at) : (selected.created_at || "Recent")}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Preview / Zoom & Download */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    if (setFullImageModal) {
                      setFullImageModal({ url: docUrl, title: fileName, isPdf });
                    } else {
                      handleOpenDocument(docUrl);
                    }
                  }}
                  className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-300 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Open full-screen preview"
                >
                  <Eye size={13} />
                  <span>Preview / Zoom</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDocument(docUrl, fileName)}
                  className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Download endorsement file"
                >
                  <Download size={13} />
                  <span>Download File</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty State when no file attached */
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 text-center space-y-1">
              <FileText size={24} className="mx-auto text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Electronic Document Attached</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Verify physical hardcopy submission below or attach file.
              </p>
            </div>
          )}
        </div>

        {/* Verification Actions Card: Physical Hardcopy & Staff Upload */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-blue-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isHardcopy}
                onChange={(e) => handleToggleHardcopy(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span>Physical Hardcopy Received</span>
            </label>
            
            {/* Attach File Button */}
            {!hasHardcopySaved && (
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-200 dark:border-blue-800 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                <Upload size={12} />
                <span>{isUploading ? "Uploading..." : "Attach File"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          {isHardcopy && (
            <div className="space-y-1.5 animate-in fade-in">
              <input
                type="text"
                placeholder="Receiver note (e.g. Received signed memo by Prof. Santos)"
                value={hardcopyNotes}
                onChange={(e) => setHardcopyNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
              />
              {hasHardcopyChanges && (
                <button
                  type="button"
                  onClick={handleSaveHardcopy}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs animate-in fade-in"
                >
                  Save
                </button>
              )}
            </div>
          )}

          {saveSuccessMsg && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle size={12} /> {saveSuccessMsg}
            </p>
          )}
        </div>
      </div>

      {/* Super Admin Venue & Schedule Override Modal */}
      {isSuperAdmin && showOverrideModal && (
        <SuperAdminVenueOverrideModal
          isOpen={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          booking={selected}
          onBookingUpdated={onBookingUpdated}
          initialFocusField={overrideFocusField}
        />
      )}
    </div>
  );
}
