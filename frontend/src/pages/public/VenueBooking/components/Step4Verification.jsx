import { UploadCloud, X, FileText, Image, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import api from "@/lib/axios";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";

export default function Step4Verification({
  filerName,
  email,
  contactNumber,
  selectedVenue,
  selectedDate,
  selectedEndDate,
  timeStart,
  timeEnd,
  purpose,
  agreedToPolicy,
  setAgreedToPolicy,
  isSubmitting,
  handleVerifySubmit,
  endorsementFile,
  setEndorsementFile,
  avrEquipment = [],
  equipmentCatalog = [],
  onBack,
}) {
  const fileInputRef = useRef(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateType, setTemplateType] = useState("organization");

  const [contactPhone, setContactPhone] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_system_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.contact_phone) return parsed.contact_phone;
      }
    } catch {}
    return "(085) 342-1830";
  });

  useEffect(() => {
    api.get("/public/system-settings")
      .then((res) => {
        if (res.data?.contact_phone) {
          setContactPhone(res.data.contact_phone);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, PNG, or JPG files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10 MB.");
      return;
    }
    setEndorsementFile(file);
  };

  const handleDropZoneClick = () => fileInputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (fileInputRef.current) fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setEndorsementFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isPdf = endorsementFile && endorsementFile.type === "application/pdf";

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Side-by-Side Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* ── Left Column: Booking Requirements ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              1. Booking Requirements
            </h3>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
              title="View and copy approved endorsement letter format"
            >
              <FileText size={12} />
              <span>View Letter Format</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Attach your signed endorsement letter or authorization document below:
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              endorsementFile
                ? "border-emerald-500 bg-emerald-50/60"
                : "border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/40"
            }`}
          >
            {!endorsementFile ? (
              <div className="space-y-2">
                <UploadCloud size={40} className="mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-800">Click or drag &amp; drop file here</p>
                <p className="text-[11px] text-slate-400">Supports PDF, PNG, JPG (Max 10MB)</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-left">
                  {isPdf ? <FileText size={32} className="text-rose-500 shrink-0" /> : <Image size={32} className="text-blue-500 shrink-0" />}
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{endorsementFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(endorsementFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Reservation Review & Policy Agreement ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            2. Reservation Review
          </h3>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Filer Name</span>
              <span className="font-bold text-slate-900">{filerName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Account Email</span>
              <span className="font-bold text-slate-900">{email || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Contact No.</span>
              <span className="font-bold text-slate-900">{contactNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Venue Reserved</span>
              <span className="font-bold text-blue-700 font-mono">{selectedVenue?.name || "Facility"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Schedule</span>
              <span className="font-bold text-slate-900">
                {selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                {selectedEndDate && String(selectedEndDate).substring(0,10) !== String(selectedDate).substring(0,10) && (
                  ` - ${new Date(selectedEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                )}
                {" "}({formatTime12(timeStart)} - {formatTime12(timeEnd)})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Purpose</span>
              <span className="font-bold text-slate-900 max-w-[200px] text-right truncate">{purpose || "—"}</span>
            </div>

            {/* Equipment Category & Requested Physical Units */}
            {avrEquipment && avrEquipment.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">Requested Equipment</span>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {avrEquipment.map((eq, idx) => {
                    const catItem = (equipmentCatalog || []).find(c => c.id === eq.equipment_type_id || c.equipment_type_id === eq.equipment_type_id || c.id === eq.id);
                    const name = eq.name || catItem?.name || eq.equipment_name || `Equipment Item #${idx + 1}`;
                    const qty = eq.quantity || eq.qty || eq.quantity_requested || 1;
                    return (
                      <div key={eq.equipment_type_id || idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{name}</span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                          {qty} {qty === 1 ? 'physical unit' : 'physical units'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Terms Agreement Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="space-y-1.5 text-[11px] text-slate-600 font-medium leading-relaxed">
              <p className="font-extrabold text-slate-800 text-xs">By confirming, the user agrees to:</p>
              <ul className="space-y-1.5 pl-0.5 list-none">
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>Ensure that all decorations &amp; materials adhere to venue policy and safety regulations.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>Held liable for any physical units used.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>Users granted a grace period 15 - 20 mins past their scheduled booking time; if they don't arrive within that time and doesn't have a valid excuse their booking is automatically cancelled.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>Have the AVR personnel inspect all materials prior to entry and may deny access to any items considered unsafe.</span>
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 pt-2 border-t border-slate-100 cursor-pointer hover:bg-slate-50 -mx-1 px-1 py-1 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onChange={(e) => setAgreedToPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-900 font-bold leading-relaxed">
                I have read and agree to all venue policies and safety regulations.
              </span>
            </label>
          </div>

          {/* Action Buttons: Back and Submit */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onBack && onBack()}
              className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 rounded-xl text-xs font-bold"
            >
              ← Back to Details
            </Button>
            <Button
              onClick={handleVerifySubmit}
              disabled={isSubmitting || !agreedToPolicy}
              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md disabled:opacity-60 transition-all"
            >
              {isSubmitting ? "Submitting..." : "Submit Reservation Request"}
            </Button>
          </div>

          {/* Note Footer */}
          <p className="text-[11px] text-slate-400 font-medium text-center">
            Note: Should there be any problem please contact <span className="font-bold text-slate-600">{contactPhone}</span>.
          </p>
        </div>

      </div>

      {/* Official Endorsement Letter Template Preview Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        initialType={templateType}
      />
    </div>
  );
}
