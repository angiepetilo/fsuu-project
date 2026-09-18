import { useState, useEffect } from "react";
import { Sparkles, PackageOpen, CheckCircle2, AlertCircle, Loader2, KeyRound, Check, Edit3, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { validatePhilippineMobile } from "@/lib/phoneValidation";

export default function Step3Details({
  identity,
  primaryDept,
  selectedItems = [],
  catalog = [],
  itemQuantities = {},
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
  isEmailVerified = false,
  setIsEmailVerified,
  pinRules,
  onBack,
}) {
  const isSystemEnabled = pinRules ? pinRules.isEnabled !== false : false;
  const requireEmailVerify = pinRules ? (pinRules.isEnabled !== false && pinRules.equipmentVerifyEmail === true) : false;
  const requirePhoneVerify = pinRules ? (pinRules.isEnabled !== false && pinRules.equipmentVerifyPhone === true) : false;
  const requireVerification = requireEmailVerify || requirePhoneVerify;

  const [departmentsList, setDepartmentsList] = useState([]);

  // Non-blocking Email Domain Check States
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
    if (otpExpiresIn > 0 && isOtpRequested && !isEmailVerified) {
      interval = setInterval(() => {
        setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiresIn, isOtpRequested, isEmailVerified]);

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

  const [otpChannel, setOtpChannel] = useState("email"); // "email" | "sms"

  const handleRequestOtp = async (overrideChannel = null) => {
    const channel = overrideChannel || otpChannel;
    setIsSendingOtp(true);
    setOtpError("");
    setOtpSuccess("");
    setDuplicateRef(null);

    try {
      let payload = {
        channel,
        reservation_type: "equipment",
        borrow_date: startTime ? startTime.split("T")[0] : null,
      };

      if (channel === "sms") {
        const cleanPhone = (contactNumber || "").replace(/\D/g, "");
        if (!cleanPhone || !phoneInfo.isValid) {
          setOtpError("Please enter a valid 11-digit Philippine mobile number first.");
          setIsSendingOtp(false);
          return;
        }
        payload.phone_number = contactNumber;
      } else {
        const trimmed = (email || "").trim().toLowerCase();
        if (!trimmed || emailCheckStatus !== "valid") {
          setOtpError("Please enter an active email address and complete domain check.");
          setIsSendingOtp(false);
          return;
        }
        payload.email = trimmed;
      }

      const res = await api.post("/public/send-otp", payload);
      setIsOtpRequested(true);
      setOtpCooldown(60);
      setOtpExpiresIn(600);
      setOtpSuccess(res.data?.message || (channel === "sms" ? "6-digit verification code sent to your mobile phone via SMS." : "6-digit verification code sent to your inbox."));
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
    const trimmedCode = (otpCode || "").trim();
    if (trimmedCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const payload = {
        channel: otpChannel,
        code: trimmedCode,
      };
      if (otpChannel === "sms") {
        payload.phone_number = contactNumber;
      } else {
        payload.email = (email || "").trim().toLowerCase();
      }

      const res = await api.post("/public/verify-otp", payload);
      if (res.data?.verified) {
        if (setIsEmailVerified) setIsEmailVerified(true);
        setIsOtpRequested(false);
        setOtpSuccess(otpChannel === "sms" ? "Mobile number verified successfully via SMS!" : "Email verified successfully!");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect or expired verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Phone Input & Verification Handlers
  const phoneInfo = validatePhilippineMobile(contactNumber);

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

  // Compute category information for selected equipment items
  const selectedCategoryItems = (selectedItems || []).map((id) => {
    const item = (catalog || []).find((c) => String(c.id) === String(id));
    const name = item?.name || item?.eq_name || item?.category || `Equipment #${id}`;
    const qty = itemQuantities[id] || 1;
    const rawBuilt = (Array.isArray(item?.built_in_names) && item.built_in_names.length > 0)
      ? item.built_in_names
      : (Array.isArray(item?.built_in_units) ? item.built_in_units : (typeof item?.built_in_units === 'string' ? JSON.parse(item.built_in_units || '[]') : []));
    const builtInList = Array.isArray(rawBuilt) ? rawBuilt : [];
    return {
      id,
      name,
      qty,
      rawBuiltIns: builtInList,
    };
  });

  // e.g. "Projector" or "Projector (2)" or "Projector, Camera"
  const selectedCategoryNames = selectedCategoryItems.length > 0
    ? selectedCategoryItems.map((c) => c.qty > 1 ? `${c.name} (${c.qty})` : c.name).join(", ")
    : "None";

  // Resolve built-in units names from catalog
  const builtInNamesSet = new Set();
  selectedCategoryItems.forEach((c) => {
    c.rawBuiltIns.forEach((raw) => {
      if (typeof raw === 'string' && isNaN(Number(raw))) {
        builtInNamesSet.add(raw.trim());
        return;
      }
      const match = (catalog || []).find(
        (cat) => String(cat.id) === String(raw) ||
                 (cat.name || cat.eq_name || "").toLowerCase() === String(raw).toLowerCase()
      );
      if (match) {
        builtInNamesSet.add(match.name || match.eq_name);
      } else if (raw && isNaN(Number(raw))) {
        builtInNamesSet.add(String(raw));
      }
    });
  });
  const builtInNamesList = Array.from(builtInNamesSet);

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner matching Venue Booking header */}
      <div className="p-4 sm:p-5 rounded-2xl mb-6 border bg-blue-50/90 border-blue-200 text-blue-950 shadow-2xs">
        <div>
          <h4 className="font-black text-sm tracking-tight text-slate-900">Borrowing Form</h4>
          <div className="text-xs text-blue-900 font-semibold mt-0.5 space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Total Selected: <span className="font-extrabold text-blue-700">{selectedCategoryNames}</span></span>
              <span className="text-blue-300">|</span>
              <span>Schedule: <span className="font-extrabold text-blue-700">{formatScheduleDisplay(startTime, endTime)}</span></span>
            </p>
            {builtInNamesList.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-blue-200/60">
                <span className="text-slate-700 font-extrabold text-xs">Built-in:</span>
                {builtInNamesList.map((bName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100/90 text-blue-900 text-[11px] font-bold border border-blue-300/80 shadow-2xs"
                  >
                    {bName}
                  </span>
                ))}
              </div>
            )}
          </div>
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

        {/* VERIFICATION CHANNEL TOGGLE (EMAIL VS SMS) */}
        {requireVerification && (
          <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
                <KeyRound size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">Verification Delivery Method</h4>
                <p className="text-[11px] text-slate-500 font-medium">Choose whether to receive your 6-digit verification code via Email or SMS</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-white/90 border border-blue-200/60 rounded-xl shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                disabled={isEmailVerified}
                onClick={() => {
                  if (otpChannel !== "email") {
                    setOtpChannel("email");
                    setIsOtpRequested(false);
                    setOtpCode("");
                    setOtpError("");
                    setOtpSuccess("");
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  otpChannel === "email"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                } ${isEmailVerified ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Mail size={13} />
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                disabled={isEmailVerified}
                onClick={() => {
                  if (otpChannel !== "sms") {
                    setOtpChannel("sms");
                    setIsOtpRequested(false);
                    setOtpCode("");
                    setOtpError("");
                    setOtpSuccess("");
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  otpChannel === "sms"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                } ${isEmailVerified ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Phone size={13} />
                <span>SMS OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* EMAIL FIELD WITH INLINE DOMAIN CHECK & ATTACHED OTP VERIFY BUTTON */}
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              Personal Email <span className="text-red-500">*</span>
            </label>
            {isEmailVerified && otpChannel === "email" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Check size={12} className="stroke-[3]" />
                Verified via Email
              </span>
            ) : isEmailVerified ? (
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
              readOnly={requireVerification && isEmailVerified && otpChannel === "email"}
              value={email} 
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="example@gmail.com" 
              className={`w-full p-3 ${requireVerification && otpChannel === "email" ? 'pr-24' : ''} border rounded-xl text-sm transition-all focus:outline-none ${
                (requireVerification && isEmailVerified && otpChannel === "email")
                  ? "bg-emerald-50/40 border-emerald-300 text-slate-800 font-semibold cursor-not-allowed" 
                  : emailCheckStatus === "invalid"
                    ? "bg-white border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-slate-900"
                    : emailCheckStatus === "valid"
                      ? "bg-white border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
                      : "bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
              }`} 
            />

            {/* Attached Action Button inside field (Only when channel is email) */}
            {requireVerification && otpChannel === "email" && (
              <div className="absolute right-1.5 flex items-center gap-1">
                {isEmailVerified ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (setIsEmailVerified) setIsEmailVerified(false);
                      setIsOtpRequested(false);
                      setOtpCode("");
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
                    onClick={() => handleRequestOtp("email")}
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
            )}
          </div>

          {/* Inline Domain Feedback */}
          {requireVerification && otpChannel === "email" && !isEmailVerified && (
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
          {requireVerification && otpChannel === "email" && otpError && !isOtpRequested && (
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

          {/* Inline Email OTP Card */}
          {requireVerification && otpChannel === "email" && isOtpRequested && !isEmailVerified && (
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
                      onClick={() => handleRequestOtp("email")}
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

        {/* CONTACT NUMBER FIELD WITH OPTIONAL SMS OTP VERIFICATION */}
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {isEmailVerified && otpChannel === "sms" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Check size={12} className="stroke-[3]" />
                  Verified via SMS
                </span>
              ) : phoneInfo.isValid && phoneInfo.telco ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {phoneInfo.telco}
                </span>
              ) : contactNumber && contactNumber.length >= 4 && !phoneInfo.isValid ? (
                <span className="text-[10px] font-semibold text-amber-600">
                  {phoneInfo.message}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative flex items-center">
            <input 
              type="tel" 
              required 
              readOnly={requireVerification && isEmailVerified && otpChannel === "sms"}
              value={contactNumber}
              onChange={handleContactChange}
              pattern="[0-9]{11}"
              title="Please enter an active 11-digit Philippine mobile number"
              placeholder="0917 123 4567" 
              className={`w-full p-3 ${requireVerification && otpChannel === "sms" ? 'pr-24' : ''} border rounded-xl text-sm font-mono transition-all focus:outline-none ${
                (requireVerification && isEmailVerified && otpChannel === "sms")
                  ? "bg-emerald-50/40 border-emerald-300 text-slate-800 font-semibold cursor-not-allowed"
                  : "bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900"
              }`} 
            />

            {/* Attached Action Button for SMS verification */}
            {requireVerification && otpChannel === "sms" && (
              <div className="absolute right-1.5 flex items-center gap-1">
                {isEmailVerified ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (setIsEmailVerified) setIsEmailVerified(false);
                      setIsOtpRequested(false);
                      setOtpCode("");
                      setOtpError("");
                      setOtpSuccess("");
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Unlock and change mobile number"
                  >
                    <Edit3 size={11} />
                    Change
                  </button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={!phoneInfo.isValid || isSendingOtp}
                    onClick={() => handleRequestOtp("sms")}
                    className={`h-8 px-3 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer ${
                      phoneInfo.isValid
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
                      "Verify SMS"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* SMS Duplicate / Error Banner */}
          {requireVerification && otpChannel === "sms" && otpError && !isOtpRequested && (
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

          {/* Inline SMS OTP Card */}
          {requireVerification && otpChannel === "sms" && isOtpRequested && !isEmailVerified && (
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
                      onClick={() => handleRequestOtp("sms")}
                      disabled={isSendingOtp}
                      className="text-[11px] font-extrabold text-blue-700 hover:text-blue-800 underline cursor-pointer"
                    >
                      Resend SMS Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-[10.5px] text-slate-400">
            Booking notifications and reminders will be sent via SMS and Email to this contact.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-1">
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

        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <label className="text-xs font-bold text-slate-900">Location of Equipment Use <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            required 
            value={placeOfUse} 
            onChange={e => setPlaceOfUse(e.target.value)} 
            placeholder="e.g. Main Gymnasium / AVR 1" 
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
          />
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
            {requireVerification && !isEmailVerified && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hidden sm:inline-flex items-center gap-1.5">
                <AlertCircle size={13} />
                {otpChannel === "sms" ? "SMS OTP verification required to proceed" : "Email OTP verification required to proceed"}
              </span>
            )}
            <Button 
              type="submit" 
              disabled={requireVerification && !isEmailVerified}
              className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${
                (!requireVerification || isEmailVerified)
                  ? primaryDept === "sco"
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 cursor-pointer'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer'
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
