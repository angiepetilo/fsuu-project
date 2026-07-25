import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

/**
 * StaffLogin — Google OAuth is the primary auth path.
 * Password login is kept as a secondary dev/testing fallback.
 */
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

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const { data } = await api.get("/auth/google/redirect");
      // Navigate browser to Google's auth page
      window.location.href = data.url;
    } catch {
      setGoogleError("Could not reach the authentication server. Try again.");
      setGoogleLoading(false);
    }
  };

  // ── Password fallback (dev only) ──────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setPassError("Fill in both fields."); return; }
    setPassLoading(true);
    setPassError("");
    try {
      const { data } = await api.post("/login", { email, password });
      login(data.user, data.token);
      // Route system admin (no office_id) to Sysad portal, AVR to AVR portal, rest to Sysad
      let redirect = "/sysad/dashboard";
      if (!data.user?.office_id) redirect = "/sysad/dashboard";
      else if (data.user?.office?.type === "avr") redirect = "/avr/dashboard";
      navigate(redirect);
    } catch {
      setPassError("Invalid email or password.");
    } finally {
      setPassLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 font-sans bg-slate-50">
      
      {/* LEFT PANEL: FSUU Brand Section */}
      <div className="bg-[#1A2B6B] relative overflow-hidden flex flex-col justify-center items-center p-8 lg:p-16 text-center text-white min-h-[320px] lg:min-h-screen">
        {/* Ambient background aura glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
          <img
            src="/fsuu_logo.png"
            alt="FSUU Seal"
            className="h-24 sm:h-28 w-auto mb-6 drop-shadow-xl hover:scale-105 transition-transform duration-300"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Father Saturnino Urios University
          </h1>
          <div className="w-12 h-1 bg-amber-400 rounded-full mb-4"></div>
          <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-sm">
            Reserve &amp; Booking Management Portal for authorized AVR and SCO administrators.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form Container */}
      <div className="bg-white flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md animate-in fade-in slide-in-from-bottom-3 duration-500">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">Staff Portal</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Sign in to access your administrative dashboard</p>
          </div>

          {/* ── Google Sign In ── */}
          {googleError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-4 text-center font-semibold">
              {googleError}
            </div>
          )}

          <button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-slate-800 font-semibold text-xs sm:text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mb-6"
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
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ── Password fallback ── */}
          {passError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-4 text-center font-semibold">
              {passError}
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3.5">
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Username or email"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1A2B6B] focus:ring-4 focus:ring-[#1A2B6B]/10 font-medium"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1A2B6B] focus:ring-4 focus:ring-[#1A2B6B]/10 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-slate-900/10 disabled:opacity-60 mt-1"
            >
              {passLoading ? "Signing in…" : "Sign In"}
            </button>
            <div className="text-center mt-1">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-semibold">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold uppercase tracking-wider mb-2">
              Authorized Personnel Access Only
            </span>
            <Link to="/" className="block text-center text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
              ← Back to Public Booking Page
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
