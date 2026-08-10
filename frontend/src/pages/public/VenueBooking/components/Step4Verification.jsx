import { UploadCloud, X, FileText, Image, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import api from "@/lib/axios";

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
  onBack,
}) {
  const fileInputRef = useRef(null);

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

  const [reqList, setReqList] = useState([]);

  useEffect(() => {
    api.get("/booking-requirements")
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setReqList(res.data);
        }
      })
      .catch(() => {});
  }, []);

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

        {/* ── Left Column: Required Documents Checklist & Upload ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            1. Booking Requirements Checklist & Upload
          </h3>
          
          {/* Individual Requirement Cards (Distinct, non-merged checklist) */}
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Required Clearances & Endorsements:</p>
            {reqList.length > 0 ? (
              reqList.map((req, idx) => (
                <div key={req.id || idx} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                      {req.label}
                    </span>
                    <span className="text-[9.5px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60 uppercase">
                      {req.classification || 'Required'}
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-[11px] text-slate-500 font-medium leading-tight pl-5">{req.description}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-600 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span>Signed Endorsement Letter (DSA or VP Acad Clearance)</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 font-semibold leading-relaxed pt-1">
            Attach your signed endorsement letter or supporting clearance document below:
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

        {/* ── Right Column: Verification Summary & Policy Agreement ── */}
        <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            2. Reservation Verification
          </h3>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Filer Name</span>
              <span className="font-bold text-slate-900">{filerName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Email / Contact</span>
              <span className="font-semibold text-slate-800">{email} | {contactNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Venue</span>
              <span className="font-bold text-blue-600">{selectedVenue?.name || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold">Schedule</span>
              <span className="font-semibold text-slate-800">
                {selectedDate}{selectedEndDate && selectedEndDate !== selectedDate ? ` to ${selectedEndDate}` : ""} ({formatTime12(timeStart)} - {formatTime12(timeEnd)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Purpose</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">{purpose || "—"}</span>
            </div>
          </div>

          {/* Policy Agreement Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={e => setAgreedToPolicy(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600 font-medium leading-relaxed">
              I agree to abide by the Father Saturnino Urios University venue reservation policies, facility usage rules, and safety guidelines.
            </span>
          </label>

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
        </div>

      </div>
    </div>
  );
}
