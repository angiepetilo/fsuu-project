import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2, AlertCircle, Lock } from "lucide-react";
import api from "@/lib/axios";

export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Password fallback state
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");

  // ── Google OAuth ──
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const { data } = await api.get("/auth/google/redirect");
      window.location.href = data.url;
    } catch {
      setGoogleError("Could not reach the authentication server. Try again.");
      setGoogleLoading(false);
    }
  };

  // ── Password Fallback ──
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setPassError("Please fill in both fields."); return; }
    setPassLoading(true);
    setPassError("");
    try {
      const { data } = await api.post("/login", { email, password });
      login(data.user, data.token);

      let redirect = "/sysad/user-management";
      if (!data.user?.office_id || data.user?.role === "admin") {
        redirect = "/sysad/user-management";
      } else if (data.user?.office?.type === "avr") {
        redirect = "/avr/dashboard";
      }
      navigate(redirect);
    } catch {
      setPassError("Invalid email or password. Please try again.");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans bg-[#f3f6fa]">
      
      {/* LEFT PANEL: FSUU Brand Section (Matches Reference Document) */}
      <div className="bg-gradient-to-br from-[#0a1638] via-[#16275e] to-[#0d183f] relative overflow-hidden flex flex-col justify-between items-center p-8 lg:p-16 text-center text-white min-h-[380px] lg:min-h-screen select-none">
        {/* Ambient background polygon aura glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="w-full flex justify-start">
          {/* Top spacer */}
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-md mx-auto my-auto">
          {/* Glowing Seal */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse"></div>
            <img
              src="/fsuu_logo.png"
              alt="FSUU Seal"
              className="relative h-28 sm:h-32 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* FSUU Text Matching Reference Image */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-white font-sans mb-1 uppercase">
            FSUU
          </h1>
          <p className="text-[11px] sm:text-xs text-blue-200 font-extrabold uppercase tracking-[0.25em] mb-4">
            Father Saturnino Urios University
          </p>

          <div className="w-14 h-1 bg-amber-400 rounded-full mb-6"></div>

          <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-xs">
            Reserve &amp; Booking Management Portal for authorized AVR and SCO administrators.
          </p>
        </div>

        <div className="relative z-10 text-[10px] text-blue-300/60 font-mono tracking-widest uppercase pb-2">
          Reserve &amp; Booking System
        </div>
      </div>

      {/* RIGHT PANEL: Login Form Container */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative bg-[#f3f6fa]">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Staff Portal</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Sign in to access your administrative dashboard</p>
          </div>

          {/* ── Google Sign In ── */}
          {googleError && (
            <div className="bg-red-50 border border-red-200/80 rounded-xl p-3 text-xs text-red-600 mb-4 text-center font-semibold flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              <span>{googleError}</span>
            </div>
          )}

          <button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200/80 rounded-2xl text-slate-800 font-extrabold text-xs sm:text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? "Redirecting to Google…" : "Sign in with Google"}
          </button>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200/80" />
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-slate-200/80" />
          </div>

          {/* ── Password Fallback ── */}
          {passError && (
            <div className="bg-red-50 border border-red-200/80 rounded-xl p-3 text-xs text-red-600 mb-4 text-center font-semibold flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Username or Email</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. user@fsuu.edu.ph"
                className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:italic focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:italic focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold tracking-wide transition-all shadow-md shadow-slate-900/10 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {passLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{passLoading ? "Signing in…" : "Sign In"}</span>
            </button>

            <div className="text-center pt-1">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-bold">
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Footer Authorization Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Lock size={13} className="text-slate-400" />
              <span>Staff and administrator access only</span>
            </div>
            <Link to="/" className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors font-bold">
              <ArrowLeft size={13} />
              <span>Back to Public Booking Page</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
