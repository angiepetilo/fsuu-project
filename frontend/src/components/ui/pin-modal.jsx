import React, { useState, useRef, useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export function PinModal({
  isOpen,
  onClose,
  onVerify,
  title,
  description
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePin, setActivePin] = useState("123456");
  const [activeTitle, setActiveTitle] = useState(title || "PIN Required");
  const [activeDesc, setActiveDesc] = useState(description || "AVR Head PIN Required");
  const inputRefs = useRef([]);

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
      setDigits(["", "", "", "", "", ""]);
      setError(false);
      setErrorMessage("");
      setLoading(false);
      setActiveTitle(title || "PIN Required");
      setActiveDesc(description || "AVR Head PIN Required");
      syncPinSettings();

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }

    window.addEventListener("pin_settings_updated", syncPinSettings);
    return () => window.removeEventListener("pin_settings_updated", syncPinSettings);
  }, [isOpen, title, description]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];

    // Handle paste of full PIN
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto advance focus to next digit input box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pin = digits.join("");
    if (pin.length < 4) {
      setError(true);
      setErrorMessage("Please enter a valid PIN code.");
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
      // If API returns 422 with invalid message, or network offline, test fallback
      if (err.response?.status === 422) {
        setLoading(false);
        setError(true);
        setErrorMessage(err.response?.data?.message || "Invalid PIN Code. Please check the PIN issued by the AVR Head.");
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
    setErrorMessage("Invalid PIN Code. Please check the PIN issued by the AVR Head.");
  };

  return (
    <div className="fixed inset-0 bg-black/10 z-[2500] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl relative border border-slate-200 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1"
        >
          <X size={18} />
        </button>

        {/* Plain Text Title */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
          {activeTitle}
        </h3>

        {/* Plain Text Description */}
        <p className="text-xs text-slate-600 font-normal mb-5 leading-relaxed">
          {activeDesc}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle size={14} className="shrink-0 text-slate-500" />
            <span>{errorMessage || "Invalid PIN Code. Please check the PIN issued by the AVR Head."}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 6 Digit Input Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-9 h-11 sm:w-10 sm:h-12 bg-white border border-slate-300 rounded-lg text-center text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-400 transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 active:scale-[0.99] text-slate-700 font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs cursor-pointer shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              <span>{loading ? "Verifying..." : "Verify Pin"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PinModal;
