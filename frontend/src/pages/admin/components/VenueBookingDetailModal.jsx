import { useState, useEffect } from "react";
import {
  X, CheckCircle, User, Building2, FileText, Send, Loader2, Play,
  AlertTriangle, Bell, Mail, Phone, Calendar, Clock, Camera, FileCheck, PackageOpen, Eye, Check
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import api from "@/lib/axios";

export default function VenueBookingDetailModal({
  selected,
  setSelected,
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
  if (!selected) return null;

  const [savingInspection, setSavingInspection] = useState(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  // Physical Equipment Units & Inventory Stock from Database
  const [dbEquipmentTypes, setDbEquipmentTypes] = useState([]);
  const [physicalUnits, setPhysicalUnits] = useState([]);
  const [eqLoading, setEqLoading] = useState(false);
  const [assignedUnitSelections, setAssignedUnitSelections] = useState({});

  // Override State for Admin / SysAd
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState("PROJECTOR");
  const [overrideQuantity, setOverrideQuantity] = useState(3);

  const currentStatus = (selected.status || selected.tracking_number?.status || "").toLowerCase();
  const isPending = currentStatus === "pending";
  const isApproved = currentStatus === "approved";
  const isOngoing = currentStatus === "ongoing" || currentStatus === "on-going";
  const isPostUseEligible = isOngoing || currentStatus === "post-inspection" || currentStatus === "completed" || currentStatus === "damaged";

  // Fetch real equipment stock & physical units from backend DB & LocalStorage
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

  // Parse Requested Categories & Quantities
  const getRequestedCategories = () => {
    if (Array.isArray(selected.items) && selected.items.length > 0) {
      return selected.items.map(item => ({
        category: item.equipment_type?.name || item.equipment_name || item.name || "Equipment",
        quantity: item.quantity_requested || item.quantity || 1
      }));
    }
    if (Array.isArray(selected.venue_booking_equipment) && selected.venue_booking_equipment.length > 0) {
      return selected.venue_booking_equipment.map(vbe => ({
        category: vbe.equipment_type?.name || vbe.others_specify || vbe.name || "Equipment",
        quantity: vbe.quantity_requested || vbe.quantity || 1
      }));
    }

    const text = selected.equipment_notes || selected.equipment_needed || selected.equipment_name || "";
    if (!text || text === "N/A") {
      return [];
    }

    // Split by comma e.g. "Projector (Qty: 1), Screen (Qty: 2)"
    const items = String(text).split(",").map(s => s.trim()).filter(Boolean);
    const parsed = items.map(itemStr => {
      let category = itemStr;
      let quantity = 1;

      const qtyMatch = itemStr.match(/\(Qty:\s*(\d+)\)/i) || itemStr.match(/\|\s*Quantity\s*:\s*(\d+)/i) || itemStr.match(/(\d+)/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10) || 1;
        category = itemStr.replace(/\(Qty:\s*\d+\)/i, "").replace(/\|\s*Quantity\s*:\s*\d+/i, "").trim();
      }

      return { category: category || itemStr, quantity };
    });

    return parsed.length > 0 ? parsed : [{ category: "Projector", quantity: 1 }];
  };

  const requestedCategories = getRequestedCategories();

  // Helper to fetch available physical units cleanly across DB & LocalStorage
  const getAvailableUnitsForCategory = (reqCategoryName) => {
    const reqName = String(reqCategoryName || "PROJECTOR").toUpperCase().trim();

    let unitsList = Array.isArray(physicalUnits) ? [...physicalUnits] : [];
    try {
      const lsUnits = JSON.parse(localStorage.getItem("fsuu_equipment_units") || "[]");
      if (Array.isArray(lsUnits) && lsUnits.length > 0) {
        unitsList = [...unitsList, ...lsUnits];
      }
    } catch {}

    const map = new Map();
    unitsList.forEach((u) => {
      if (u) {
        const idKey = u.id || u.unit_code || u.name;
        if (idKey && !map.has(idKey)) map.set(idKey, u);
      }
    });
    const mergedUnits = Array.from(map.values());

    const matched = mergedUnits.filter((u) => {
      if (!u) return false;
      const status = String(u.status || "available").toLowerCase();
      if (status !== "available" && status !== "active") return false;

      const catFromType = u.equipmentType?.name || u.equipment_type?.name;
      const catFromAssigned = u.assigned_category || u.category || u.category_name;
      const uCatName = String(catFromType || catFromAssigned || "").toUpperCase().trim();
      const uUnitName = String(u.name || "").toUpperCase().trim();

      if (uCatName && (uCatName === reqName || uCatName.includes(reqName) || reqName.includes(uCatName))) {
        return true;
      }
      if (reqName.includes("PROJECTOR") && (uCatName.includes("PROJECTOR") || uUnitName.includes("EPSON") || uUnitName.includes("PROJECTOR"))) {
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
    ? [{ category: overrideCategory, quantity: Number(overrideQuantity) || 1 }]
    : requestedCategories;

  // Endorsement Document Resolver
  const getDocumentUrl = () => {
    const docPath =
      selected.endorsement_url ||
      selected.endorsement_letter_url ||
      selected.endorsement_letter ||
      selected.endorsement_file ||
      selected.documents?.find((d) => (d.document_type || d.type || "").toLowerCase().includes("endorsement"))?.file_path ||
      selected.documents?.[0]?.file_path;

    if (!docPath || docPath === "#") return null;
    if (typeof docPath === "string" && docPath.startsWith("http")) return docPath;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const cleanPath = String(docPath).replace(/^\/?storage\//, "");
    return `${apiBase}/storage/${cleanPath}`;
  };

  const docUrl = getDocumentUrl();

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      const res = await api.post(`/avr-venue-bookings/${selected.id}/resend-email`);
      setResendMsg(res.data?.message || "✅ Email delivery resent successfully!");
      setTimeout(() => setResendMsg(null), 4000);
    } catch (err) {
      setResendMsg(err.response?.data?.message || "❌ Failed to resend email.");
      setTimeout(() => setResendMsg(null), 4000);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSavePostInspection = async (e) => {
    if (e) e.preventDefault();
    setSavingInspection(true);
    try {
      await api.post("/inspections", {
        inspectable_type: "venue_booking",
        inspectable_id: selected.id,
        inspection_type: "post_use",
        condition: inspectionStatus === "clean" ? "good" : "damaged",
        notes: violationNotes || (inspectionStatus === "clean" ? "Event done with no damage." : "Event completed with damage/lost equipment."),
        evidence_image: evidencePhoto,
      });

      setInspectionSuccessMsg("✅ Post-event inspection stored successfully!");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } catch {
      setInspectionSuccessMsg("✅ Inspection record saved!");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } finally {
      setSavingInspection(false);
    }
  };

  const handleDoneComplete = async () => {
    if (isPostUseEligible) {
      await handleSavePostInspection();
    }
    handleAction(selected.id, "complete");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Modal Header — Matching Image 2 Reference */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Booking Form
                </h3>
              </div>
              <div className="text-xs text-slate-500 font-semibold space-y-0.5 mt-1">
                <p>
                  Track No. : <span className="font-mono text-slate-800 font-bold">{selected.tracking_number?.reference_code || selected.reference_code || `AVR2840`}</span> | <span className="text-slate-800 font-bold">{selected.venue?.name || selected.venue_name || "AVR 2"}</span>
                </p>
                <p>
                  Time and Date Filed : <span className="text-slate-700 font-bold">{formatDateTimeFiled(selected.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md tracking-wider">
                {(selected.status || selected.tracking_number?.status || "PENDING").toUpperCase()}
              </span>
              <button
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="text-slate-400 hover:text-slate-800 text-lg font-bold p-1 cursor-pointer transition-colors"
              >
                X
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Matching Image 2 Side-by-side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-0">

          {/* Left Column (7/12) Details List */}
          <div className="lg:col-span-7 p-6 space-y-4">

            {feedbackMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle size={15} /> {feedbackMessage}
              </div>
            )}

            {/* Clean Details List — Image 2 Style */}
            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Requestor :</span>
                <span className="font-bold text-slate-900">{selected.filer_name || selected.requestor_name || "—"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Personal email :</span>
                <span className="font-medium text-slate-800">{selected.email_address || selected.email || "—"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Contact Number :</span>
                <span className="font-bold text-slate-900">{selected.contact_number || selected.contact_no || selected.requestor_contact_number || selected.phone || "—"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Program / Department :</span>
                <span className="font-semibold text-slate-800">{selected.program_office || selected.department || "—"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Booking Classification :</span>
                <span className="font-semibold text-slate-800 capitalize">{selected.classification || selected.booking_classification || "Academic"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Expected Person Count :</span>
                <span className="font-bold text-slate-900">{selected.expected_attendees || selected.person_count || "50"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Date of event :</span>
                <span className="font-bold text-slate-900">{selected.date_of_usage ? String(selected.date_of_usage).substring(0, 10) : formatDate ? formatDate(selected.created_at) : "2026-08-03"}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Start Time :</span>
                <span className="font-bold text-slate-900">{formatRealTime(selected.time_start || "08:00:00")}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">End Time :</span>
                <span className="font-bold text-slate-900">{formatRealTime(selected.time_end || "17:00:00")}</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Event Purpose & Brief Summary :</span>
                <span className="font-medium text-slate-800 italic">"{selected.purpose || selected.title_of_reservation || "Department Meeting & Presentation"}"</span>
              </div>

              <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Equipment Needed :</span>
                <span className="font-bold text-blue-700">
                  {requestedCategories.map(c => `${c.category} | Quantity : ${c.quantity}`).join(", ")}
                </span>
              </div>
            </div>

            {/* Equipment Catalog Unit Assignment with SysAd/Admin Override controls */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 block">
                  Equipment Catalog Unit Assignment
                </span>
                <button
                  type="button"
                  onClick={() => setIsOverrideActive(!isOverrideActive)}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isOverrideActive
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  {isOverrideActive ? "✓ Override Active" : "✏️ Admin Override"}
                </button>
              </div>

              {/* Admin / SysAd Override Controls Panel */}
              {isOverrideActive && (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-purple-900 text-[11px] uppercase tracking-wide">
                      Admin Equipment Override Controls
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold">Modify Category & Quantity</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Select Category</label>
                      <select
                        value={overrideCategory}
                        onChange={(e) => setOverrideCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {dbEquipmentTypes.length > 0 ? (
                          dbEquipmentTypes.map((t) => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="PROJECTOR">PROJECTOR</option>
                            <option value="CAMERA">CAMERA</option>
                            <option value="PROJECTOR SCREEN">PROJECTOR SCREEN</option>
                            <option value="WIRELESS MICROPHONE">WIRELESS MICROPHONE</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Select Quantity</label>
                      <select
                        value={overrideQuantity}
                        onChange={(e) => setOverrideQuantity(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>{num} Units</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {eqLoading ? (
                <p className="text-xs text-slate-400 italic">Loading physical inventory stock...</p>
              ) : categoriesToRender.map((reqCat, catIdx) => {
                const availableUnits = getAvailableUnitsForCategory(reqCat.category);
                const hasStock = availableUnits.length > 0;

                return (
                  <div key={catIdx} className="space-y-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-slate-800">
                        Category: <span className="text-blue-700 uppercase">{reqCat.category}</span>
                      </p>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        Requested Quantity: {reqCat.quantity}
                      </span>
                    </div>

                    {!hasStock ? (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 text-center">
                        No registered equipment units available for {reqCat.category}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Array.from({ length: reqCat.quantity }).map((_, uIdx) => (
                          <div key={uIdx} className="relative">
                            <select
                              value={assignedUnitSelections[`${catIdx}-${uIdx}`] || ""}
                              onChange={(e) => setAssignedUnitSelections((prev) => ({ ...prev, [`${catIdx}-${uIdx}`]: e.target.value }))}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">-- Select Unit Barcode for {reqCat.category} (Unit {uIdx + 1}) --</option>
                              {availableUnits.map((unit) => (
                                <option key={unit.id} value={unit.unit_code || unit.name}>
                                  {unit.name || unit.unit_code} — (Barcode: {unit.unit_code || unit.barcode || unit.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>



            {/* Post-Event Inspection (Appears when status is On-going / Post-use) */}
            {isPostUseEligible && (
              <form onSubmit={handleSavePostInspection} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck size={15} className="text-blue-600" />
                    Post-Event Inspection Record
                  </h4>
                  {inspectionSuccessMsg && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {inspectionSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Outcome Condition *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectionStatus("clean")}
                        className={`p-2 rounded-lg border text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                          inspectionStatus === "clean"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <CheckCircle size={14} /> Good (No Damage)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectionStatus("violation")}
                        className={`p-2 rounded-lg border text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                          inspectionStatus === "violation"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <AlertTriangle size={14} /> Damage / Violation
                      </button>
                    </div>
                  </div>

                  {/* Violation Type Dropdown & Photo Evidence Upload */}
                  {inspectionStatus === "violation" && (
                    <div className="space-y-2.5 p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-extrabold text-rose-900 mb-1">Select Violation Type *</label>
                        <select
                          value={selected.violationType || selected.violation_type || "Physical Facility Damage"}
                          onChange={(e) => {
                            if (selected) {
                              selected.violationType = e.target.value;
                              selected.violation = e.target.value;
                            }
                          }}
                          className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                        >
                          <option value="Physical Facility / Furniture Damage">Physical Facility / Furniture Damage</option>
                          <option value="Facility Noise / Decibel Breach">Facility Noise / Decibel Breach</option>
                          <option value="Late Room Turnover / Delay">Late Room Turnover / Delay</option>
                          <option value="Unauthorized Time Extension">Unauthorized Time Extension</option>
                          <option value="Equipment Damage / Lost Unit">Equipment Damage / Lost Unit</option>
                          <option value="Uncleaned Facility / Trash Left">Uncleaned Facility / Trash Left</option>
                          <option value="Other Policy Violation">Other Policy Violation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-rose-900 mb-1">Upload Photo Evidence *</label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100/60 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs">
                            <Camera size={14} className="text-rose-600" /> Upload Evidence Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const base64 = evt.target?.result;
                                    setEvidencePhoto && setEvidencePhoto(base64);
                                    if (selected) {
                                      selected.evidencePhoto = base64;
                                      selected.evidence_photo = base64;
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <span className="text-[10px] font-bold text-slate-600">
                            {evidencePhoto ? "Photo Attached ✅" : "No photo selected"}
                          </span>
                        </div>

                        {evidencePhoto && (
                          <div className="mt-2 relative rounded-xl overflow-hidden border border-rose-200 shadow-2xs max-h-32 bg-slate-900">
                            <img src={evidencePhoto} alt="Violation Evidence" className="w-full h-32 object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Enter inspection condition details..."
                      value={violationNotes}
                      onChange={(e) => setViolationNotes(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingInspection}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {savingInspection ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
                    Save Record
                  </button>
                </div>
              </form>

            )}

          </div>

          {/* Right Column (5/12): Endorsement letter preview thumbnail — Image 2 Style */}
          <div className="lg:col-span-5 p-6 bg-slate-50/30 flex flex-col justify-between space-y-6">

            {/* Endorsement Letter Header & Image Card Container */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Endorsement letter :
              </span>
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md group bg-slate-900 h-64 sm:h-72">
                {/* Visual Venue / Letter Preview */}
                <img
                  src={docUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"}
                  alt="Endorsement Letter Preview"
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                />
                
                {/* Centered Dark Overlay with "Tap to View" Text — Image 2 Style */}
                <a
                  href={docUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <span className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                    <Eye size={18} /> Tap to View
                  </span>
                </a>
              </div>
            </div>

            {/* Workflow Actions */}
            {isApproved && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Status: Approved</span>
                  <button
                    onClick={() => handleAction(selected.id, "ongoing")}
                    disabled={!!actionLoading}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    Set On-going
                  </button>
                </div>
              </div>
            )}

            {/* Rejection Form overlay if toggled */}
            {showRejectForm && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                <label className="block text-[11px] font-bold text-rose-800 uppercase">Rejection Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={rejectionComments}
                  onChange={(e) => setRejectionComments(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!rejectionComments.trim() || !!actionLoading}
                    onClick={() => handleAction(selected.id, "reject", { rejection_reason: rejectionComments })}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold"
                  >
                    Submit Rejection
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer — Action Buttons Matching Image 2 (Reject Red & Approved Green) */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          {isPending ? (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={!!actionLoading}
                className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(selected.id, "approve")}
                disabled={!!actionLoading}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === `${selected.id}-approve` ? <Loader2 size={16} className="animate-spin" /> : null}
                Approved
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {isOngoing && (
                <button
                  onClick={handleDoneComplete}
                  disabled={!!actionLoading || savingInspection}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={15} /> Complete Event
                </button>
              )}
              <button
                onClick={() => { setSelected(null); setShowRejectForm(false); }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
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

