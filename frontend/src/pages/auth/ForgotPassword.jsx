import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Query params support for direct reset links (/reset-password?token=...&email=...)
  const queryToken = searchParams.get("token") || "";
  const queryEmail = searchParams.get("email") || "";

  // Step state: 1 = Email, 2 = 6-digit OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(queryToken && queryEmail ? 3 : 1);

  const [email, setEmail] = useState(queryEmail);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  // Handle countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // If query params change and provide token/email, jump to step 3
  useEffect(() => {
    if (queryToken && queryEmail) {
      setResetToken(queryToken);
      setEmail(queryEmail);
      setStep(3);
    }
  }, [queryToken, queryEmail]);

  // --- Step 1: Submit Email for Reset Code ---
  const handleRequestCode = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please provide a valid university email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSuccessMessage(res.data?.message || "Verification code dispatched.");
      setCooldown(res.data?.cooldown || 60);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.message || "Too many requests. Please wait a moment.");
        if (err.response?.data?.cooldown_remaining) {
          setCooldown(err.response.data.cooldown_remaining);
        }
      } else {
        setError(err.response?.data?.message || "Failed to dispatch verification code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Digit Input Handlers ---
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/[^0-9]/g, "");
    if (!clean && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = clean.slice(-1); // only take the last digit typed
    setOtpDigits(newDigits);

    // Auto-advance to next input if digit entered
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    // Focus last filled digit or the 6th
    const focusIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIndex]?.focus();
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/verify-reset-code", {
        email: email.trim().toLowerCase(),
        code,
      });

      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setError("");
        setSuccessMessage("Code verified successfully! Enter your new password.");
        setStep(3);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired verification code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Set New Password ---
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify your entries.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        token: resetToken,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link or token may have expired.");
    } finally {
      setLoading(false);
    }
  };

  // Password requirements calculation
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div
      className="min-h-screen w-full flex font-sans justify-center items-center relative overflow-hidden bg-cover bg-center bg-no-repeat p-4 sm:p-6"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.92)), url('/fsuu_bg.png')`,
      }}
    >
      {/* Top Back Navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 font-extrabold text-xs shadow-lg backdrop-blur-md transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Main Panel */}
      <div className="w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-5 duration-500 relative z-10 m-2">
        {/* Header Branding */}
        <div className="text-center mb-6 flex flex-col items-center">
          <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-14 w-auto mb-3 object-contain drop-shadow-xs" />
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {step === 4 ? "Password Reset" : "Forgot Password"}
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {step === 1 && "Enter your registered university email to receive a secure code"}
            {step === 2 && "Enter the 6-digit security code sent to your inbox"}
            {step === 3 && "Create a strong new password for your account"}
            {step === 4 && "Your credentials have been securely updated"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-4 flex items-start gap-2 font-semibold animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success / Info Alert */}
        {successMessage && step !== 4 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 mb-4 flex items-start gap-2 font-semibold animate-in fade-in">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-blue-600" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* STEP 1: Enter University Email */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@urios.edu.ph"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Dispatching Code…</span>
                </>
              ) : cooldown > 0 ? (
                <span>Wait {cooldown}s to Resend</span>
              ) : (
                <span>Send Verification Code</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Verify 6-digit Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="text-center">
              <span className="text-xs text-slate-600 font-medium">Code dispatched to: </span>
              <span className="text-xs font-bold text-slate-900">{email}</span>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpInputsRef.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl font-black rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50 focus:bg-white text-slate-900 transition-all outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join("").length !== 6}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <span>Confirm &amp; Proceed</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Change email
              </button>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={handleRequestCode}
                className="text-blue-600 hover:text-blue-700 font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50/50 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your new password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50/50 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Live Password Checklist */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] space-y-1.5 font-medium">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
                <CheckCircle2 size={12} className={hasMinLength ? "text-emerald-600" : "text-slate-300"} />
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter && hasNumber ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
                <CheckCircle2 size={12} className={hasLetter && hasNumber ? "text-emerald-600" : "text-slate-300"} />
                <span>Contains letters and numbers</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
                <CheckCircle2 size={12} className={passwordsMatch ? "text-emerald-600" : "text-slate-300"} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !hasMinLength || !passwordsMatch}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success Confirmation */}
        {step === 4 && (
          <div className="text-center space-y-5 py-2 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">Password Changed Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your password has been updated. All previous active sessions across all devices have been signed out for security.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Sign In with New Password</span>
            </button>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>FSUU High-Security Identity Verification</span>
        </div>
      </div>
    </div>
  );
}
