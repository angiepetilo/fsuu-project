import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/login", { email: email.trim(), password });
      login(data.user, data.token);

      const userRoleName = typeof data.user?.role === "object" ? data.user?.role?.name : data.user?.role;
      const isSuper = userRoleName === "super_admin" || userRoleName === "superadmin" || email.toLowerCase() === "admin@fsuu.edu.ph" || email.toLowerCase() === "superadmin@fsuu.edu.ph";

      if (isSuper) {
        navigate("/sysad/dashboard");
      } else {
        navigate("/general/dashboard");
      }
    } catch (err) {
      const serverMsg = err.response?.data?.errors?.email?.[0]
        || err.response?.data?.errors?.password?.[0]
        || err.response?.data?.message
        || "Invalid email or password.";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex font-sans justify-center items-center relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.88)), url('/fsuu_bg.png')`,
      }}
    >
      {/* Top Back Navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 font-extrabold text-xs shadow-lg backdrop-blur-md transition-all hover:-translate-x-0.5"
        >
          <span>← Back to Landing Page</span>
        </Link>
      </div>

      {/* Login Panel */}
      <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-5 duration-500 relative z-10 m-6">
        <div className="text-center mb-7 flex flex-col items-center">
          <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-16 w-auto mb-3 object-contain drop-shadow-xs" />
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Staff Portal</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Father Saturnino Urios University</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-4 text-center font-semibold animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              University Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@urios.edu.ph"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50/50 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-extrabold transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Verifying Credentials…</span>
              </>
            ) : (
              <span>Sign In to Portal</span>
            )}
          </button>
        </form>

        <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Authorized University Personnel Access Only</span>
        </div>
      </div>
    </div>
  );
}
