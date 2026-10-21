import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, AlertCircle, AlertTriangle, User, Phone, Mail, 
  Building2, Package, Tag, FileText, Calendar, 
  ExternalLink, Clock, MapPin 
} from "lucide-react";

export default function IncidentDetailModal({ incident, onClose }) {
  const navigate = useNavigate();
  if (!incident) return null;

  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/sysad") ? "/sysad" : "/general";

  const isDamaged = incident.incident_type === "damaged";
  const isLost = incident.incident_type === "lost";
  const isViolation = incident.incident_type === "policy_violation";

  const ref = (incident.ref || "").trim();
  const recordId = incident.record_id ?? incident.booking_id ?? incident.borrowing_id ?? incident.equipment_borrowing_id ?? incident.equipment_borrow_id ?? incident.venue_booking_id ?? (incident.target_type !== "damaged_unit" && incident.target_type !== "lost_unit" ? incident.target_id : null) ?? null;
  const isEquipmentRef = ref.startsWith("EQ-") || ref.startsWith("TRK-EB") || incident.target_type === "equipment" || incident.target_type === "equipment_borrow" || incident.record_type === "equipment_borrow";
  const barcode = (incident.barcode || incident.unit_code || "").trim();
  const hasBarcode = Boolean(barcode && barcode !== "N/A");
  const canLocateUnit = (isDamaged || isLost) && hasBarcode;

  const getHeaderInfo = () => {
    if (isDamaged) {
      return {
        badge: "Damaged Physical Unit",
        badgeStyle: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/60",
        icon: AlertCircle,
        iconStyle: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40",
        title: "Damaged Equipment Unit Report",
      };
    }
    if (isLost) {
      return {
        badge: "Lost Physical Unit",
        badgeStyle: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/60",
        icon: AlertTriangle,
        iconStyle: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
        title: "Lost Equipment Incident Report",
      };
    }
    if (isViolation) {
      return {
        badge: isEquipmentRef ? "Equipment Policy Violation" : "Venue Policy Violation",
        badgeStyle: "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200/80 dark:border-violet-900/60",
        icon: AlertTriangle,
        iconStyle: "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40",
        title: isEquipmentRef ? "Equipment Policy Violation Report" : "Venue Policy Violation Report",
      };
    }
    return {
      badge: isEquipmentRef ? "Equipment Inspection Notice" : "Venue Inspection Notice",
      badgeStyle: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      icon: Clock,
      iconStyle: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
      title: isEquipmentRef ? "Equipment Return Notice" : "Venue Post-Inspection Notice",
    };
  };

  const config = getHeaderInfo();
  const IconComp = config.icon;

  const photos = Array.isArray(incident.evidence_photos)
    ? incident.evidence_photos
    : incident.evidence_photo
    ? [incident.evidence_photo]
    : [];

  let targetUrl = `${basePath}/reports?tab=incidents`;
  let actionLabel = "View in Reports";

  if (isEquipmentRef) {
    targetUrl = `${basePath}/equipment-borrowing?id=${recordId || ""}&trk=${encodeURIComponent(ref)}`;
    actionLabel = "View Borrowing Record";
  } else if (ref.startsWith("VB-") || ref.startsWith("TRK-AVR") || ref.startsWith("TRK-") || incident.target_type === "venue_booking" || incident.record_type === "venue_booking") {
    targetUrl = `${basePath}/venue-bookings?id=${recordId || ""}&trk=${encodeURIComponent(ref)}`;
    actionLabel = "View Venue Booking";
  } else if (canLocateUnit) {
    targetUrl = `${basePath}/manage-equipments?search=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`;
    actionLabel = "Locate Unit in Inventory";
  }

  const handleLocateUnit = () => {
    if (onClose) onClose();
    navigate(`${basePath}/manage-equipments?search=${encodeURIComponent(barcode)}&barcode=${encodeURIComponent(barcode)}`, {
      state: {
        search: barcode,
        highlightBarcode: barcode,
        selectedId: recordId,
        targetType: incident.target_type,
      },
    });
  };

  const handleViewRecord = () => {
    if (onClose) onClose();
    navigate(targetUrl, {
      state: {
        selectedId: recordId,
        targetType: incident.target_type,
        trk: ref,
        search: barcode || ref,
        highlightBarcode: canLocateUnit ? barcode : null,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[1600] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${config.iconStyle}`}>
                <IconComp size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{config.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeStyle}`}>
                    {config.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Ref: <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{incident.ref || "N/A"}</span>
                  {incident.office && <span className="text-slate-400 dark:text-slate-500"> • {incident.office}</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Responsible Person / Borrower */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Responsible Person / Borrower
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{incident.person_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{incident.person_office || "Department N/A"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate">{incident.person_contact || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate" title={incident.person_email}>
                  {incident.person_email || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Unit / Item Details */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isViolation ? (isEquipmentRef ? "Equipment Item Involved" : "Facility Involved") : "Physical Unit Details"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Package size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white truncate">
                  {incident.barcode || incident.unit_code || incident.item_name || "Equipment Unit"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Tag size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Barcode: <span className="font-mono font-black text-slate-900 dark:text-white">{incident.barcode || incident.unit_code || "N/A"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Condition & Damage / Violation Report */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {isViolation ? "Violation & Remarks" : "Condition & Damage Report"}
            </span>
            <div className={`p-4 rounded-r-2xl rounded-l-xs border-l-4 flex items-start gap-3 shadow-2xs ${
              isDamaged 
                ? "bg-rose-50/70 dark:bg-rose-950/40 border-l-rose-500 border-y border-r border-rose-200/60 dark:border-rose-900/50" 
                : isLost 
                ? "bg-amber-50/70 dark:bg-amber-950/40 border-l-amber-500 border-y border-r border-amber-200/60 dark:border-amber-900/50" 
                : "bg-violet-50/70 dark:bg-violet-950/40 border-l-violet-500 border-y border-r border-violet-200/60 dark:border-violet-900/50"
            }`}>
              <AlertCircle size={18} className={`shrink-0 mt-0.5 ${
                isDamaged 
                  ? "text-rose-500 dark:text-rose-400" 
                  : isLost 
                  ? "text-amber-500 dark:text-amber-400" 
                  : "text-violet-500 dark:text-violet-400"
              }`} />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                {incident.notes || incident.message || "Returned with damaged equipment."}
              </p>
            </div>
          </div>

          {/* Evidence Photos (if any) */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Evidence Photos ({photos.length})
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {photos.map((ph, idx) => (
                  <img
                    key={idx}
                    src={ph}
                    alt={`Evidence ${idx + 1}`}
                    onClick={() => window.open(ph, "_blank")}
                    className="w-full aspect-square object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            <Clock size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span>Reported: {incident.time || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>
            {canLocateUnit && (
              <button
                type="button"
                onClick={handleLocateUnit}
                className="whitespace-nowrap px-3.5 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Locate and highlight this physical unit in equipment inventory"
              >
                <MapPin size={13} className="shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Locate Unit</span>
                <ExternalLink size={12} className="shrink-0 text-blue-600 dark:text-blue-400" />
              </button>
            )}
            <button
              type="button"
              onClick={handleViewRecord}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>{actionLabel}</span>
              <ExternalLink size={13} className="shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
