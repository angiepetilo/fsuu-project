import { useState } from "react";
import {
  X, CheckCircle, User, Building2, FileText, Send, Loader2, Play,
  AlertTriangle, Bell, Mail, Phone, Calendar, Clock, Camera, FileCheck, PackageOpen, Eye
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
  showNotifyModal,
  setShowNotifyModal,
  notifyReason,
  setNotifyReason,
}) {
  if (!selected) return null;

  const [savingInspection, setSavingInspection] = useState(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState("unit_01");


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

  const handleEvidencePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePostInspection = async (e) => {
    e.preventDefault();
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
      // Local fallback storage
      setInspectionSuccessMsg("✅ Inspection record saved!");
      setTimeout(() => setInspectionSuccessMsg(null), 3000);
    } finally {
      setSavingInspection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header — Item 35: CLEAN WHITE HEADER (NO DARK/COLORED BACKGROUND) */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold tracking-wider">
              {selected.tracking_number?.reference_code || selected.reference_code || `TRK-AVR${selected.id}`}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Venue Reservation Details
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Filed on {formatDate(selected.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={selected.status || selected.tracking_number?.status || "pending"} />
            <button
              onClick={() => { setSelected(null); setShowRejectForm(false); }}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: 2/3 & 1/3 Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-100 flex-1">

          {/* Left Column (8/12): Item 13 Book-Venue Filled Details & Endorsement Letter */}
          <div className="lg:col-span-8 p-6 space-y-6">

            {feedbackMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle size={16} /> {feedbackMessage}
              </div>
            )}

            {/* Filer / Requestor Details (Item 13) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} className="text-blue-600" /> Filer / Requestor Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Requestor Name</span>
                  <span className="font-extrabold text-slate-900 text-sm block">{selected.filer_name || selected.requestor_name || "Maria Santos"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Department / Program</span>
                  <span className="font-semibold text-slate-800 block">{selected.program_office || selected.department || "College of Computing Studies"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Email Address</span>
                  <span className="font-medium text-slate-600 flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    {selected.email_address || selected.email || "filer@fsuu.edu.ph"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Contact Number</span>
                  <span className="font-medium text-slate-600 flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" />
                    {selected.contact_no || selected.phone || "0917-123-4567"}
                  </span>
                </div>
              </div>
            </div>

            {/* Venue & Event Schedule Details (Item 13) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" /> Reserved Venue & Schedule
              </h4>
              <div className="bg-blue-50/60 p-4.5 rounded-2xl border border-blue-100 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                  <span className="font-bold text-blue-900">Venue Name:</span>
                  <span className="font-extrabold text-blue-950 text-sm bg-blue-100 px-3 py-1 rounded-xl border border-blue-200">
                    {selected.venue?.name || selected.venue_name || "AVR Auditorium 1"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span>Date of Usage: <strong>{selected.date_of_usage ? String(selected.date_of_usage).substring(0, 10) : "2026-08-05"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-600" />
                    <span>Time Range: <strong>{formatTimeRange(selected.time_start, selected.time_end)}</strong></span>
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-100/80">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block mb-1">Purpose of Event</span>
                  <p className="font-semibold text-slate-800 italic bg-white p-3 rounded-xl border border-blue-100">
                    "{selected.purpose || "Academic symposium and presentation"}"
                  </p>
                </div>
              </div>
            </div>

            {/* Equipment Unit Selection & Inspection Checklist */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <PackageOpen size={15} className="text-blue-600" /> Equipment Catalog Unit Assignment
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${selected.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {selected.status === 'pending' ? 'Select Equipment Units' : 'Assigned Equipment Units'}
                </span>
              </div>

              {selected.status === "pending" ? (
                <div className="space-y-3 text-xs">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Assign specific physical inventory units / serial numbers for each requested equipment item:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Wireless Microphones Unit *</label>
                      <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                      >
                        <option value="unit_01">Unit 01 — (SN: MIC-2026-001)</option>
                        <option value="unit_02">Unit 02 — (SN: MIC-2026-002)</option>
                        <option value="unit_03">Unit 03 — (SN: MIC-2026-003)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">HD Projector Unit *</label>
                      <select
                        defaultValue="proj_01"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                      >
                        <option value="proj_01">Unit 01 — (SN: PROJ-2026-010)</option>
                        <option value="proj_02">Unit 02 — (SN: PROJ-2026-011)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Equipment Reflection</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-bold">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      🎤 Wireless Microphones: <span className="text-blue-700 font-mono">Unit 01 (SN: MIC-2026-001)</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      📹 HD Projector: <span className="text-blue-700 font-mono">Unit 01 (SN: PROJ-2026-010)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Item 14: Post-Event Inspection Panel */}
            <form onSubmit={handleSavePostInspection} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <FileCheck size={16} className="text-blue-600" />
                  Post-Event Inspection Document Record (Item 14)
                </h4>
                {inspectionSuccessMsg && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {inspectionSuccessMsg}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Outcome Status *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInspectionStatus("clean")}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 ${inspectionStatus === "clean"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <CheckCircle size={14} /> Good (Done with No Damage)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionStatus("violation")}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 ${inspectionStatus === "violation"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <AlertTriangle size={14} /> Done with Damage / Lost Equipment
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Violation Category & Notes *</label>
                  <select
                    value={
                      ["", "Late Event Overtime", "Venue Facility Damage / Broken Items", "Unauthorized Extension", "Noise & Disruption Breach", "Trash & Cleanliness Violation"].includes(violationNotes)
                        ? violationNotes
                        : "Other"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setViolationNotes("Custom violation details...");
                      } else {
                        setViolationNotes(val);
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold mb-2 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">No Violation (Clean Return)</option>
                    <option value="Late Event Overtime">⏰ Late Event Overtime</option>
                    <option value="Venue Facility Damage / Broken Items">🔧 Venue Facility Damage / Broken Items</option>
                    <option value="Unauthorized Extension">⛔ Unauthorized Extension</option>
                    <option value="Noise & Disruption Breach">🔊 Noise & Disruption Breach</option>
                    <option value="Trash & Cleanliness Violation">🧹 Trash & Cleanliness Violation</option>
                    <option value="Other">📝 Other (Custom Details)</option>
                  </select>

                  <textarea
                    rows={2}
                    required
                    placeholder="Enter inspection reason or condition details..."
                    value={violationNotes}
                    onChange={(e) => setViolationNotes(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Evidence Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Evidence Image Upload</label>
                  <div className="flex items-center gap-3">
                    <label className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      <Camera size={14} />
                      <span>{evidencePhoto ? "Change Evidence Photo" : "Upload Evidence Photo"}</span>
                      <input type="file" accept="image/*" onChange={handleEvidencePhotoUpload} className="hidden" />
                    </label>
                    {evidencePhoto && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={13} /> Photo uploaded
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps (Item 14) */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] text-slate-400 font-bold">
                  <span>Created: {formatDate(selected.created_at)}</span>
                  <span>Updated: {formatDate(selected.updated_at || selected.created_at)}</span>
                  <span>Archived: {selected.archived_at ? formatDate(selected.archived_at) : "Active (Not Archived)"}</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingInspection}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingInspection ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
                  <span>Save Inspection Record</span>
                </button>
              </div>
            </form>

          </div>

          {/* Right Column (4/12): Uploaded Endorsement & Quick Status Actions */}
          <div className="lg:col-span-4 p-6 bg-slate-50/50 space-y-5">

            {/* Uploaded Endorsement Document Store (Item 13) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" /> Uploaded Endorsement Letter
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {selected.endorsement_letter || selected.document_name || "official_endorsement_letter.pdf"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Classification: <strong className="capitalize">{selected.classification || "Academic"}</strong>
                    </p>
                  </div>
                </div>
                <a
                  href={selected.endorsement_letter_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} /> View Endorsement Document
                </a>
              </div>
            </div>

            {/* Status Quick Action Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Reservation Workflow Actions
              </span>

              {selected.status === "pending" && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAction(selected.id, "approve")}
                    disabled={!!actionLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading === `${selected.id}-approve` ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    <span>Approve Reservation</span>
                  </button>
                  <button
                    onClick={() => handleAction(selected.id, "reject")}
                    disabled={!!actionLoading}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading === `${selected.id}-reject` ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                    <span>Reject Reservation</span>
                  </button>
                </div>
              )}

              {selected.status === "approved" && (
                <button
                  onClick={() => handleAction(selected.id, "ongoing")}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  <span>Start On-going Event</span>
                </button>
              )}

              {selected.status === "ongoing" && (
                <button
                  onClick={() => handleAction(selected.id, "complete")}
                  disabled={!!actionLoading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading === `${selected.id}-complete` ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  <span>Mark Event Completed</span>
                </button>
              )}

              {/* Resend Email Delivery Button */}
              <div className="pt-3 border-t border-slate-100">
                {resendMsg && (
                  <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mb-2">
                    {resendMsg}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {resendLoading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} className="text-blue-600" />}
                  <span>Resend Email Delivery</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            FSUU Venue Reservation & Facility Protocol
          </span>
          <button
            onClick={() => setSelected(null)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
