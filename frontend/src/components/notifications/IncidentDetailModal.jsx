import React from "react";
import { X, AlertTriangle, User, Phone, Mail, Building, Package, Calendar, FileText, CheckCircle2 } from "lucide-react";

export default function IncidentDetailModal({ incident, onClose }) {
  if (!incident) return null;

  const isDamaged = incident.incident_type === "damaged";
  const isLost = incident.incident_type === "lost";
  const isViolation = incident.incident_type === "policy_violation";

  const getHeaderInfo = () => {
    if (isDamaged) {
      return {
        badge: "DAMAGED PHYSICAL UNIT",
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertTriangle,
        iconColor: "text-rose-600",
        title: "Damaged Equipment Unit Report",
      };
    }
    if (isLost) {
      return {
        badge: "LOST PHYSICAL UNIT",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        title: "Lost Equipment Unit Incident",
      };
    }
    return {
      badge: "POLICY VIOLATION",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      icon: AlertTriangle,
      iconColor: "text-purple-600",
      title: "Policy Violation Report",
    };
  };

  const config = getHeaderInfo();
  const IconComp = config.icon;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-[1600] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <IconComp size={16} className={config.iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{config.title}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.badgeBg}`}>
                  {config.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Ref: {incident.ref || "N/A"} • {incident.office || "Main Campus"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Responsible Person Information */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Responsible Person / Borrower
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <User size={13} className="text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{incident.person_name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building size={13} className="text-slate-400 shrink-0" />
              <span>{incident.person_office || "Department N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono">{incident.person_contact || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono truncate">{incident.person_email || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Affected Item / Physical Unit Details */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isViolation ? "Facility / Equipment Involved" : "Physical Unit Details"}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <Package size={13} className="text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{incident.item_name || "Physical Item"}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-slate-400 shrink-0" />
              <span className="font-mono text-slate-600">Unit/Barcode: {incident.unit_code || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Violation / Condition Remarks */}
        <div className="space-y-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-700 block">
            {isViolation ? "Violation Description & Inspection Remarks" : "Condition & Damage Report"}
          </span>
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium text-xs leading-relaxed">
            {incident.notes || incident.message || "No additional remarks logged for this incident."}
          </div>
        </div>

        {/* Evidence Photos (if available) */}
        {(incident.evidence_photos?.length > 0 || incident.evidence_photo) && (
          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-700 block">Evidence Photos</span>
            {Array.isArray(incident.evidence_photos) && incident.evidence_photos.length > 1 ? (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                {incident.evidence_photos.map((ph, idx) => (
                  <img
                    key={idx}
                    src={ph}
                    alt={`Evidence ${idx + 1}`}
                    onClick={() => window.open(ph, "_blank")}
                    className="w-full aspect-square object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                  />
                ))}
              </div>
            ) : (
              <img
                src={Array.isArray(incident.evidence_photos) ? incident.evidence_photos[0] : incident.evidence_photo}
                alt="Incident Evidence"
                onClick={() => window.open(Array.isArray(incident.evidence_photos) ? incident.evidence_photos[0] : incident.evidence_photo, "_blank")}
                className="w-full max-h-48 object-contain bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:opacity-90"
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 font-medium">
            Reported: {incident.time}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
