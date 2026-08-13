import React, { useState, useRef, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PinModal({
  isOpen,
  onClose,
  onVerify,
  title,
  description
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const pin = digits.join("");
    const targetPin = (activePin || "123456").trim();

    if (pin === targetPin) {
      setError(false);
      onVerify(pin);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[2500] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-7 sm:p-9 max-w-md w-full text-center shadow-2xl relative border border-slate-200/80 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <X size={20} />
        </button>

        {/* Orange Title matching screenshot 1 */}
        <h3 className="text-2xl sm:text-3xl font-black text-orange-500 mb-1 tracking-tight">
          {activeTitle}
        </h3>

        {/* Subtitle text matching screenshot 1 */}
        <p className="text-xs sm:text-sm text-slate-600 font-bold mb-6">
          {activeDesc}
        </p>

        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle size={16} />
            <span>Invalid PIN Code. Please check the PIN issued by the AVR Head.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 6 Digit Input Boxes matching screenshot 1 design */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-16 sm:w-12 sm:h-16 bg-white border-2 border-orange-400 rounded-[20px] text-center text-xl font-mono font-black text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-400/20 shadow-2xs transition-all"
              />
            ))}
          </div>

          {/* Action Buttons matching screenshot 1 design */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 py-5 rounded-full border-slate-300 text-slate-700 font-extrabold text-sm hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 py-5 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-extrabold text-sm cursor-pointer shadow-xs transition-all"
            >
              Verify Pin
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PinModal;
