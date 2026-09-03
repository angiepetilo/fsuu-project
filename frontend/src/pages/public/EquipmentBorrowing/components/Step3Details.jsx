import { useState, useEffect } from "react";
import { Sparkles, PackageOpen, CheckCircle2, AlertCircle, Loader2, KeyRound, Check, Edit3, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { validatePhilippineMobile } from "@/lib/phoneValidation";

export default function Step3Details({
  identity,
  primaryDept,
  selectedItems,
  handleDetailsSubmit,
  firstName, setFirstName,
  middleName, setMiddleName,
  lastName, setLastName,
  suffix, setSuffix,
  fullName, setFullName,
  email, setEmail,
  contactNumber, handleContactChange,
  startTime, setStartTime,
  department, setDepartment,
  endTime, setEndTime,
  placeOfUse, setPlaceOfUse,
  handlerName, setHandlerName,
  purpose, setPurpose,
  notificationChannel = "email", setNotificationChannel,
  campusBranch = "FSUU Main (AVR Center)", setCampusBranch,
  isPhoneVerified = false,
  setIsPhoneVerified,
  onBack,
}) {
  const [departmentsList, setDepartmentsList] = useState([]);

  // Non-blocking Email Domain Check States
  const [emailCheckStatus, setEmailCheckStatus] = useState("idle"); // idle | checking | valid | invalid
  const [emailCheckMessage, setEmailCheckMessage] = useState("");
  const [lastCheckedEmail, setLastCheckedEmail] = useState("");

  // Phone SMS OTP States (Hard-Gated for Equipment Borrowing)
  const [isOtpRequested, setIsOtpRequested] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get("/public/departments");
        let data = Array.isArray(res.data) ? res.data : [];
        setDepartmentsList(data);
      } catch {
        setDepartmentsList([]);
      }
    };

    fetchDepts();
    window.addEventListener("departments_updated", fetchDepts);
    return () => {
      window.removeEventListener("departments_updated", fetchDepts);
    };
  }, []);

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
    if (otpExpiresIn > 0 && isOtpRequested && !isPhoneVerified) {
      interval = setInterval(() => {
        setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiresIn, isOtpRequested, isPhoneVerified]);

  // Non-blocking Email Check Handler
  const handleEmailBlur = async () => {
    const trimmed = (email || "").trim().toLowerCase();
    if (!trimmed) {
      setEmailCheckStatus("idle");
      setEmailCheckMessage("");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailCheckStatus("invalid");
      setEmailCheckMessage("Please enter a valid email format.");
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
        setEmailCheckMessage(res.data.message || "Email domain is active and deliverable.");
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

  // Phone Input & Verification Handlers
  const phoneInfo = validatePhilippineMobile(contactNumber);

  const handlePhoneInputChange = (e) => {
    handleContactChange(e);
    if (isPhoneVerified && setIsPhoneVerified) {
      setIsPhoneVerified(false);
    }
    if (isOtpRequested) {
      setIsOtpRequested(false);
      setOtpCode("");
      setOtpError("");
      setOtpSuccess("");
    }
  };

  const handleRequestPhoneOtp = async () => {
    if (!phoneInfo.isValid) return;

    setIsSendingOtp(true);
    setOtpError("");
    setOtpSuccess("");
    try {
      const res = await api.post("/public/send-phone-otp", { phone_number: contactNumber });
      setIsOtpRequested(true);
      setOtpCooldown(60);
      setOtpExpiresIn(600);
      setOtpSuccess(res.data?.message || "Verification code sent via SMS to your mobile number.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to send verification SMS. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const trimmedCode = (otpCode || "").trim();
    if (trimmedCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await api.post("/public/verify-phone-otp", {
        phone_number: contactNumber,
        code: trimmedCode,
      });
      if (res.data?.verified) {
        if (setIsPhoneVerified) setIsPhoneVerified(true);
        setIsOtpRequested(false);
        setOtpSuccess("Phone number verified successfully!");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect or expired SMS verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatScheduleDisplay = (startStr, endStr) => {
    if (!startStr) return "Scheduled Slot";
    const [dStart, tStart] = (startStr || "").replace("T", " ").split(" ");
    const [dEnd, tEnd] = (endStr || "").replace("T", " ").split(" ");

    const formatT = (t, fallback = "08:00") => {
      const timeVal = t || fallback;
      const [h, m] = timeVal.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = (h % 12) || 12;
      return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
    };

    const timeStartFmt = formatT(tStart, "08:00");
    const timeEndFmt = formatT(tEnd, "17:00");

    if (dStart === dEnd || !dEnd) {
      return `${dStart} (${timeStartFmt} - ${timeEndFmt})`;
    }
    return `${dStart} (${timeStartFmt}) to ${dEnd} (${timeEndFmt})`;
  };

  const isExternal = (identity || "").toLowerCase() === "external";

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner matching Venue Booking header */}
      <div className="p-4 sm:p-5 rounded-2xl mb-6 border flex items-center justify-between bg-blue-50/90 border-blue-200 text-blue-950 shadow-2xs">
        <div>
          <h4 className="font-black text-sm tracking-tight text-slate-900">Borrowing Form</h4>
          <p className="text-xs text-blue-900 font-semibold mt-0.5">
            Total Selected: <span className="font-extrabold text-blue-700">{selectedItems.length} Equipment Unit{selectedItems.length > 1 ? 's' : ''}</span> | Schedule: <span className="font-extrabold text-blue-700">{formatScheduleDisplay(startTime, endTime)}</span>
          </p>
        </div>
      </div>

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
              placeholder="Dela Cruz" 
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
              placeholder="Juan" 
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
              placeholder="Santos" 
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
              placeholder="Jr., III" 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>
        </div>

        {/* EMAIL FIELD: LIGHTWEIGHT NON-BLOCKING DOMAIN CHECK ONLY (NO VERIFY BUTTON, NO OTP GATING) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">Personal Email <span className="text-red-500">*</span></label>
            {emailCheckStatus === "valid" ? (
              <span className="text-[10.5px] font-bold text-blue-600 flex items-center gap-1">
                <Check size={12} />
                Domain Active
              </span>
            ) : null}
          </div>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => {
              setEmail(e.target.value);
              setEmailCheckStatus("idle");
              setEmailCheckMessage("");
            }} 
            onBlur={handleEmailBlur}
            placeholder="example@gmail.com" 
            className={`w-full p-3 border rounded-xl text-sm transition-all focus:outline-none ${
              emailCheckStatus === "invalid"
                ? "bg-white border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-slate-900"
                : emailCheckStatus === "valid"
                  ? "bg-white border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
                  : "bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
            }`}
          />
          {/* Inline Domain Feedback matching Venue Booking */}
          <div className="min-h-[16px]">
            {emailCheckStatus === "checking" && (
              <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1 animate-pulse">
                <Loader2 size={11} className="animate-spin shrink-0" />
                <span>Checking email deliverability...</span>
              </p>
            )}
            {emailCheckStatus === "valid" && (
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} className="shrink-0" />
                <span>{emailCheckMessage || "Email domain is deliverable."}</span>
              </p>
            )}
            {emailCheckStatus === "invalid" && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-start gap-1">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{emailCheckMessage}</span>
              </p>
            )}
            {emailCheckStatus === "idle" && (
              <p className="text-[10.5px] text-slate-400">
                Booking updates will be sent via SMS and Email to this contact.
              </p>
            )}
          </div>
        </div>

        {/* PHONE NUMBER FIELD: HARD-GATED WITH SMS OTP & ATTACHED VERIFY BUTTON */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-900">
                Contact Phone Number <span className="text-red-500">*</span>
              </label>
              {phoneInfo.isValid && phoneInfo.telco && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {phoneInfo.telco}
                </span>
              )}
            </div>

            {isPhoneVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Check size={12} className="stroke-[3]" />
                Verified
              </span>
            ) : contactNumber && contactNumber.length >= 4 && !phoneInfo.isValid ? (
              <span className="text-[10px] font-semibold text-amber-600">
                {phoneInfo.message}
              </span>
            ) : null}
          </div>

          <div className="relative flex items-center">
            <input 
              type="tel" 
              required 
              readOnly={isPhoneVerified}
              value={contactNumber}
              onChange={handlePhoneInputChange}
              pattern="[0-9]{11}"
              title="Please enter an active 11-digit Philippine mobile number"
              placeholder="0917 123 4567" 
              className={`w-full p-3 pr-24 border rounded-xl text-sm font-mono transition-all focus:outline-none ${
                isPhoneVerified 
                  ? "bg-emerald-50/40 border-emerald-300 text-slate-800 font-semibold cursor-not-allowed" 
                  : !phoneInfo.isValid && contactNumber.length >= 4
                    ? "bg-white border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-900"
                    : phoneInfo.isValid
                      ? "bg-white border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
                      : "bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
              }`} 
            />

            {/* Attached Action Button inside field */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {isPhoneVerified ? (
                <button
                  type="button"
                  onClick={() => {
                    if (setIsPhoneVerified) setIsPhoneVerified(false);
                    setIsOtpRequested(false);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Unlock and change contact number"
                >
                  <Edit3 size={11} />
                  Change
                </button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={!phoneInfo.isValid || isSendingOtp}
                  onClick={handleRequestPhoneOtp}
                  className={`h-8 px-3 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer ${
                    phoneInfo.isValid
                      ? primaryDept === "sco"
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
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

          {/* Inline SMS OTP Card (Rendered directly under phone field, NOT in a modal) */}
          {isOtpRequested && !isPhoneVerified && (
            <div className="mt-2 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600" />
                  <span>Enter 6-Digit SMS OTP</span>
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
                  onClick={handleVerifyPhoneOtp}
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
                      onClick={handleRequestPhoneOtp}
                      disabled={isSendingOtp}
                      className="text-[11px] font-extrabold text-blue-700 hover:text-blue-800 underline cursor-pointer"
                    >
                      Resend SMS OTP
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-900">Location / Venue of Equipment Use <span className="text-red-500">*</span></label>
          <input type="text" required value={placeOfUse} onChange={e => setPlaceOfUse(e.target.value)} placeholder="e.g. Main Gymnasium / AVR 1" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        {primaryDept === "sco" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-900">Designated Technical Operator / Handler <span className="text-red-500">*</span></label>
            <input type="text" required value={handlerName} onChange={e => setHandlerName(e.target.value)} placeholder="Name of trained technical student/staff operating the camera or mixer..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600" />
          </div>
        )}

        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Detailed Purpose of Usage <span className="text-red-500">*</span></label>
          <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Describe event activity, project name, or class requirement..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
        </div>

        <div className="sm:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack && onBack()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs"
          >
            ← Back to Equipment Selection
          </Button>

          <div className="flex items-center gap-3">
            {!isPhoneVerified && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hidden sm:inline-flex items-center gap-1.5">
                <AlertCircle size={13} />
                SMS OTP verification required to proceed
              </span>
            )}
            <Button 
              type="submit" 
              disabled={!isPhoneVerified}
              className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${
                !isPhoneVerified
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  : primaryDept === "sco"
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 cursor-pointer'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer'
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
