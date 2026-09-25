import React, { useState, useRef, useEffect } from "react";
import { X, AlertCircle, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import api from "@/lib/axios";

export function PinModal({
  isOpen,
  onClose,
  onVerify,
  title,
  description
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePin, setActivePin] = useState("123456");
  const [activeTitle, setActiveTitle] = useState(title || "Authorization Required");
  const [activeDesc, setActiveDesc] = useState(description || "Please enter your password or the Super Administrator password to authorize this action.");
  const inputRef = useRef(null);

  useEffect(() => {
    const syncPinSettings = () => {
      try {
        const saved = localStorage.getItem("fsuu_verification_pin_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.pin) setActivePin(String(parsed.pin).trim());
          if (parsed.title && !title) setActiveTitle(parsed.title);
          if (parsed.description && !description) setActiveDesc(parsed.description);
        }
      } catch {}
    };

    if (isOpen) {
      setPassword("");
      setShowPassword(false);
      setError(false);
      setErrorMessage("");
      setLoading(false);
      setActiveTitle(title || "Authorization Required");
      setActiveDesc(description || "Please enter your password or the Super Administrator password to authorize this action.");
      syncPinSettings();

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    window.addEventListener("pin_settings_updated", syncPinSettings);
    return () => window.removeEventListener("pin_settings_updated", syncPinSettings);
  }, [isOpen, title, description]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pin = password.trim();
    if (!pin) {
      setError(true);
      setErrorMessage("Please enter your password or verification code.");
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // First attempt to verify with backend API
      const res = await api.post("/public/verify-pin", { pin });
      if (res.data?.valid) {
        setLoading(false);
        setError(false);
        onVerify(pin);
        return;
      }
    } catch (err) {
      // If API returns 422 with invalid message, display error
      if (err.response?.status === 422) {
        setLoading(false);
        setError(true);
        setErrorMessage(err.response?.data?.message || "Invalid password or verification code. Please try again.");
        return;
      }

      // Offline / local fallback check
      const targetPin = (activePin || "123456").trim();
      if (pin === targetPin) {
        setLoading(false);
        setError(false);
        onVerify(pin);
        return;
      }
    }

    setLoading(false);
    setError(true);
    setErrorMessage("Invalid password or verification code. Please try again.");
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-xs z-[2500] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#131C2E] rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
          <Lock size={20} />
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
          {activeTitle}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 font-normal mb-5 leading-relaxed">
          {activeDesc}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-bold">{errorMessage || "Invalid password or verification code. Please try again."}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Password or Verification PIN
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Enter password or PIN"
                className="w-full px-3.5 py-2.5 pr-10 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs cursor-pointer shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              <span>{loading ? "Verifying..." : "Verify Authorization"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PinModal;
