import React from "react";
import { X, AlertCircle, AlertTriangle, User, Phone, Mail, Building2, Package, Tag, FileText, Calendar } from "lucide-react";

export default function IncidentDetailModal({ incident, onClose }) {
  if (!incident) return null;

  const isDamaged = incident.incident_type === "damaged";
  const isLost = incident.incident_type === "lost";
  const isViolation = incident.incident_type === "policy_violation";

  const getHeaderInfo = () => {
    if (isDamaged) {
      return {
        badge: "Damaged Physical Unit",
        badgeStyle: "bg-rose-50 text-rose-700 border-rose-200/80",
        icon: AlertCircle,
        iconStyle: "bg-rose-50 text-rose-600 border border-rose-100",
        title: "Damaged Equipment Unit Report",
      };
    }
    if (isLost) {
      return {
        badge: "Lost Physical Unit",
        badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80",
        icon: AlertTriangle,
        iconStyle: "bg-amber-50 text-amber-600 border border-amber-100",
        title: "Lost Equipment Incident Report",
      };
    }
    return {
      badge: "Policy Violation",
      badgeStyle: "bg-violet-50 text-violet-700 border-violet-200/80",
      icon: AlertTriangle,
      iconStyle: "bg-violet-50 text-violet-600 border border-violet-100",
      title: "Venue Policy Violation Report",
    };
  };

  const config = getHeaderInfo();
  const IconComp = config.icon;

  const photos = Array.isArray(incident.evidence_photos)
    ? incident.evidence_photos
    : incident.evidence_photo
    ? [incident.evidence_photo]
    : [];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[1600] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.iconStyle}`}>
                <IconComp size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-sm">{config.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeStyle}`}>
                    {config.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ref: <span className="font-mono text-slate-700 font-semibold">{incident.ref || "N/A"}</span>
                  {incident.office && <span className="text-slate-400"> • {incident.office}</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Responsible Person / Borrower */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Responsible Person / Borrower
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{incident.person_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-600 truncate">{incident.person_office || "Department N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono text-slate-600 truncate">{incident.person_contact || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono text-slate-600 truncate" title={incident.person_email}>
                  {incident.person_email || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Unit / Item Details */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isViolation ? "Facility / Item Involved" : "Physical Unit Details"}
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Package size={13} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{incident.item_name || "Equipment Unit"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono text-slate-700 truncate">
                  Barcode: <span className="font-semibold">{incident.unit_code || "N/A"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Condition & Damage / Violation Report */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isViolation ? "Violation & Remarks" : "Condition & Damage Report"}
            </span>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
              {incident.notes || incident.message || "No additional remarks logged for this incident."}
            </div>
          </div>

          {/* Evidence Photos (if any) */}
          {photos.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Evidence Photos ({photos.length})
              </span>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((ph, idx) => (
                  <img
                    key={idx}
                    src={ph}
                    alt={`Evidence ${idx + 1}`}
                    onClick={() => window.open(ph, "_blank")}
                    className="w-full aspect-square object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Reported: {incident.time || "N/A"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
