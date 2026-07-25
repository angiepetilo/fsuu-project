import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { ArrowLeft, Mail, KeyRound, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";

const STEPS = {
  EMAIL:    "email",     // Step 1: enter username / personal email
  OTP:      "otp",       // Step 2: enter OTP
  PASSWORD: "password",  // Step 3: set new password
  DONE:     "done",      // Finished
};

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]       = useState(STEPS.EMAIL);
  const [login, setLogin]     = useState("");
  const [hint, setHint]       = useState("");         // masked email from server
  const [otp, setOtp]         = useState(["","","","","",""]);
  const [resetToken, setResetToken] = useState("");
  const [userId, setUserId]   = useState(null);
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!login.trim()) { setError("Enter your username or email."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/forgot-password/send-otp", { login: login.trim() });
      setHint(data.hint ?? "");
      setStep(STEPS.OTP);
      setSuccess("Reset code sent. Check your personal email.");
    } catch (err) {
      setError(err.response?.data?.message ?? "Something went wrong.");
    } finally { setLoading(false); }
  };

  // ── OTP input handling ──────────────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setError("Enter all 6 digits."); return; }
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/forgot-password/verify-otp", { login: login.trim(), otp: code });
      setResetToken(data.reset_token);
      setUserId(data.user_id);
      setStep(STEPS.PASSWORD);
    } catch (err) {
      setError(err.response?.data?.message ?? "Invalid or expired code.");
    } finally { setLoading(false); }
  };

  // ── Step 3: Reset Password ──────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      await api.post("/forgot-password/reset", {
        user_id:              userId,
        reset_token:          resetToken,
        password:             password,
        password_confirmation: confirm,
      });
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.message ?? "Reset failed.");
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    setLoading(true); setError(""); setOtp(["","","","","",""]);
    try {
      const { data } = await api.post("/forgot-password/send-otp", { login: login.trim() });
      setHint(data.hint ?? "");
      setSuccess("A new code has been sent.");
    } catch { setError("Failed to resend code."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#1A2B6B] font-sans justify-center items-center relative overflow-hidden">
      {/* Aura */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500 relative z-10 m-6">

        {/* Back to login */}
        <Link to="/login" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 font-semibold mb-6 transition-colors w-fit">
          <ArrowLeft size={13} /> Back to Sign In
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {step === STEPS.EMAIL    && <Mail size={24} className="text-blue-600" />}
            {step === STEPS.OTP      && <KeyRound size={24} className="text-blue-600" />}
            {step === STEPS.PASSWORD && <ShieldCheck size={24} className="text-blue-600" />}
            {step === STEPS.DONE     && <ShieldCheck size={24} className="text-emerald-600" />}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {step === STEPS.EMAIL    && "Forgot Password"}
            {step === STEPS.OTP      && "Enter Reset Code"}
            {step === STEPS.PASSWORD && "Set New Password"}
            {step === STEPS.DONE     && "Password Updated"}
          </h2>
          <p className="text-sm text-slate-400 mt-1.5">
            {step === STEPS.EMAIL    && "Enter your login username or personal email to receive a reset code."}
            {step === STEPS.OTP      && (hint ? `Code sent to ${hint}` : "Check your personal email for the 6-digit code.")}
            {step === STEPS.PASSWORD && "Choose a strong new password for your account."}
            {step === STEPS.DONE     && "Your password has been updated. You can now sign in."}
          </p>
        </div>

        {/* Step indicator */}
        {step !== STEPS.DONE && (
          <div className="flex items-center gap-2 mb-6">
            {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map((s, i) => {
              const stepIndex = [STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].indexOf(step);
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${active ? "bg-blue-600 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  {i < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all ${done ? "bg-emerald-500" : "bg-slate-100"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Error / Success messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-4 font-semibold text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 mb-4 font-semibold text-center">
            {success}
          </div>
        )}

        {/* ── STEP 1: Email/Username ── */}
        {step === STEPS.EMAIL && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Username or Personal Email</label>
              <input
                id="fp-login"
                type="text"
                value={login}
                onChange={e => { setLogin(e.target.value); setError(""); }}
                placeholder="e.g. admin or your@personal.email"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Enter the username you use to log in, or the personal email linked to your account.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Send Reset Code
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-3 block text-center">Enter the 6-digit code</label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading || otp.join("").length !== 6}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Verify Code
            </button>
            <div className="text-center">
              <button type="button" onClick={resendOtp} disabled={loading}
                className="text-xs text-blue-600 hover:underline font-semibold disabled:opacity-40">
                Didn't receive a code? Resend
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: New Password ── */}
        {step === STEPS.PASSWORD && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicator */}
              {password && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(i => {
                    const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1;
                    const colors = ["","bg-red-400","bg-amber-400","bg-blue-500","bg-emerald-500"];
                    return <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? colors[strength] : "bg-slate-200"} transition-all`} />;
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm Password</label>
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="Repeat new password"
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-4 transition-all ${
                  confirm && confirm !== password
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/10"
                }`}
              />
              {confirm && confirm !== password && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold">Passwords do not match.</p>
              )}
            </div>
            <button type="submit" disabled={loading || !password || password !== confirm}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Update Password
            </button>
          </form>
        )}

        {/* ── STEP 4: Done ── */}
        {step === STEPS.DONE && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={22} className="text-emerald-600" />
              </div>
              <p className="font-bold text-emerald-800 text-sm">Password updated successfully</p>
              <p className="text-xs text-emerald-600 mt-1">You've been logged out of all sessions for security.</p>
            </div>
            <button onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all">
              Sign In with New Password
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
