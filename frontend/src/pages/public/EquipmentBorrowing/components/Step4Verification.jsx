import { UploadCloud, X, FileText, Image, CheckCircle2, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import api from "@/lib/axios";

export default function Step4Verification({
  email,
  contactNumber,
  otp, setOtp,
  isOtpSent, setIsOtpSent,
  isSubmitting, handleVerifySubmit,
  endorsementFile, setEndorsementFile,
  onBack,
}) {
  const [verificationMethod, setVerificationMethod] = useState("email");
  const [otpSending, setOtpSending]   = useState(false);
  const [otpError, setOtpError]       = useState("");
  const [otpSuccess, setOtpSuccess]   = useState("");
  const fileInputRef = useRef(null);

  // ── File Upload ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) { alert("Only PDF, PNG, or JPG files are allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10 MB."); return; }
    setEndorsementFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setEndorsementFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── OTP ──────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const recipient = verificationMethod === "email" ? email : contactNumber;
    if (!recipient) {
      setOtpError(`No ${verificationMethod === "email" ? "email" : "phone number"} provided. Complete Step 3 first.`);
      return;
    }
    if (verificationMethod === "phone") {
      setOtpError("SMS is not configured yet. Please use Email verification.");
      return;
    }
    setOtpSending(true); setOtpError(""); setOtpSuccess("");
    try {
      await api.post("/public/send-otp", { email: recipient });
      setIsOtpSent(true);
      setOtpSuccess(`Verification code sent to ${recipient}. Check your inbox.`);
    } catch (err) {
      setOtpError(err.response?.data?.message ?? "Failed to send code. Please try again.");
    } finally { setOtpSending(false); }
  };

  const isPdf   = endorsementFile?.type === "application/pdf";

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* 1. Borrower ID / Endorsement */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">1. Borrower ID / Endorsement</h3>
          <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} className="hidden" />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all group ${
              endorsementFile ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 bg-slate-50/60 hover:border-blue-500 hover:bg-blue-50/50"
            }`}
          >
            {!endorsementFile ? (
              <>
                <UploadCloud size={40} className="mx-auto text-slate-400 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">Upload FSUU ID or Adviser Endorsement</p>
                <p className="text-xs text-slate-400">PDF, PNG, JPG up to 10 MB — click or drag &amp; drop</p>
              </>
            ) : (
              <div className="flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  {isPdf ? <FileText size={32} className="text-red-500 shrink-0" /> : <Image size={32} className="text-blue-500 shrink-0" />}
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">{endorsementFile.name}</p>
                    <p className="text-xs text-slate-400">{(endorsementFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <button type="button" onClick={removeFile} className="p-1 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Security Verification */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">2. Security Verification</h3>
          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5">
            <div className="flex gap-2 mb-4 bg-slate-200/50 p-1 rounded-xl">
              <button type="button" onClick={() => { setVerificationMethod("email"); setOtpError(""); setOtpSuccess(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg transition-all ${verificationMethod === "email" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                <Mail size={12} /> Email
              </button>
              <button type="button" onClick={() => { setVerificationMethod("phone"); setOtpError(""); setOtpSuccess(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg transition-all ${verificationMethod === "phone" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                <Phone size={12} /> SMS / Phone
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              A 6-digit verification code will be sent to your{" "}
              <strong className="text-slate-700">
                {verificationMethod === "email" ? (email || "email (not provided)") : (contactNumber || "phone (not provided)")}
              </strong>.
            </p>

            {otpError && <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 mb-3 font-medium">{otpError}</div>}
            {otpSuccess && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-700 mb-3 font-medium">✅ {otpSuccess}</div>}

            <Button onClick={handleSendOtp} type="button" variant="outline" disabled={otpSending}
              className="w-full border-blue-200 text-blue-700 bg-white hover:bg-blue-50 mb-3 text-xs font-bold py-2.5">
              {otpSending ? <><Loader2 size={12} className="animate-spin mr-1.5" />Sending…</> : isOtpSent ? "Resend Verification Code" : "Send Verification Code"}
            </Button>

            <input
              type="text" inputMode="numeric" maxLength={6}
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit verification code"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-center tracking-widest focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs"
        >
          ← Back to Details
        </Button>

        <Button onClick={handleVerifySubmit} disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-xl font-extrabold text-xs shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100">
          {isSubmitting ? "Submitting…" : "Submit Borrowing Request"}
        </Button>
      </div>
    </div>
  );
}
