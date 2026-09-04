import { FileText, CheckCircle2, FileCheck, ShieldAlert, Check, ShieldCheck, AlertCircle, RefreshCw, KeyRound, Loader2, Edit3, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { formatDateRange } from "@/lib/dateUtils";
import api from "@/lib/axios";
import { validatePhilippineMobile } from "@/lib/phoneValidation";

export default function Step3Details({
  selectedVenue,
  selectedDate,
  selectedEndDate,
  handleDetailsSubmit,
  firstName, setFirstName,
  middleName, setMiddleName,
  lastName, setLastName,
  suffix, setSuffix,
  fullName, setFullName,
  email, setEmail,
  contactNumber, handleContactChange,
  department, setDepartment,
  identity,
  classification, setClassification,
  persons, setPersons,
  startTime, setStartTime,
  endTime, setEndTime,
  purpose, setPurpose,
  avrEquipment, setAvrEquipment,
  equipmentRemarks, setEquipmentRemarks,
  isEmailVerified = false,
  setIsEmailVerified,
  onBack,
}) {
  const [requirements, setRequirements] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);

  useEffect(() => {
    api.get("/public/booking-requirements")
      .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        setRequirements([]);
      });

    const fetchDepts = async () => {
      try {
        const res = await api.get("/public/departments");
        let data = Array.isArray(res.data) ? res.data : [];
        setDepartmentsList(data);
      } catch {
        setDepartmentsList([]);
      }
    };

    const fetchEquipment = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedDate) params.append("date", selectedDate);
        if (startTime) params.append("time_start", startTime);
        if (endTime) params.append("time_end", endTime);
        const res = await api.get(`/public/equipment-types?${params.toString()}`);
        let data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setEquipmentCatalog(data);
        if (data.length > 0) {
          try {
            localStorage.setItem("fsuu_equipment_types", JSON.stringify(data));
          } catch {}
        }
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem("fsuu_equipment_types") || "[]");
          setEquipmentCatalog(saved);
        } catch {
          setEquipmentCatalog([]);
        }
      }
    };

    fetchDepts();
    fetchEquipment();
    window.addEventListener("departments_updated", fetchDepts);
    window.addEventListener("equipment_inventory_updated", fetchEquipment);
    return () => {
      window.removeEventListener("departments_updated", fetchDepts);
      window.removeEventListener("equipment_inventory_updated", fetchEquipment);
    };
  }, [selectedVenue, selectedDate, startTime, endTime]);

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const isExternal = (identity || "").toLowerCase() === "external";

  // Email Domain Check & Inline OTP States
  const [emailCheckStatus, setEmailCheckStatus] = useState("idle"); // idle | checking | valid | invalid
  const [emailCheckMessage, setEmailCheckMessage] = useState("");
  const [lastCheckedEmail, setLastCheckedEmail] = useState("");
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [duplicateRef, setDuplicateRef] = useState(null);

  // OTP Cooldown & Expiration Timers
  useEffect(() => {
    let interval = null;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  useEffect(() => {
    let interval = null;
    if (otpExpiresIn > 0 && isOtpRequested && !isEmailVerified) {
      interval = setInterval(() => {
        setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiresIn, isOtpRequested, isEmailVerified]);

  const handleEmailBlur = async () => {
    const trimmed = (email || "").trim().toLowerCase();
    if (!trimmed) {
      setEmailCheckStatus("idle");
      setEmailCheckMessage("");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailCheckStatus("invalid");
      setEmailCheckMessage("Please enter a valid email address.");
      return;
    }
    if (trimmed === lastCheckedEmail && emailCheckStatus !== "idle") {
      return;
    }

    setEmailCheckStatus("checking");
    setEmailCheckMessage("Checking email domain deliverability...");
    try {
      const res = await api.post("/public/verify-email-active", { email: trimmed });
      if (res.data?.valid) {
        setEmailCheckStatus("valid");
        setEmailCheckMessage(res.data.message || `Email domain is active and deliverable.`);
        setLastCheckedEmail(trimmed);
      } else {
        setEmailCheckStatus("invalid");
        setEmailCheckMessage(res.data?.message || "This email domain doesn't appear able to receive mail.");
      }
    } catch (err) {
      setEmailCheckStatus("invalid");
      setEmailCheckMessage(
        err.response?.data?.message || "The email domain could not be verified. Disposable or temporary email addresses are not accepted."
      );
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (isEmailVerified && setIsEmailVerified) {
      setIsEmailVerified(false);
    }
    if (isOtpRequested) {
      setIsOtpRequested(false);
      setOtpCode("");
      setOtpError("");
      setOtpSuccess("");
    }
    setDuplicateRef(null);
    setOtpError("");
    setEmailCheckStatus("idle");
    setEmailCheckMessage("");
  };

  const handleRequestOtp = async () => {
    const trimmed = (email || "").trim().toLowerCase();
    if (!trimmed || emailCheckStatus !== "valid") return;

    setIsSendingOtp(true);
    setOtpError("");
    setOtpSuccess("");
    setDuplicateRef(null);
    try {
      const res = await api.post("/public/send-otp", {
        email: trimmed,
        venue_id: selectedVenue?.id,
        date_of_usage: selectedDate,
        reservation_end_date: selectedEndDate || selectedDate,
        time_start: startTime,
        time_end: endTime,
        first_name: firstName,
        last_name: lastName,
      });
      setIsOtpRequested(true);
      setOtpCooldown(60);
      setOtpExpiresIn(600);
      setOtpSuccess(res.data?.message || "6-digit verification code sent to your inbox.");
    } catch (err) {
      if (err.response?.data?.duplicate) {
        setDuplicateRef(err.response.data.reference_code || null);
      } else {
        setDuplicateRef(null);
      }
      setOtpError(err.response?.data?.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedCode = (otpCode || "").trim();
    if (trimmedCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await api.post("/public/verify-otp", { email: trimmedEmail, code: trimmedCode });
      if (res.data?.verified) {
        if (setIsEmailVerified) setIsEmailVerified(true);
        setIsOtpRequested(false);
        setOtpSuccess("Email verified successfully!");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect or expired verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300 space-y-6">
      {/* Context Banner indicating which form is active */}
      <div className="p-4 sm:p-5 rounded-2xl border flex items-center justify-between bg-blue-50/90 border-blue-200 text-blue-950 shadow-2xs">
        <div>
          <h4 className="font-black text-sm tracking-tight text-slate-900">Booking Form</h4>
          <p className="text-xs text-blue-900 font-semibold mt-0.5">
            Target Venue: <span className="font-extrabold text-blue-700">{selectedVenue?.name}</span> | Date: <span className="font-extrabold text-blue-700">{formatDateRange(selectedDate, selectedEndDate)}</span> ({formatTime12(startTime)} - {formatTime12(endTime)})
          </p>
        </div>
      </div>

      {/* DYNAMIC FORM RENDERING */}
      <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* COMMON REQUIRED FIELDS: Structured Name Inputs (Last Name First) */}
        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900">Last Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required 
              value={lastName} 
              onChange={e => {
                const val = e.target.value;
                setLastName(val);
                if (setFullName) {
                  const given = [firstName, middleName].filter(Boolean).join(" ");
                  setFullName(val ? (given ? `${val}, ${given}${suffix ? ` ${suffix}` : ''}` : val) : [given, suffix].filter(Boolean).join(" "));
                }
              }} 
              placeholder="e.g. Dela Cruz" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900">First Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required 
              value={firstName} 
              onChange={e => {
                const val = e.target.value;
                setFirstName(val);
                if (setFullName) {
                  const given = [val, middleName].filter(Boolean).join(" ");
                  setFullName(lastName ? (given ? `${lastName}, ${given}${suffix ? ` ${suffix}` : ''}` : lastName) : [given, suffix].filter(Boolean).join(" "));
                }
              }} 
              placeholder="e.g. Juan" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900">Middle Name <span className="text-slate-400 font-normal">(Optional)</span></label>
            <input 
              type="text" 
              value={middleName} 
              onChange={e => {
                const val = e.target.value;
                setMiddleName(val);
                if (setFullName) {
                  const given = [firstName, val].filter(Boolean).join(" ");
                  setFullName(lastName ? (given ? `${lastName}, ${given}${suffix ? ` ${suffix}` : ''}` : lastName) : [given, suffix].filter(Boolean).join(" "));
                }
              }} 
              placeholder="e.g. Santos" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900">Suffix <span className="text-slate-400 font-normal">(Optional)</span></label>
            <input 
              type="text" 
              value={suffix} 
              onChange={e => {
                const val = e.target.value;
                setSuffix(val);
                if (setFullName) {
                  const given = [firstName, middleName].filter(Boolean).join(" ");
                  setFullName(lastName ? (given ? `${lastName}, ${given}${val ? ` ${val}` : ''}` : lastName) : [given, val].filter(Boolean).join(" "));
                }
              }} 
              placeholder="e.g. Jr., III" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>
        </div>

        {/* EMAIL FIELD WITH INLINE DOMAIN CHECK & ATTACHED OTP VERIFY BUTTON */}
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              Personal Email <span className="text-red-500">*</span>
            </label>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Check size={12} className="stroke-[3]" />
                Verified
              </span>
            ) : emailCheckStatus === "valid" ? (
              <span className="text-[10.5px] font-bold text-blue-600 flex items-center gap-1">
                <Check size={12} />
                Domain Active
              </span>
            ) : null}
          </div>

          <div className="relative flex items-center">
            <input 
              type="email" 
              required 
              readOnly={isEmailVerified}
              value={email} 
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="example@gmail.com" 
              className={`w-full p-3 pr-24 border rounded-xl text-sm transition-all focus:outline-none ${
                isEmailVerified 
                  ? "bg-emerald-50/40 border-emerald-300 text-slate-800 font-semibold cursor-not-allowed" 
                  : emailCheckStatus === "invalid"
                    ? "bg-white border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-slate-900"
                    : emailCheckStatus === "valid"
                      ? "bg-white border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
                      : "bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
              }`} 
            />

            {/* Attached Action Button inside field */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {isEmailVerified ? (
                <button
                  type="button"
                  onClick={() => {
                    if (setIsEmailVerified) setIsEmailVerified(false);
                    setEmailCheckStatus("idle");
                    setEmailCheckMessage("");
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Unlock and change email address"
                >
                  <Edit3 size={11} />
                  Change
                </button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={emailCheckStatus !== "valid" || isSendingOtp}
                  onClick={handleRequestOtp}
                  className={`h-8 px-3 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer ${
                    emailCheckStatus === "valid"
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isSendingOtp ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Sending...
                    </span>
                  ) : isOtpRequested ? (
                    "Resend"
                  ) : (
                    "Verify"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Part 1 Inline Domain Feedback */}
          {!isEmailVerified && (
            <div className="min-h-[18px]">
              {emailCheckStatus === "checking" && (
                <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 animate-pulse">
                  <Loader2 size={11} className="animate-spin shrink-0" />
                  <span>Checking email deliverability...</span>
                </p>
              )}
              {emailCheckStatus === "valid" && !isOtpRequested && (
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{emailCheckMessage || "Email domain is deliverable. Click 'Verify' to receive OTP code."}</span>
                </p>
              )}
              {emailCheckStatus === "invalid" && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-start gap-1">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>{emailCheckMessage}</span>
                </p>
              )}
              {emailCheckStatus === "idle" && !email && (
                <p className="text-[10.5px] text-slate-400">
                  Enter your email address and click outside the box to run domain check.
                </p>
              )}
            </div>
          )}

          {/* Duplicate / OTP Error Alert Banner */}
          {otpError && !isOtpRequested && (
            <div className="mt-2.5 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs font-bold text-rose-800 flex items-start gap-2.5 shadow-sm animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="leading-snug">{otpError}</p>
                {duplicateRef && (
                  <a
                    href={`/track?ref=${encodeURIComponent(duplicateRef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-extrabold text-xs underline mt-1"
                  >
                    <span>Track existing reservation ({duplicateRef})</span>
                    <span>→</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Part 2 Inline OTP Card (Rendered directly under field, NOT in a modal) */}
          {isOtpRequested && !isEmailVerified && (
            <div className="mt-2 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600" />
                  <span>Enter 6-Digit Email OTP</span>
                </label>
                {otpExpiresIn > 0 ? (
                  <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    ⏱ Expires in {formatTimer(otpExpiresIn)}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    Code Expired
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="flex-1 p-2.5 bg-white border border-blue-300 rounded-xl text-center text-base font-mono font-black tracking-widest text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
                <Button
                  type="button"
                  disabled={otpCode.length !== 6 || isVerifyingOtp || otpExpiresIn <= 0}
                  onClick={handleVerifyOtp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Confirm Code"
                  )}
                </Button>
              </div>

              {/* Status / Error & Resend Link */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="flex-1 min-w-0">
                  {otpError && (
                    <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate">{otpError}</span>
                    </span>
                  )}
                  {otpSuccess && !otpError && (
                    <span className="text-[11px] font-medium text-blue-800 truncate block">
                      {otpSuccess}
                    </span>
                  )}
                </div>

                <div className="shrink-0 pl-2">
                  {otpCooldown > 0 ? (
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Resend in {otpCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp}
                      className="text-[11px] font-extrabold text-blue-700 hover:text-blue-800 underline cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTACT NUMBER FIELD (NON-OTP GATED, FORMAT VALIDATION ONLY) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              Contact Number <span className="text-red-500">*</span>
            </label>
            {(() => {
              const info = validatePhilippineMobile(contactNumber);
              if (info.isValid && info.telco) {
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {info.telco}
                  </span>
                );
              }
              if (contactNumber && contactNumber.length >= 4 && !info.isValid) {
                return (
                  <span className="text-[10px] font-semibold text-amber-600">
                    {info.message}
                  </span>
                );
              }
              return null;
            })()}
          </div>
          <input 
            type="tel" 
            required 
            value={contactNumber}
            onChange={handleContactChange}
            pattern="[0-9]{11}"
            title="Please enter an active 11-digit Philippine mobile number"
            placeholder="0917 123 4567" 
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
          />
          <p className="text-[10.5px] text-slate-400">
            Booking notifications and reminders will be sent via SMS and Email to this contact.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">
            {isExternal ? "Office / Organization" : "Department"} <span className="text-red-500">*</span>
          </label>
          {isExternal ? (
            <input
              type="text"
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. DepEd / LGU Butuan / Partner Company"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold"
            />
          ) : (
            <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold">
              <option value="">Select Department...</option>
              {(() => {
                const defaultDepts = [
                  { code: "CITE", name: "College of Information Tech Education (CITE)" },
                  { code: "CAS",  name: "College of Arts & Sciences (CAS)" },
                  { code: "CBA",  name: "College of Business Admin (CBA)" },
                  { code: "CED",  name: "College of Education (CED)" },
                  { code: "CON",  name: "College of Nursing (CON)" },
                  { code: "CEA",  name: "College of Engineering & Architecture (CEA)" },
                  { code: "SHS",  name: "Senior High School (SHS)" },
                  { code: "JHS",  name: "Junior High School (JHS)" },
                  { code: "ADMIN", name: "University Administration" },
                ];
                const listToRender = departmentsList.length > 0
                  ? departmentsList.filter(d => (d.code || d.name || "").toLowerCase() !== "external")
                  : defaultDepts;
                return listToRender.map((dept, idx) => {
                  const code = dept.code || dept.name;
                  const label = dept.name ? (dept.code && !dept.name.includes(dept.code) ? `${dept.code} - ${dept.name}` : dept.name) : code;
                  return (
                    <option key={`dept-${dept.id || code}-${idx}`} value={code}>
                      {label}
                    </option>
                  );
                });
              })()}
            </select>
          )}
        </div>

        {/* FORM SPECIFIC FIELDS: AVR FORM (FORM A) */}
        {selectedVenue?.type === "avr" && (
          <>
            <div className="flex flex-col gap-1.5 sm:col-span-2 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
              <label className="text-xs font-bold text-slate-900">Booking Classification <span className="text-red-500">*</span></label>
              <select required value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600">
                <option value="">Select Classification...</option>
                <option value="organization">Student Organization Event</option>
                <option value="academic">Academic Class</option>
                <option value="admin">Administrative Meeting</option>
              </select>

              {/* Endorsement Letter Notice Based on Booking Classification */}
              {classification && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 animate-in fade-in">
                  {classification === "organization" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Director of OISAA</strong>.</span>
                  )}
                  {classification === "academic" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>OVPASA</strong>.</span>
                  )}
                  {classification === "admin" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Office / Department Head</strong>.</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-900">
                Expected Person Count <span className="text-red-500">*</span>
                {selectedVenue?.capacity && (
                  <span className="text-slate-500 font-normal ml-1">(Max capacity: {selectedVenue.capacity})</span>
                )}
              </label>
              <input 
                type="number" 
                required 
                min="1"
                max={selectedVenue?.capacity || ""}
                value={persons} 
                onChange={e => {
                  let val = e.target.value;
                  const maxCap = selectedVenue?.capacity;
                  if (val && maxCap && parseInt(val, 10) > maxCap) {
                    val = maxCap.toString();
                  }
                  setPersons(val);
                }} 
                placeholder={`e.g. ${Math.min(75, selectedVenue?.capacity || 75)}`} 
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Event Purpose & Brief Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="State event title, nature of activity, and specific requirements..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Allowed Venue Equipment <span className="text-slate-500 font-semibold text-[11px]">(Optional)</span>
                </label>
              </div>

              {/* Informative Notice Banner for Venue Requisitions */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <b>Event Setup Priority:</b> Requested equipment is secured upon booking approval and prepared inside the venue by AVR staff on your event date.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs pt-1">
                {(() => {
                  let baseCatalog = [];
                  
                  const rawAllowed = selectedVenue?.allowed_equipment;
                  let allowedList = [];
                  if (Array.isArray(rawAllowed)) {
                    allowedList = rawAllowed;
                  } else if (typeof rawAllowed === "string") {
                    try { allowedList = JSON.parse(rawAllowed); } catch { allowedList = []; }
                  }

                  if (Array.isArray(allowedList) && allowedList.length > 0) {
                    baseCatalog = equipmentCatalog.filter(e => {
                      const eIdStr = String(e.id);
                      const eNameLower = String(e.name || e.eq_name || "").trim().toLowerCase();
                      return allowedList.some(a => {
                        const aStr = String(a).trim();
                        return aStr === eIdStr || (eNameLower && aStr.toLowerCase() === eNameLower) || (Number(a) > 0 && Number(a) === Number(e.id));
                      });
                    });
                  } else {
                    baseCatalog = [];
                  }

                  if (!baseCatalog || baseCatalog.length === 0) {
                    return <div className="col-span-full text-slate-500 italic text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">No equipment configured or available for this venue.</div>;
                  }

                  const catalogToRender = baseCatalog.map(e => ({
                    id: e.id || e.eq_name || e.name,
                    name: e.eq_name || e.name || e.category,
                    available_count: e.available_count ?? e.available_quantity,
                    total_quantity: e.total_quantity
                  }));

                  return catalogToRender.map((item, idx) => {
                    const key = String(item.id || item.name || idx);
                    const val = avrEquipment[key] || avrEquipment[item.name];

                    // Determine real registered stock
                    let realStock = 0;
                    if (typeof item.available_count === "number") {
                      realStock = item.available_count;
                    } else if (typeof item.total_quantity === "number") {
                      realStock = item.total_quantity;
                    } else {
                      realStock = 0;
                    }

                    // Check if venue has a specific Max Needed Qty configured for this equipment category
                    const venueQtys = selectedVenue?.equipment_max_qtys || {};
                    let venueCap = venueQtys[item.id] ?? venueQtys[String(item.id)] ?? venueQtys[item.name] ?? venueQtys[String(item.name || '').toLowerCase()];
                    if (typeof venueCap === "string") venueCap = Number(venueCap);

                    const effectiveMax = typeof venueCap === "number" && venueCap > 0
                      ? Math.min(venueCap, realStock)
                      : realStock;

                    const isOutOfStock = effectiveMax <= 0 || realStock <= 0;
                    const isChecked = Boolean(val) && !isOutOfStock;
                    const qty = isOutOfStock ? 0 : Math.min(typeof val === "number" ? val : 1, Math.max(1, effectiveMax));

                    return (
                      <div
                        key={`eq-cat-${item.id || key}-${idx}`}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                          isOutOfStock
                            ? "bg-slate-100/70 border-slate-200 opacity-60"
                            : isChecked
                              ? "bg-blue-50/70 border-blue-300 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <label className={`flex items-center gap-2 font-semibold flex-1 min-w-0 ${isOutOfStock ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-800"}`}>
                          <input
                            type="checkbox"
                            disabled={isOutOfStock}
                            checked={isChecked}
                            onChange={(e) => {
                              if (isOutOfStock) return;
                              const checked = e.target.checked;
                              setAvrEquipment({
                                ...avrEquipment,
                                [key]: checked ? 1 : false
                              });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-bold">{item.name}</span>
                            {!isOutOfStock && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Max {effectiveMax} unit{effectiveMax === 1 ? "" : "s"} allowed
                              </span>
                            )}
                          </div>
                        </label>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                            Out of Stock
                          </span>
                        ) : isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-extrabold text-blue-600">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              max={effectiveMax}
                              value={qty}
                              onChange={(e) => {
                                const inputVal = parseInt(e.target.value) || 1;
                                const newQty = Math.min(Math.max(1, inputVal), effectiveMax);
                                setAvrEquipment({ ...avrEquipment, [key]: newQty });
                              }}
                              className="w-11 py-0.5 px-1 bg-white border border-blue-300 rounded-lg text-xs font-black text-center text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Optional Equipment Needed Remarks */}
            <div className="sm:col-span-2 space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                Equipment-Needed Remarks <span className="text-slate-500 font-semibold text-[11px]">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={equipmentRemarks || ""}
                onChange={(e) => setEquipmentRemarks && setEquipmentRemarks(e.target.value)}
                placeholder="Explain why you require more units than the venue's allowed limit (e.g., expected high attendee count, workshop breakout activities, extra speakers)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                Note: If your event requires more units than the venue's default limit, provide your justification here for AVR administrator review and special allocation.
              </p>
            </div>
          </>
        )}

        <div className="sm:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack && onBack()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs"
          >
            ← Back to Venue Selection
          </Button>

          <div className="flex items-center gap-3">
            {!isEmailVerified && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hidden sm:inline-flex items-center gap-1.5">
                <AlertCircle size={13} />
                Email OTP verification required to proceed
              </span>
            )}
            <Button 
              type="submit" 
              disabled={!isEmailVerified}
              className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${
                isEmailVerified 
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
              }`}
            >
              Next: Review →
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
