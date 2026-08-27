import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Building2, User, Key, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";

export default function AccountActivation() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [inviteData, setInviteData] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!urlToken) {
      setError("No activation token provided.");
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const { data } = await api.get(`/auth/invite/${urlToken}`);
        setInviteData(data);
      } catch (err) {
        if (!err.response) {
          setError("Unable to connect to the backend API server. Please check your connection or server status.");
        } else {
          setError(err.response?.data?.message || "Invalid or expired activation link.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [urlToken]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First Name and Last Name are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitLoading(true);
    setError("");

    try {
      await api.post("/auth/activate", {
        token: urlToken,
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        suffix: suffix.trim(),
        name: [firstName, middleName, lastName, suffix].filter(Boolean).join(" ").trim(),
        password,
      });

      setSuccess(true);
    } catch (err) {
      if (!err.response) {
        setError("Unable to connect to the backend API server. Please check your connection or server status.");
      } else {
        setError(err.response?.data?.message || "Failed to activate account. Please try again.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex bg-[#1A2B6B] justify-center items-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-3 text-slate-600">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-xs font-semibold">Validating your activation link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#1A2B6B] font-sans justify-center items-center relative overflow-hidden p-6">
      {/* Background Aura */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <div className="text-center mb-6 flex flex-col items-center">
          <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-14 w-auto mb-2 object-contain" />
          <h2 className="text-xl font-black text-slate-900 leading-tight">Activate Your Account</h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Father Saturnino Urios University</p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Account Activated Successfully!</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Your user identity has been configured. You can now log into the portal with your credentials.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleActivate} autoComplete="off" className="space-y-4 text-xs">
            {/* Context Card */}
            {inviteData && (
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-[11px] border-b border-slate-200/60 pb-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  <span>Authorized Account Context</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Email</span>
                    <span className="font-mono text-slate-900 font-bold">{inviteData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Role</span>
                    <span className="font-bold text-blue-600 inline-flex items-center gap-1">
                      {inviteData.role || "Staff"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Name Fields to fill up */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Middle Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Cruz"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Suffix</label>
                  <input
                    type="text"
                    placeholder="e.g. Jr., III (Optional)"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Set Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Confirm Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {submitLoading && <Loader2 size={15} className="animate-spin" />}
              <span>Complete Activation & Sign In</span>
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t border-slate-100">
          <Link to="/login" className="text-xs font-extrabold text-blue-600 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
