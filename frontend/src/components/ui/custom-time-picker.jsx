import React, { useState, useEffect, useRef } from "react";
import { Clock, ChevronDown, Check } from "lucide-react";

/**
 * Parses a 24-hour time string ("HH:mm" or "HH:mm:ss") into 12-hour components.
 */
function parse24To12(timeStr) {
  if (!timeStr) {
    return { hour12: "08", minute: "00", period: "AM" };
  }
  const clean = String(timeStr).trim();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 8;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;

  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour12: String(h12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

/**
 * Converts 12-hour components to a 24-hour "HH:mm" string.
 */
function format12To24(hour12Str, minuteStr, period) {
  let h = parseInt(hour12Str, 10);
  if (isNaN(h)) h = 12;
  const m = String(minuteStr || "00").padStart(2, "0");

  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    // PM
    if (h < 12) h += 12;
  }

  return `${String(h).padStart(2, "0")}:${m}`;
}

/**
 * Custom Time Picker with 5-minute increments (00, 05, 10, 15... 55)
 */
export default function CustomTimePicker({
  value = "08:00",
  onChange,
  minuteStep = 5,
  disabled = false,
  minTime,
  maxTime,
  className = "",
  triggerClassName = "",
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const { hour12, minute, period } = parse24To12(value);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Generate hour options: 01 - 12
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  // Generate minute options based on minuteStep (e.g. 00, 05, 10 ... 55)
  const minutes = [];
  for (let m = 0; m < 60; m += minuteStep) {
    minutes.push(String(m).padStart(2, "0"));
  }

  const handleSelectHour = (newHour) => {
    const next24 = format12To24(newHour, minute, period);
    if (onChange) onChange(next24);
  };

  const handleSelectMinute = (newMin) => {
    const next24 = format12To24(hour12, newMin, period);
    if (onChange) onChange(next24);
  };

  const handleSelectPeriod = (newPeriod) => {
    const next24 = format12To24(hour12, minute, newPeriod);
    if (onChange) onChange(next24);
  };

  const displayTime = `${hour12}:${minute} ${period}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Pill / Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={
          triggerClassName ||
          `w-full flex items-center justify-between px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-full cursor-pointer transition-all text-left group ${
            isOpen ? "ring-2 ring-blue-500 border-blue-400 bg-white" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
        }
      >
        <span className="font-extrabold text-xs text-slate-900 tracking-tight">
          {displayTime}
        </span>
        <Clock
          size={15}
          className={`transition-colors ${
            isOpen ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
          }`}
        />
      </button>

      {/* 3-Column Floating Picker Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 animate-in fade-in zoom-in-95 text-xs">
          {/* Header Preview */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl mb-2 text-[11px] font-mono font-black text-slate-700">
            <span className="text-slate-400 font-sans font-bold text-[10px] uppercase">Selected</span>
            <div className="flex items-center gap-1">
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{hour12}</span>
              <span className="text-slate-400">:</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{minute}</span>
              <span className="text-blue-700 font-sans bg-blue-100 px-1.5 py-0.5 rounded ml-1">{period}</span>
            </div>
          </div>

          {/* 3 Columns: Hour | Minute (5-min intervals) | Period */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            {/* Column 1: Hour */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 mb-1">
                Hour
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                {hours.map((h) => {
                  const isSelected = h === hour12;
                  return (
                    <button
                      key={`h-${h}`}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-extrabold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Minute (5-minute steps) */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 mb-1">
                Minute
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                {minutes.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={`m-${m}`}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-lg text-xs font-mono font-extrabold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Period (AM / PM) */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 mb-1">
                Period
              </div>
              <div className="space-y-1 pt-1">
                {["AM", "PM"].map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={`p-${p}`}
                      type="button"
                      onClick={() => handleSelectPeriod(p)}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">5-min intervals</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
