import { FileText, CheckCircle2, FileCheck, ShieldAlert, Check, ShieldCheck, AlertCircle, RefreshCw, KeyRound, Loader2, Edit3, Lock, Mail, Phone } from "lucide-react";
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
  pinRules,
  onBack,
}) {
  const isSystemEnabled = pinRules ? pinRules.isEnabled !== false : false;
  const requireEmailVerify = pinRules ? (pinRules.isEnabled !== false && pinRules.venueVerifyEmail === true) : false;
  const requirePhoneVerify = pinRules ? (pinRules.isEnabled !== false && pinRules.venueVerifyPhone === true) : false;
  const requireVerification = requireEmailVerify || requirePhoneVerify;
  const showChannelChoices = requireEmailVerify && requirePhoneVerify;

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
  const [emailSuggestion, setEmailSuggestion] = useState("");
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

  const handleEmailBlur = async (overrideVal = null) => {
    const rawVal = typeof overrideVal === "string" ? overrideVal : (email || "");
    const trimmed = rawVal.trim().toLowerCase();
    if (!trimmed) {
      setEmailCheckStatus("idle");
      setEmailCheckMessage("");
      setEmailSuggestion("");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailCheckStatus("invalid");
      setEmailCheckMessage("Please enter a valid email address (e.g. name@gmail.com or name@urios.edu.ph).");
      setEmailSuggestion("");
      return;
    }
    if (typeof overrideVal !== "string" && trimmed === lastCheckedEmail && emailCheckStatus !== "idle") {
      return;
    }

    setEmailCheckStatus("checking");
    setEmailCheckMessage("Checking email deliverability & temporary domain list...");
    setEmailSuggestion("");
    try {
      const res = await api.post("/public/verify-email-active", { email: trimmed });
      if (res.data?.valid) {
        setEmailCheckStatus("valid");
        setEmailCheckMessage(res.data.message || `Email address is active and deliverable.`);
        setEmailSuggestion("");
        setLastCheckedEmail(trimmed);
      } else {
        setEmailCheckStatus("invalid");
        setEmailCheckMessage(res.data?.message || "This email address is not deliverable or has been flagged.");
        if (res.data?.autocorrect) {
          setEmailSuggestion(res.data.autocorrect);
        }
      }
    } catch (err) {
      setEmailCheckStatus("invalid");
      setEmailCheckMessage(
        err.response?.data?.message || "Disposable, temporary, or invalid email addresses are not accepted."
      );
      if (err.response?.data?.autocorrect) {
        setEmailSuggestion(err.response.data.autocorrect);
      }
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
    setEmailSuggestion("");
  };

  // Automatically debounce email validation while typing
  useEffect(() => {
    if (!email) {
      setEmailCheckStatus("idle");
      setEmailCheckMessage("");
      setEmailSuggestion("");
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      if (trimmed.includes("@") && trimmed.length > 5) {
        setEmailCheckStatus("invalid");
        setEmailCheckMessage("Please enter a complete and valid email address.");
      } else {
        setEmailCheckStatus("idle");
        setEmailCheckMessage("");
      }
      return;
    }

    const timer = setTimeout(() => {
      handleEmailBlur(trimmed);
    }, 600);

    return () => clearTimeout(timer);
  }, [email]);

  const [otpChannel, setOtpChannel] = useState("email"); // "email" | "sms"
  
  useEffect(() => {
    if (requirePhoneVerify && !requireEmailVerify) {
      setOtpChannel("sms");
    } else if (requireEmailVerify && !requirePhoneVerify) {
      setOtpChannel("email");
    }
  }, [requireEmailVerify, requirePhoneVerify]);

  const phoneInfo = validatePhilippineMobile(contactNumber);

  const handleRequestOtp = async (overrideChannel = null) => {
    const channel = overrideChannel || otpChannel;
    setIsSendingOtp(true);
    setOtpError("");
    setOtpSuccess("");
    setDuplicateRef(null);

    try {
      let payload = {
        channel,
        venue_id: selectedVenue?.id,
        date_of_usage: selectedDate,
        reservation_end_date: selectedEndDate || selectedDate,
        time_start: startTime,
        time_end: endTime,
        first_name: firstName,
        last_name: lastName,
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
        if (!trimmed) {
          setEmailCheckStatus("invalid");
          setEmailCheckMessage("Please enter your email address first.");
          setOtpError("");
          setIsSendingOtp(false);
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          setEmailCheckStatus("invalid");
          setEmailCheckMessage("Please enter a valid email address (e.g. name@gmail.com or name@urios.edu.ph).");
          setOtpError("");
          setIsSendingOtp(false);
          return;
        }

        // If email deliverability hasn't been verified yet or was flagged, verify now on click!
        if (emailCheckStatus !== "valid" || trimmed !== lastCheckedEmail) {
          setEmailCheckStatus("checking");
          setEmailCheckMessage("Checking email deliverability & temporary domain list...");
          try {
            const verifyRes = await api.post("/public/verify-email-active", { email: trimmed });
            if (verifyRes.data?.valid) {
              setEmailCheckStatus("valid");
              setEmailCheckMessage(verifyRes.data.message || "Email address is active and deliverable.");
              setLastCheckedEmail(trimmed);
            } else {
              setEmailCheckStatus("invalid");
              const errorMsg = verifyRes.data?.message || "This email address is randomized, temporary, or invalid.";
              setEmailCheckMessage(errorMsg);
              setOtpError("");
              if (verifyRes.data?.autocorrect) {
                setEmailSuggestion(verifyRes.data.autocorrect);
              }
              setIsSendingOtp(false);
              return;
            }
          } catch (checkErr) {
            setEmailCheckStatus("invalid");
            const errorMsg = checkErr.response?.data?.message || "Disposable, temporary, or randomized email addresses are not accepted. Please provide a real email.";
            setEmailCheckMessage(errorMsg);
            setOtpError("");
            if (checkErr.response?.data?.autocorrect) {
              setEmailSuggestion(checkErr.response.data.autocorrect);
            }
            setIsSendingOtp(false);
            return;
          }
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

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300 space-y-6">
      {/* Context Banner indicating which form is active */}
      <div className="p-4 sm:p-5 rounded-2xl border flex items-center justify-between bg-blue-50/90 dark:bg-slate-900/80 border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-white shadow-2xs">
        <div>
          <h4 className="font-black text-sm tracking-tight text-slate-900 dark:text-white">Booking Form</h4>
          <p className="text-xs text-blue-900 dark:text-slate-300 font-semibold mt-0.5">
            Target Venue: <span className="font-extrabold text-blue-700 dark:text-blue-400">{selectedVenue?.name}</span> | Date: <span className="font-extrabold text-blue-700 dark:text-blue-400">{formatDateRange(selectedDate, selectedEndDate)}</span> ({formatTime12(startTime)} - {formatTime12(endTime)})
          </p>
        </div>
      </div>

      {/* DYNAMIC FORM RENDERING */}
      <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* COMMON REQUIRED FIELDS: Structured Name Inputs (Last Name First) */}
        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white">Last Name <span className="text-red-500">*</span></label>
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
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white">First Name <span className="text-red-500">*</span></label>
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
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white">Middle Name <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
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
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white">Suffix <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
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
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
            />
          </div>
        </div>

        {/* VERIFICATION CHANNEL SELECTOR (Only shown if BOTH Email and SMS verification are enabled by Super Admin) */}
        {showChannelChoices && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-blue-900/50 rounded-2xl gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Verification Delivery Method</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Select your preferred channel to receive your 6-digit verification code:
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-blue-900/40 rounded-xl shrink-0 self-start sm:self-center">
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
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800"
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
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800"
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
            <label className="text-xs font-bold text-slate-900 dark:text-white">
              Email Address <span className="text-red-500">*</span>
            </label>
            {requireVerification && isEmailVerified && otpChannel === "email" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                <Check size={12} className="stroke-[3]" />
                Verified via Email
              </span>
            ) : requireVerification && isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                <Check size={12} className="stroke-[3]" />
                Verified
              </span>
            ) : requireVerification && otpChannel === "email" && emailCheckStatus === "valid" ? (
              <span className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
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
              placeholder="yourname@gmail.com or username@urios.edu.ph" 
              className={`w-full p-3 ${requireVerification && otpChannel === "email" ? 'pr-24' : ''} border rounded-xl text-sm transition-all focus:outline-none ${
                (requireVerification && isEmailVerified && otpChannel === "email")
                  ? "bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-emerald-300 font-semibold cursor-not-allowed" 
                  : emailCheckStatus === "invalid"
                    ? "bg-white dark:bg-slate-900/80 border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    : emailCheckStatus === "valid"
                      ? "bg-white dark:bg-slate-900/80 border-blue-400 dark:border-blue-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              }`} 
            />

            {/* Attached Action Button inside field (Only when channel is email and verification is required) */}
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
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Unlock and change email address"
                  >
                    <Edit3 size={11} />
                    Change
                  </button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSendingOtp || !email || !email.trim() || emailCheckStatus !== "valid"}
                    onClick={() => handleRequestOtp("email")}
                    className={`h-8 px-3 rounded-lg text-xs font-black shadow-xs transition-all ${
                      !email || !email.trim() || emailCheckStatus !== "valid"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95 cursor-pointer"
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

          {/* Part 1 Inline Domain & Deliverability Feedback below placeholder */}
          {requireVerification && otpChannel === "email" && !isEmailVerified && (
            <div className="min-h-[20px] space-y-1 mt-0.5">
              {emailCheckStatus === "checking" && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-pulse py-0.5">
                  <Loader2 size={12} className="animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Checking mailbox deliverability & 75k+ temporary email blacklist...</span>
                </div>
              )}
              {emailCheckStatus === "valid" && !isOtpRequested && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{emailCheckMessage || "Email address is deliverable. Click 'Verify' to receive OTP code."}</span>
                </div>
              )}
              {emailCheckStatus === "invalid" && (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <div className="flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1.5 rounded-lg shadow-2xs">
                    <AlertCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <span className="leading-tight">{emailCheckMessage}</span>
                  </div>
                  {emailSuggestion && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                      <span>Did you mean</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sug = emailSuggestion;
                          setEmail(sug);
                          setEmailSuggestion("");
                          handleEmailBlur(sug);
                        }}
                        className="font-bold underline text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 cursor-pointer"
                      >
                        {emailSuggestion}
                      </button>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">? (Click to apply)</span>
                    </div>
                  )}
                </div>
              )}
              {emailCheckStatus === "idle" && !email && (
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                  Enter your email address and click outside the box to run deliverability check.
                </p>
              )}
            </div>
          )}

          {/* Duplicate / OTP Error Alert Banner */}
          {requireVerification && otpChannel === "email" && otpError && !isOtpRequested && otpError !== emailCheckMessage && (
            <div className="mt-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-800 dark:text-rose-200 flex items-start gap-2.5 shadow-sm animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="leading-snug">{otpError}</p>
                {duplicateRef && (
                  <a
                    href={`/track?ref=${encodeURIComponent(duplicateRef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-extrabold text-xs underline mt-1"
                  >
                    <span>Track existing reservation ({duplicateRef})</span>
                    <span>→</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Part 2 Inline OTP Card (Rendered directly under field, NOT in a modal) */}
          {requireVerification && otpChannel === "email" && isOtpRequested && !isEmailVerified && (
            <div className="mt-2 p-4 bg-blue-50/70 dark:bg-slate-900/90 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Enter 6-Digit Email OTP</span>
                </label>
                {otpExpiresIn > 0 ? (
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-2 py-0.5 rounded-md">
                    ⏱ Expires in {formatTimer(otpExpiresIn)}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-md">
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
                  className="flex-1 p-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-center text-base font-mono font-black tracking-widest text-blue-900 dark:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
                <Button
                  type="button"
                  disabled={otpCode.length !== 6 || isVerifyingOtp || otpExpiresIn <= 0}
                  onClick={handleVerifyOtp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
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
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate">{otpError}</span>
                    </span>
                  )}
                  {otpSuccess && !otpError && (
                    <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 truncate block">
                      {otpSuccess}
                    </span>
                  )}
                </div>

                <div className="shrink-0 pl-2">
                  {otpCooldown > 0 ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                      Resend in {otpCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestOtp("email")}
                      disabled={isSendingOtp}
                      className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
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
            <label className="text-xs font-bold text-slate-900 dark:text-white">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {requireVerification && isEmailVerified && otpChannel === "sms" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                  <Check size={12} className="stroke-[3]" />
                  Verified via SMS
                </span>
              ) : contactNumber && contactNumber.length >= 4 && !phoneInfo.isValid ? (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
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
              onChange={(e) => {
                handleContactChange(e);
                if (isEmailVerified && otpChannel === "sms" && setIsEmailVerified) {
                  setIsEmailVerified(false);
                }
                if (isOtpRequested && otpChannel === "sms") {
                  setIsOtpRequested(false);
                  setOtpCode("");
                  setOtpError("");
                  setOtpSuccess("");
                }
              }}
              pattern="[0-9]{11}"
              title="Please enter an active 11-digit Philippine mobile number"
              placeholder="0917 123 4567" 
              className={`w-full p-3 ${requireVerification && otpChannel === "sms" ? 'pr-24' : ''} border rounded-xl text-sm font-mono transition-all focus:outline-none ${
                (requireVerification && isEmailVerified && otpChannel === "sms")
                  ? "bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-emerald-300 font-semibold cursor-not-allowed"
                  : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
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
                        ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-blue-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none"
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
            <div className="mt-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900/50 rounded-2xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-start gap-2.5 shadow-sm animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="leading-snug">{otpError}</p>
                {duplicateRef && (
                  <a
                    href={`/track?ref=${encodeURIComponent(duplicateRef)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-extrabold text-xs underline mt-1"
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
            <div className="mt-2 p-4 bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 dark:text-white flex items-center gap-1.5">
                  <KeyRound size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Enter 6-Digit SMS OTP</span>
                </label>
                {otpExpiresIn > 0 ? (
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
                    ⏱ Expires in {formatTimer(otpExpiresIn)}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded-md">
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
                  className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-900/50 rounded-xl text-center text-base font-mono font-black tracking-widest text-blue-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
                <Button
                  type="button"
                  disabled={otpCode.length !== 6 || isVerifyingOtp || otpExpiresIn <= 0}
                  onClick={handleVerifyOtp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
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
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span className="truncate">{otpError}</span>
                    </span>
                  )}
                  {otpSuccess && !otpError && (
                    <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 truncate block">
                      {otpSuccess}
                    </span>
                  )}
                </div>

                <div className="shrink-0 pl-2">
                  {otpCooldown > 0 ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                      Resend in {otpCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestOtp("sms")}
                      disabled={isSendingOtp}
                      className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
            Booking notifications and reminders will be sent via SMS and Email to this contact.
          </p>
        </div>

        {/* DEPARTMENT */}
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <label className="text-xs font-bold text-slate-900 dark:text-white">
            {isExternal ? "Office / Organization" : "Department"} <span className="text-red-500">*</span>
          </label>
          {isExternal ? (
            <input
              type="text"
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. DepEd / LGU Butuan / Partner Company"
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold"
            />
          ) : (
            <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold">
              <option value="" className="dark:bg-slate-900 dark:text-white">Select Department...</option>
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
                    <option key={`dept-${dept.id || code}-${idx}`} value={code} className="dark:bg-slate-900 dark:text-white">
                      {label}
                    </option>
                  );
                });
              })()}
            </select>
          )}
        </div>

        {/* BOOKING CLASSIFICATION (SIDE BY SIDE WITH DEPARTMENT) */}
        {selectedVenue?.type === "avr" && (
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white">
              Booking Classification <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={classification}
              onChange={e => setClassification(e.target.value)}
              className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold"
            >
              <option value="" className="dark:bg-slate-900 dark:text-white">Select Classification...</option>
              <option value="organization" className="dark:bg-slate-900 dark:text-white">Student Organization Event</option>
              <option value="academic" className="dark:bg-slate-900 dark:text-white">Academic Class</option>
              <option value="admin" className="dark:bg-slate-900 dark:text-white">Administrative Meeting</option>
            </select>
          </div>
        )}

        {/* FORM SPECIFIC FIELDS: AVR FORM (FORM A) */}
        {selectedVenue?.type === "avr" && (
          <>
            {/* Endorsement Letter Notice Based on Booking Classification */}
            {classification && (
              <div className="sm:col-span-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-200 animate-in fade-in">
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

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Expected Person Count <span className="text-red-500">*</span>
                {(selectedVenue?.min_capacity || selectedVenue?.max_capacity || selectedVenue?.capacity) && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                    (Min {selectedVenue.min_capacity || 1} • Max {selectedVenue.max_capacity || selectedVenue.capacity} persons)
                  </span>
                )}
              </label>
              <input 
                type="number" 
                required 
                min={selectedVenue?.min_capacity || 1}
                max={selectedVenue?.max_capacity || selectedVenue?.capacity || ""}
                value={persons} 
                onChange={e => {
                  let val = e.target.value;
                  const maxCap = selectedVenue?.max_capacity || selectedVenue?.capacity;
                  if (val && maxCap && parseInt(val, 10) > maxCap) {
                    val = maxCap.toString();
                  }
                  setPersons(val);
                }} 
                placeholder={`e.g. ${Math.min(75, selectedVenue?.max_capacity || selectedVenue?.capacity || 75)}`} 
                className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
              />
              {persons && selectedVenue?.min_capacity && parseInt(persons, 10) < selectedVenue.min_capacity && (
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  ⚠️ Minimum capacity for this venue is {selectedVenue.min_capacity} persons.
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">Event Purpose & Brief Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="State event title, nature of activity, and specific requirements..." className="w-full p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  Allowed Venue Equipment <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">(Optional)</span>
                </label>
              </div>

              {/* Informative Notice Banner for Venue Requisitions */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-slate-300 leading-relaxed">
                ℹ️ <strong className="text-blue-950 dark:text-white">Event Setup Priority:</strong> Requested equipment is secured upon booking approval and prepared inside the venue by AVR staff on your event date.
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
                    return <div className="col-span-full text-slate-500 dark:text-slate-400 italic text-center py-4 bg-white dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No equipment configured or available for this venue.</div>;
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
                            ? "bg-slate-100/70 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 opacity-60 text-slate-400 dark:text-slate-500"
                            : isChecked
                              ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs"
                              : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <label className={`flex items-center gap-2 font-semibold flex-1 min-w-0 ${isOutOfStock ? "cursor-not-allowed text-slate-400 dark:text-slate-500" : "cursor-pointer text-slate-800 dark:text-slate-200"}`}>
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
                            className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600 dark:accent-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                            {!isOutOfStock && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                Max {effectiveMax} unit{effectiveMax === 1 ? "" : "s"} allowed
                              </span>
                            )}
                          </div>
                        </label>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded-md shrink-0">
                            Out of Stock
                          </span>
                        ) : isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">Qty:</span>
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
                              className="w-11 py-0.5 px-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700/80 rounded-lg text-xs font-black text-center text-blue-900 dark:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Equipment-Needed Remarks <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={equipmentRemarks || ""}
                onChange={(e) => setEquipmentRemarks && setEquipmentRemarks(e.target.value)}
                placeholder="Explain why you require more units than the venue's allowed limit (e.g., expected high attendee count, workshop breakout activities, extra speakers)..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Note: If your event requires more units than the venue's default limit, provide your justification here for AVR administrator review and special allocation.
              </p>
            </div>
          </>
        )}

        <div className="sm:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack && onBack()}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 px-5 py-5 rounded-xl font-bold text-xs"
          >
            ← Back to Venue Selection
          </Button>

          <div className="flex items-center gap-3">
            {requireEmailVerify && !isEmailVerified && (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-xl hidden sm:inline-flex items-center gap-1.5">
                <AlertCircle size={13} />
                Email OTP verification required to proceed
              </span>
            )}
            <Button 
              type="submit" 
              disabled={requireEmailVerify && !isEmailVerified}
              className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${
                (!requireEmailVerify || isEmailVerified) 
                  ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-blue-600/20 cursor-pointer" 
                  : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none"
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
